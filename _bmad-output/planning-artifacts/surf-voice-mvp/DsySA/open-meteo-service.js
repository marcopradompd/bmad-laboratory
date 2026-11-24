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
 * Constantes do Ensemble Costeiro de Vento (40% ICON + 40% ECMWF + 20% GFS)
 * e fator físico de potência de onda (E_joules = k * (H1^2 * T1 + H2^2 * T2))
 */
const WIND_ENSEMBLE_MODELS = [
  { key: 'icon_seamless', weight: 0.4 },
  { key: 'ecmwf_ifs025', weight: 0.4 },
  { key: 'gfs_seamless', weight: 0.2 }
];
const WAVE_ENERGY_SCALE_K = 72;

/**
 * Média ponderada escalar com renormalização dinâmica quando algum modelo retorna null
 */
function computeWeightedScalar(samples, decimals = 1) {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const s of samples) {
    if (s && s.value !== null && s.value !== undefined && !isNaN(s.value) && s.weight > 0) {
      weightedSum += Number(s.value) * s.weight;
      totalWeight += s.weight;
    }
  }
  if (totalWeight <= 0) return null;
  return Number((weightedSum / totalWeight).toFixed(decimals));
}

/**
 * Média vetorial ponderada para direções em graus (0°–360°):
 * U = Σ w_i * sin(θ_i), V = Σ w_i * cos(θ_i), θ = atan2(U, V)
 * Evita distorção no cruzamento 359° ↔ 0°.
 */
function computeWeightedVectorDirection(samples) {
  let sumU = 0;
  let sumV = 0;
  let totalWeight = 0;
  for (const s of samples) {
    if (s && s.deg !== null && s.deg !== undefined && !isNaN(s.deg) && s.weight > 0) {
      const rad = (Number(s.deg) * Math.PI) / 180;
      sumU += s.weight * Math.sin(rad);
      sumV += s.weight * Math.cos(rad);
      totalWeight += s.weight;
    }
  }
  if (totalWeight <= 0) return null;
  const avgDeg = ((Math.atan2(sumU, sumV) * 180) / Math.PI + 360) % 360;
  return Math.round(avgDeg) % 360;
}

/**
 * Calcula o Índice Relativo de Energia do Swell (compatibilidade)
 */
function calculateSwellEnergyIndex(heightM, periodS) {
  if (!heightM || !periodS || heightM <= 0 || periodS <= 0) {
    return 0.0;
  }
  const energy = Math.pow(heightM, 2) * periodS;
  return Number(energy.toFixed(1));
}

/**
 * Fórmula Física Calibrada de Potência Combinada em Joules:
 * E_joules = k * (H1^2 * T1 + H2^2 * T2)
 * onde k = 72 alinha 500 J ao limiar de ondas com boa pressão/força.
 */
function calculateCombinedWaveEnergyJoules(h1, t1, h2 = 0, t2 = 0, k = WAVE_ENERGY_SCALE_K) {
  const term1 = h1 > 0 && t1 > 0 ? Math.pow(Number(h1), 2) * Number(t1) : 0;
  const term2 = h2 > 0 && t2 > 0 ? Math.pow(Number(h2), 2) * Number(t2) : 0;
  return Math.round(k * (term1 + term2));
}

/**
 * Calcula o offset positivo do Datum Costeiro (Nível Zero Náutico)
 * garantindo que todas as alturas de maré operem em escala positiva (>= 0.15m)
 */
function computeCoastalDatumOffset(heights) {
  let minVal = Infinity;
  for (let i = 0; i < heights.length; i++) {
    const v = heights[i];
    if (v !== null && v !== undefined && !isNaN(v) && v < minVal) {
      minVal = v;
    }
  }
  if (!isFinite(minVal)) return 1.25;
  return Number(Math.max(1.25, Math.abs(Math.min(0, minVal)) + 0.15).toFixed(2));
}

/**
 * Detecta picos de maré (Preia-mar / "HIGH" e Baixa-mar / "LOW") a partir
 * do array horário contínuo de altura do nível do mar (MSL).
 * 
 * Utiliza interpolação parabólica sub-horária para determinar o minuto exato do pico
 * e converte para Cota Náutica / Nível de Redução (NR) positivo.
 *
 * @param {Array<string>} times - Array de timestamps ISO
 * @param {Array<number|null>} heights - Série horária de alturas de maré (m)
 * @param {number} [datumOffset] - Offset positivo de calibração costeira
 * @returns {Array<Object|null>} Array de mesmo comprimento com anotações de maré
 */
function detectTideExtrema(times, heights, datumOffset = null) {
  const n = heights.length;
  const results = new Array(n).fill(null);
  if (n < 3) return results;

  const offset = datumOffset !== null ? datumOffset : computeCoastalDatumOffset(heights);

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
      
      // Conversão calibrada de MSL para Cota Náutica positiva (Datum Costeiro)
      const nauticalHeightM = +(exactH + offset).toFixed(2);

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
  const clientCacheKey = `dsysa_cache_v4_${Number(lat).toFixed(2)}_${Number(lon).toFixed(2)}_${forecastDays}`;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const rawCache = localStorage.getItem(clientCacheKey);
      if (rawCache) {
        const parsedCache = JSON.parse(rawCache);
        if (parsedCache.expiresAt && parsedCache.expiresAt > Date.now()) {
          const remainingMin = Math.round((parsedCache.expiresAt - Date.now()) / 60000);
          console.log(`💾 [Browser Cache HIT] Dados Multi-Modelo reutilizados do localStorage. Expira em ${remainingMin} min.`);
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

  // 4. Endpoint Atmosférico — Ensemble Costeiro Multi-Modelo (40% ICON + 40% ECMWF + 20% GFS)
  const weatherParams = [
    'wind_speed_10m',
    'wind_direction_10m',
    'wind_gusts_10m'
  ].join(',');

  const currentParams = [
    'wind_speed_10m',
    'wind_direction_10m',
    'wind_gusts_10m',
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

  const modelsParam = WIND_ENSEMBLE_MODELS.map((m) => m.key).join(',');
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&models=${modelsParam}&hourly=${weatherParams}&current=${currentParams}&daily=${dailyParams}&wind_speed_unit=kn&timezone=${encodedTz}&forecast_days=${forecastDays}`;

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

  // Helper para ler série horária de um modelo (com fallback para chave sem sufixo)
  const readEnsembleHourly = (baseField, idx) =>
    WIND_ENSEMBLE_MODELS.map((m) => ({
      weight: m.weight,
      value: weatherHourly[`${baseField}_${m.key}`]?.[idx]
    }));

  const readEnsembleCurrent = (rawObj, baseField) =>
    WIND_ENSEMBLE_MODELS.map((m) => ({
      weight: m.weight,
      value: rawObj[`${baseField}_${m.key}`]
    }));

  const pickFirstValid = (rawObj, baseField, idx = null) => {
    for (const m of WIND_ENSEMBLE_MODELS) {
      const container = rawObj[`${baseField}_${m.key}`];
      const v = idx !== null ? container?.[idx] : container;
      if (v !== null && v !== undefined && !isNaN(v)) return v;
    }
    const fallback = idx !== null ? rawObj[baseField]?.[idx] : rawObj[baseField];
    return fallback !== null && fallback !== undefined && !isNaN(fallback) ? fallback : null;
  };

  // Fusão Ponderada Costeira do Vento (40% ICON + 40% ECMWF + 20% GFS + Média Vetorial sin/cos)
  const weatherMap = new Map();
  for (let i = 0; i < weatherTimes.length; i++) {
    const t = weatherTimes[i];
    const speedEnsemble = computeWeightedScalar(readEnsembleHourly('wind_speed_10m', i), 1);
    const gustsEnsemble = computeWeightedScalar(readEnsembleHourly('wind_gusts_10m', i), 1);
    const dirEnsemble = computeWeightedVectorDirection(
      WIND_ENSEMBLE_MODELS.map((m) => ({
        weight: m.weight,
        deg: weatherHourly[`wind_direction_10m_${m.key}`]?.[i]
      }))
    );

    weatherMap.set(t, {
      speedKnots: speedEnsemble !== null ? speedEnsemble : roundOrNull(weatherHourly.wind_speed_10m?.[i], 1),
      gustsKnots: gustsEnsemble !== null ? gustsEnsemble : roundOrNull(weatherHourly.wind_gusts_10m?.[i], 1),
      directionDeg: dirEnsemble !== null ? dirEnsemble : roundOrNull(weatherHourly.wind_direction_10m?.[i], 0)
    });
  }

  // Calibração do Nível Zero (Datum Costeiro positivo) e detecção precisa de estofos (HIGH/LOW)
  const seaLevels = marineHourly.sea_level_height_msl || [];
  const datumOffset = computeCoastalDatumOffset(seaLevels);
  const tideExtrema = detectTideExtrema(marineTimes, seaLevels, datumOffset);

  // Construção da linha do tempo normalizada (Timeline)
  const timeline = [];

  for (let i = 0; i < marineTimes.length; i++) {
    const timestamp = marineTimes[i];
    const windData = weatherMap.get(timestamp) || {
      speedKnots: null,
      gustsKnots: null,
      directionDeg: null
    };

    const totalHeight = roundOrNull(marineHourly.wave_height?.[i], 1);
    const wavePeriod = roundOrNull(marineHourly.wave_period?.[i], 0);
    const waveDirDeg = roundOrNull(marineHourly.wave_direction?.[i], 0);

    const primaryHeight = roundOrNull(marineHourly.swell_wave_height?.[i], 1);
    const primaryPeriod = roundOrNull(marineHourly.swell_wave_period?.[i], 0);
    const primaryDirDeg = roundOrNull(marineHourly.swell_wave_direction?.[i], 0);

    const secondaryHeight = roundOrNull(marineHourly.secondary_swell_wave_height?.[i], 1);
    const secondaryPeriod = roundOrNull(marineHourly.secondary_swell_wave_period?.[i], 0);
    const secondaryDirDeg = roundOrNull(marineHourly.secondary_swell_wave_direction?.[i], 0);

    const windDirDeg = windData.directionDeg;
    const extremaObj = tideExtrema[i];
    const h1ForEnergy = primaryHeight !== null ? primaryHeight : (totalHeight || 0);
    const t1ForEnergy = primaryPeriod !== null ? primaryPeriod : (wavePeriod || 0);
    const energyJoules = calculateCombinedWaveEnergyJoules(
      h1ForEnergy,
      t1ForEnergy,
      secondaryHeight || 0,
      secondaryPeriod || 0
    );

    timeline.push({
      timestamp,
      swell: {
        totalHeightM: totalHeight,
        wavePeriodS: wavePeriod,
        waveDirectionDeg: waveDirDeg,
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
        energyIndex: calculateSwellEnergyIndex(primaryHeight, primaryPeriod),
        energyJoules
      },
      wind: {
        speedKnots: windData.speedKnots,
        gustsKnots: windData.gustsKnots,
        directionDeg: windDirDeg,
        directionCardinal: degreesToCardinal(windDirDeg),
        ensemble: 'ICON40/ECMWF40/GFS20'
      },
      tide: {
        heightM: roundOrNull(seaLevels[i], 1),
        nauticalHeightM: roundOrNull((seaLevels[i] !== null && seaLevels[i] !== undefined) ? Math.max(0.1, seaLevels[i] + datumOffset) : null, 2),
        datumOffsetM: datumOffset,
        type: extremaObj ? extremaObj.type : null,
        exactTime: extremaObj ? extremaObj.exactTime : null,
        hourFloat: extremaObj ? extremaObj.hourFloat : null,
        peakNauticalHeightM: extremaObj ? extremaObj.nauticalHeightM : null
      },
      waterTempC: roundOrNull(marineHourly.sea_surface_temperature?.[i], 1)
    });
  }

  const currentRaw = weatherRes.current || {};
  const curWeatherCode = pickFirstValid(currentRaw, 'weather_code');
  const curIsDay = pickFirstValid(currentRaw, 'is_day');
  const curCloudCover = computeWeightedScalar(readEnsembleCurrent(currentRaw, 'cloud_cover'), 0);
  const curTempC = computeWeightedScalar(readEnsembleCurrent(currentRaw, 'temperature_2m'), 0);
  const curWindKnots = computeWeightedScalar(readEnsembleCurrent(currentRaw, 'wind_speed_10m'), 1);
  const curGustsKnots = computeWeightedScalar(readEnsembleCurrent(currentRaw, 'wind_gusts_10m'), 1);
  const curWindDirDeg = computeWeightedVectorDirection(
    WIND_ENSEMBLE_MODELS.map((m) => ({
      weight: m.weight,
      deg: currentRaw[`wind_direction_10m_${m.key}`]
    }))
  );

  const currentWeather = {
    weatherCode: curWeatherCode !== null ? Number(curWeatherCode) : 0,
    isDay: curIsDay !== null ? Number(curIsDay) : 1,
    cloudCover: curCloudCover !== null ? curCloudCover : (typeof currentRaw.cloud_cover === 'number' ? currentRaw.cloud_cover : 0),
    temperatureC: curTempC !== null ? curTempC : roundOrNull(currentRaw.temperature_2m, 0),
    windSpeedKnots: curWindKnots !== null ? curWindKnots : roundOrNull(currentRaw.wind_speed_10m, 1),
    windGustsKnots: curGustsKnots !== null ? curGustsKnots : roundOrNull(currentRaw.wind_gusts_10m, 1),
    windDirectionDeg: curWindDirDeg !== null ? curWindDirDeg : roundOrNull(currentRaw.wind_direction_10m, 0),
    time: currentRaw.time || null,
    timezone: weatherRes.timezone || timezone
  };

  const dailyRaw = weatherRes.daily || {};
  const dailyTimes = Array.isArray(dailyRaw.time) ? dailyRaw.time : [];
  const dailyWeather = dailyTimes.slice(0, 15).map((dateStr, idx) => {
    const code = pickFirstValid(dailyRaw, 'weather_code', idx);
    const tMin = computeWeightedScalar(
      WIND_ENSEMBLE_MODELS.map((m) => ({ weight: m.weight, value: dailyRaw[`temperature_2m_min_${m.key}`]?.[idx] })),
      0
    );
    const tMax = computeWeightedScalar(
      WIND_ENSEMBLE_MODELS.map((m) => ({ weight: m.weight, value: dailyRaw[`temperature_2m_max_${m.key}`]?.[idx] })),
      0
    );
    return {
      date: dateStr,
      weatherCode: code !== null ? Number(code) : 1,
      tempMinC: tMin !== null ? tMin : roundOrNull(dailyRaw.temperature_2m_min?.[idx], 0),
      tempMaxC: tMax !== null ? tMax : roundOrNull(dailyRaw.temperature_2m_max?.[idx], 0)
    };
  });

  const result = {
    spot: {
      lat: Number(lat),
      lon: Number(lon),
      timezone: weatherRes.timezone || timezone
    },
    meta: {
      windEnsemble: 'icon_seamless (40%) + ecmwf_ifs025 (40%) + gfs_seamless (20%)',
      energyScaleK: WAVE_ENERGY_SCALE_K,
      tideDatumOffsetM: datumOffset
    },
    currentWeather,
    dailyWeather,
    timeline
  };

  // Salva no cache do navegador por 2 horas (TTL = 7200s), limpando caches antigos para evitar QuotaExceededError
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      for (let k = localStorage.length - 1; k >= 0; k--) {
        const key = localStorage.key(k);
        if (key && (key.startsWith('dsysa_cache_v1_') || key.startsWith('dsysa_cache_v2_') || key.startsWith('dsysa_cache_v3_'))) {
          localStorage.removeItem(key);
        }
      }
      localStorage.setItem(clientCacheKey, JSON.stringify({
        data: result,
        expiresAt: Date.now() + 2 * 60 * 60 * 1000 // 2 horas
      }));
    } catch (_) {
      // Se ainda estiver sem espaço, remove caches v4 antigos e tenta salvar novamente
      try {
        for (let k = localStorage.length - 1; k >= 0; k--) {
          const key = localStorage.key(k);
          if (key && key.startsWith('dsysa_cache_v4_')) {
            localStorage.removeItem(key);
          }
        }
        localStorage.setItem(clientCacheKey, JSON.stringify({
          data: result,
          expiresAt: Date.now() + 2 * 60 * 60 * 1000
        }));
      } catch (__) {}
    }
  }

  return result;
}

// Suporte para ambientes Node.js (CommonJS), Bundlers (ESM) e Navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchSurfForecast,
    degreesToCardinal,
    calculateSwellEnergyIndex,
    calculateCombinedWaveEnergyJoules,
    computeWeightedScalar,
    computeWeightedVectorDirection,
    computeCoastalDatumOffset,
    detectTideExtrema
  };
}
if (typeof window !== 'undefined') {
  window.fetchSurfForecast = fetchSurfForecast;
  window.degreesToCardinal = degreesToCardinal;
  window.calculateSwellEnergyIndex = calculateSwellEnergyIndex;
  window.calculateCombinedWaveEnergyJoules = calculateCombinedWaveEnergyJoules;
  window.computeWeightedScalar = computeWeightedScalar;
  window.computeWeightedVectorDirection = computeWeightedVectorDirection;
  window.computeCoastalDatumOffset = computeCoastalDatumOffset;
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
