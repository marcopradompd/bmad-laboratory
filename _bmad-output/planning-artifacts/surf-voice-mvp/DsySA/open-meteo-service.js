/**
 * Open-Meteo Surf & Marine Data Ingestion and Normalization Service
 * 
 * Camada de ingestão e normalização de dados meteorológicos e oceanográficos
 * alimentada pelos modelos NOAA WaveWatch III, GFS, ICON e modelos harmônicos
 * de maré via Open-Meteo REST APIs públicas e gratuitas.
 */

/**
 * 16 Pontos Cardeais Meteorológicos (Resolução de 22.5° por setor)
 */
const CARDINAL_POINTS_16 = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
];

/**
 * Converte azimutes (0° a 360°) para a sigla do ponto cardeal correspondente (16 direções).
 * Setores de 22.5° centrados nos pontos cardeais (ex: N entre 348.75° e 11.25°).
 *
 * @param {number|null|undefined} degrees - Direção em graus
 * @returns {string|null} Sigla cardinal (ex: "SE", "NE") ou null se inválido
 */
function degreesToCardinal(degrees) {
  if (degrees === null || degrees === undefined || isNaN(degrees)) {
    return null;
  }
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return CARDINAL_POINTS_16[index];
}

/**
 * Calcula o Índice Relativo de Energia do Swell com base na física oceânica:
 * E ∝ H² × T (H = Altura da ondulação primária em metros, T = Período em segundos)
 *
 * @param {number|null} heightM - Altura da ondulação primária (m)
 * @param {number|null} periodS - Período da ondulação primária (s)
 * @returns {number} Índice relativo de energia arredondado para 1 casa decimal
 */
function calculateSwellEnergyIndex(heightM, periodS) {
  if (!heightM || !periodS || heightM <= 0 || periodS <= 0) {
    return 0.0;
  }
  const energy = Math.pow(heightM, 2) * periodS;
  return Number(energy.toFixed(1));
}

/**
 * Detecta picos de maré (Preia-mar / "HIGH" e Baixa-mar / "LOW") a partir
 * do array horário contínuo de altura do nível do mar (MSL).
 * 
 * Utiliza interpolação parabólica sub-horária para determinar o minuto exato do pico
 * e converte para Cota Náutica / Nível de Redução (NR) da Marinha do Brasil (+1.25m).
 *
 * @param {Array<string>} times - Array de timestamps ISO
 * @param {Array<number|null>} heights - Série horária de alturas de maré (m)
 * @returns {Array<Object|null>} Array de mesmo comprimento com anotações de maré
 */
function detectTideExtrema(times, heights) {
  const n = heights.length;
  const results = new Array(n).fill(null);
  if (n < 3) return results;

  for (let i = 1; i < n - 1; i++) {
    const y0 = heights[i];
    const ym1 = heights[i - 1];
    const yp1 = heights[i + 1];
    if (y0 === null || ym1 === null || yp1 === null || isNaN(y0) || isNaN(ym1) || isNaN(yp1)) continue;

    const isHigh = (y0 > ym1 && y0 >= yp1) || (y0 >= ym1 && y0 > yp1);
    const isLow = (y0 < ym1 && y0 <= yp1) || (y0 <= ym1 && y0 < yp1);

    if (isHigh || isLow) {
      const denom = ym1 - 2 * y0 + yp1;
      let delta = 0;
      let exactH = y0;
      if (Math.abs(denom) > 1e-5) {
        delta = (ym1 - yp1) / (2 * denom);
        if (delta < -0.5) delta = -0.5;
        if (delta > 0.5) delta = 0.5;
        exactH = y0 - ((ym1 - yp1) ** 2) / (8 * denom);
      }

      const timeStr = times[i] || '';
      const parts = timeStr.split('T');
      const timePart = parts[1] || '00:00';
      const [hBase] = timePart.split(':').map(Number);
      const totalMinutes = Math.round((hBase + delta) * 60);
      const finalH = Math.min(23, Math.max(0, Math.floor(totalMinutes / 60)));
      const finalM = Math.min(59, Math.max(0, totalMinutes % 60));
      const formattedTime = `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}h`;
      
      // Conversão precisa de MSL para Cota Náutica da Marinha do Brasil (+1.25m)
      const nauticalHeightM = +(exactH + 1.25).toFixed(2);

      results[i] = {
        type: isHigh ? 'HIGH' : 'LOW',
        exactTime: formattedTime,
        hourFloat: +(hBase + delta).toFixed(2),
        mslHeightM: +(exactH).toFixed(2),
        nauticalHeightM: Math.max(0.1, nauticalHeightM)
      };
    }
  }

  return results;
}

/**
 * Sanitiza valores numéricos garantindo precisão e tipo seguro
 * @param {number|null|undefined} val 
 * @param {number} decimals 
 * @returns {number|null}
 */
function roundOrNull(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(val)) return null;
  return Number(Number(val).toFixed(decimals));
}

/**
 * Ingestão e normalização completa de previsão de surf via Open-Meteo
 *
 * Dispara requisições paralelas para as APIs Marinha e Atmosférica,
 * sincroniza as séries pelo timestamp ISO e formata a resposta no contrato JSON padrão.
 *
 * @param {Object} options
 * @param {number} options.lat - Latitude do pico (ex: -12.95)
 * @param {number} options.lon - Longitude do pico (ex: -38.35)
 * @param {string} [options.timezone='America/Sao_Paulo'] - Timezone IANA
 * @param {number} [options.forecastDays=14] - Dias de previsão (1 a 16)
 * @returns {Promise<Object>} Contrato JSON normalizado para consumo pelo front-end
 */
async function fetchSurfForecast({
  lat,
  lon,
  timezone = 'auto',
  forecastDays = 15
}) {
  if (lat === undefined || lon === undefined) {
    throw new Error('Parâmetros obrigatórios ausentes: lat e lon');
  }

  const encodedTz = encodeURIComponent(timezone);

  // 1. Tenta consumir o endpoint de Backend / Edge Function com cache de 2 horas (/api/forecast)
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    try {
      const apiUrl = `/api/forecast?lat=${lat}&lon=${lon}&timezone=${encodedTz}&forecast_days=${forecastDays}`;
      const apiRes = await fetch(apiUrl);
      if (apiRes.ok) {
        const cacheHeader = apiRes.headers.get('X-Cache') || 'REMOTE';
        console.log(`⚡ [Backend / Edge Cache] Previsão carregada via ${apiUrl} (${cacheHeader})`);
        return await apiRes.json();
      }
    } catch (_) {
      // Se a rota local não estiver rodando (ex: aberto estático), continua para a ingestão direta
    }
  }

  // 2. Cache Local de Navegador (TTL = 2 horas) como fallback resiliente
  const clientCacheKey = `dsysa_cache_v2_${Number(lat).toFixed(2)}_${Number(lon).toFixed(2)}_${forecastDays}`;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const rawCache = localStorage.getItem(clientCacheKey);
      if (rawCache) {
        const parsedCache = JSON.parse(rawCache);
        if (parsedCache.expiresAt && parsedCache.expiresAt > Date.now()) {
          const remainingMin = Math.round((parsedCache.expiresAt - Date.now()) / 60000);
          console.log(`💾 [Browser Cache HIT] Dados reutilizados do localStorage. Expira em ${remainingMin} min.`);
          return parsedCache.data;
        }
      }
    } catch (_) {}
  }

  // 3. Endpoint Marinho (NOAA WW3 + Modelos Harmônicos de Maré + Copernicus SST)
  const marineParams = [
    'wave_height',
    'wave_direction',
    'wave_period',
    'swell_wave_height',
    'swell_wave_direction',
    'swell_wave_period',
    'secondary_swell_wave_height',
    'secondary_swell_wave_direction',
    'secondary_swell_wave_period',
    'sea_level_height_msl',
    'sea_surface_temperature'
  ].join(',');

  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=${marineParams}&timezone=${encodedTz}&forecast_days=${forecastDays}`;

  // 2. Endpoint Atmosférico (NOAA GFS / DWD ICON - Vento + Estado Atual WMO + Dia/Noite)
  const weatherParams = [
    'wind_speed_10m',
    'wind_direction_10m',
    'wind_gusts_10m'
  ].join(',');

  const currentParams = [
    'weather_code',
    'is_day',
    'cloud_cover',
    'temperature_2m'
  ].join(',');

  const dailyParams = [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min'
  ].join(',');

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${weatherParams}&current=${currentParams}&daily=${dailyParams}&wind_speed_unit=kn&timezone=${encodedTz}&forecast_days=${forecastDays}`;

  // Execução assíncrona paralela (Promise.all)
  const [marineRes, weatherRes] = await Promise.all([
    fetch(marineUrl).then((r) => {
      if (!r.ok) throw new Error(`Falha na API Marinha Open-Meteo: HTTP ${r.status}`);
      return r.json();
    }),
    fetch(weatherUrl).then((r) => {
      if (!r.ok) throw new Error(`Falha na API Atmosférica Open-Meteo: HTTP ${r.status}`);
      return r.json();
    })
  ]);

  const marineHourly = marineRes.hourly || {};
  const weatherHourly = weatherRes.hourly || {};

  const marineTimes = marineHourly.time || [];
  const weatherTimes = weatherHourly.time || [];

  // Mapeamento rápido do vento por timestamp ISO para merge seguro e desacoplado
  const weatherMap = new Map();
  for (let i = 0; i < weatherTimes.length; i++) {
    const t = weatherTimes[i];
    weatherMap.set(t, {
      speedKnots: roundOrNull(weatherHourly.wind_speed_10m?.[i], 1),
      gustsKnots: roundOrNull(weatherHourly.wind_gusts_10m?.[i], 1),
      directionDeg: roundOrNull(weatherHourly.wind_direction_10m?.[i], 0)
    });
  }

  // Detecção de preia-mar (HIGH) e baixa-mar (LOW) com interpolação precisa
  const seaLevels = marineHourly.sea_level_height_msl || [];
  const tideExtrema = detectTideExtrema(marineTimes, seaLevels);

  // Construção da linha do tempo normalizada (Timeline)
  const timeline = [];

  for (let i = 0; i < marineTimes.length; i++) {
    const timestamp = marineTimes[i];
    const windData = weatherMap.get(timestamp) || {
      speedKnots: null,
      gustsKnots: null,
      directionDeg: null
    };

    const primaryHeight = roundOrNull(marineHourly.swell_wave_height?.[i], 1);
    const primaryPeriod = roundOrNull(marineHourly.swell_wave_period?.[i], 0);
    const primaryDirDeg = roundOrNull(marineHourly.swell_wave_direction?.[i], 0);

    const secondaryHeight = roundOrNull(marineHourly.secondary_swell_wave_height?.[i], 1);
    const secondaryPeriod = roundOrNull(marineHourly.secondary_swell_wave_period?.[i], 0);
    const secondaryDirDeg = roundOrNull(marineHourly.secondary_swell_wave_direction?.[i], 0);

    const windDirDeg = windData.directionDeg;
    const extremaObj = tideExtrema[i];

    timeline.push({
      timestamp,
      swell: {
        totalHeightM: roundOrNull(marineHourly.wave_height?.[i], 1),
        primary: {
          heightM: primaryHeight,
          periodS: primaryPeriod,
          directionDeg: primaryDirDeg,
          directionCardinal: degreesToCardinal(primaryDirDeg)
        },
        secondary: {
          heightM: secondaryHeight,
          periodS: secondaryPeriod,
          directionDeg: secondaryDirDeg,
          directionCardinal: degreesToCardinal(secondaryDirDeg)
        },
        energyIndex: calculateSwellEnergyIndex(primaryHeight, primaryPeriod)
      },
      wind: {
        speedKnots: windData.speedKnots,
        gustsKnots: windData.gustsKnots,
        directionDeg: windDirDeg,
        directionCardinal: degreesToCardinal(windDirDeg)
      },
      tide: {
        heightM: roundOrNull(seaLevels[i], 1),
        nauticalHeightM: roundOrNull((seaLevels[i] !== null && seaLevels[i] !== undefined) ? seaLevels[i] + 1.25 : null, 2),
        type: extremaObj ? extremaObj.type : null,
        exactTime: extremaObj ? extremaObj.exactTime : null,
        hourFloat: extremaObj ? extremaObj.hourFloat : null,
        peakNauticalHeightM: extremaObj ? extremaObj.nauticalHeightM : null
      },
      waterTempC: roundOrNull(marineHourly.sea_surface_temperature?.[i], 1)
    });
  }

  const currentRaw = weatherRes.current || {};
  const currentWeather = {
    weatherCode: typeof currentRaw.weather_code === 'number' ? currentRaw.weather_code : 0,
    isDay: typeof currentRaw.is_day === 'number' ? currentRaw.is_day : 1,
    cloudCover: typeof currentRaw.cloud_cover === 'number' ? currentRaw.cloud_cover : 0,
    temperatureC: roundOrNull(currentRaw.temperature_2m, 0),
    time: currentRaw.time || null,
    timezone: weatherRes.timezone || timezone
  };

  const dailyRaw = weatherRes.daily || {};
  const dailyTimes = Array.isArray(dailyRaw.time) ? dailyRaw.time : [];
  const dailyWeather = dailyTimes.slice(0, 3).map((dateStr, idx) => ({
    date: dateStr,
    weatherCode: typeof dailyRaw.weather_code?.[idx] === 'number' ? dailyRaw.weather_code[idx] : 1,
    tempMinC: roundOrNull(dailyRaw.temperature_2m_min?.[idx], 0),
    tempMaxC: roundOrNull(dailyRaw.temperature_2m_max?.[idx], 0)
  }));

  const result = {
    spot: {
      lat: Number(lat),
      lon: Number(lon),
      timezone: weatherRes.timezone || timezone
    },
    currentWeather,
    dailyWeather,
    timeline
  };

  // Salva no cache do navegador por 2 horas (TTL = 7200s)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(clientCacheKey, JSON.stringify({
        data: result,
        expiresAt: Date.now() + 2 * 60 * 60 * 1000 // 2 horas
      }));
    } catch (_) {}
  }

  return result;
}

// Suporte para ambientes Node.js (CommonJS), Bundlers (ESM) e Navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchSurfForecast,
    degreesToCardinal,
    calculateSwellEnergyIndex,
    detectTideExtrema
  };
}
if (typeof window !== 'undefined') {
  window.fetchSurfForecast = fetchSurfForecast;
  window.degreesToCardinal = degreesToCardinal;
  window.calculateSwellEnergyIndex = calculateSwellEnergyIndex;
  window.detectTideExtrema = detectTideExtrema;
}

// Teste direto via CLI: `node open-meteo-service.js`
if (typeof require !== 'undefined' && require.main === module) {
  (async () => {
    console.log('🌊 [Open-Meteo Surf Service] Consultando previsão para Stella Maris (-12.95, -38.35)...');
    try {
      const forecast = await fetchSurfForecast({ lat: -12.95, lon: -38.35, forecastDays: 2 });
      console.log('✅ Spot:', forecast.spot);
      console.log('✅ Total de horas normalizadas:', forecast.timeline.length);
      console.log('\n🔍 Amostra (Primeiro ponto horário):');
      console.log(JSON.stringify(forecast.timeline[0], null, 2));

      const highs = forecast.timeline.filter((p) => p.tide.type === 'HIGH');
      const lows = forecast.timeline.filter((p) => p.tide.type === 'LOW');
      console.log(`\n🌊 Marés detectadas: ${highs.length} Preia-mar (HIGH) e ${lows.length} Baixa-mar (LOW)`);
      if (highs.length > 0) console.log('   Exemplo HIGH:', highs[0].timestamp, `${highs[0].tide.heightM}m`);
      if (lows.length > 0) console.log('   Exemplo LOW :', lows[0].timestamp, `${lows[0].tide.heightM}m`);
    } catch (err) {
      console.error('❌ Erro no teste do serviço:', err);
    }
  })();
}
