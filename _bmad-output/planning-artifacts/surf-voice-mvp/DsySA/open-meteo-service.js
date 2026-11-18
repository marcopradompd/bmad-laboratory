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
 * Utiliza análise de reversão de inclinação com suporte a platôs discretos
 * para garantir precisão e evitar falsos positivos na série temporal.
 *
 * @param {Array<number|null>} heights - Série horária de alturas de maré (m)
 * @returns {Array<'HIGH'|'LOW'|null>} Array de mesmo comprimento com anotações de maré
 */
function detectTideExtrema(heights) {
  const n = heights.length;
  const tideTypes = new Array(n).fill(null);
  if (n < 3) return tideTypes;

  let i = 0;
  while (i < n) {
    const curr = heights[i];
    if (curr === null || isNaN(curr)) {
      i++;
      continue;
    }

    // Identifica o início e o fim de possíveis platôs (alturas iguais consecutivas)
    let plateauEnd = i;
    while (plateauEnd + 1 < n && heights[plateauEnd + 1] === curr) {
      plateauEnd++;
    }

    // Localiza o ponto anterior válido
    let prevIndex = i - 1;
    while (prevIndex >= 0 && heights[prevIndex] === null) {
      prevIndex--;
    }

    // Localiza o ponto seguinte válido
    let nextIndex = plateauEnd + 1;
    while (nextIndex < n && heights[nextIndex] === null) {
      nextIndex++;
    }

    if (prevIndex >= 0 && nextIndex < n) {
      const prev = heights[prevIndex];
      const next = heights[nextIndex];

      // Máximo Local (Preia-mar / Maré Cheia)
      if (curr > prev && curr > next) {
        const peakIndex = Math.floor((i + plateauEnd) / 2);
        tideTypes[peakIndex] = 'HIGH';
      }
      // Mínimo Local (Baixa-mar / Maré Seca)
      else if (curr < prev && curr < next) {
        const troughIndex = Math.floor((i + plateauEnd) / 2);
        tideTypes[troughIndex] = 'LOW';
      }
    }

    i = plateauEnd + 1;
  }

  return tideTypes;
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
 * @param {number} [options.forecastDays=7] - Dias de previsão (1 a 16)
 * @returns {Promise<Object>} Contrato JSON normalizado para consumo pelo front-end
 */
async function fetchSurfForecast({
  lat,
  lon,
  timezone = 'America/Sao_Paulo',
  forecastDays = 7
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
  const clientCacheKey = `dsysa_cache_${Number(lat).toFixed(2)}_${Number(lon).toFixed(2)}_${forecastDays}`;
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

  // 2. Endpoint Atmosférico (NOAA GFS / DWD ICON - Vento a 10m e Rajadas em Nós)
  const weatherParams = [
    'wind_speed_10m',
    'wind_direction_10m',
    'wind_gusts_10m'
  ].join(',');

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${weatherParams}&wind_speed_unit=kn&timezone=${encodedTz}&forecast_days=${forecastDays}`;

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

  // Detecção de preia-mar (HIGH) e baixa-mar (LOW) em todo o período
  const seaLevels = marineHourly.sea_level_height_msl || [];
  const tideExtrema = detectTideExtrema(seaLevels);

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
        type: tideExtrema[i] || null
      },
      waterTempC: roundOrNull(marineHourly.sea_surface_temperature?.[i], 1)
    });
  }

  const result = {
    spot: {
      lat: Number(lat),
      lon: Number(lon),
      timezone
    },
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
