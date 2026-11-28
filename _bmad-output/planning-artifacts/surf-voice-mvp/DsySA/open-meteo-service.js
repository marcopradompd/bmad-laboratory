/**
 * surfeAgent — Serviço de Previsão Oceanográfica & Meteorológica (Padrão Surfguru)
 *
 * Pipeline limpo, direto e sem multiplicadores artificiais:
 * - Ondas & Energia: Open-Meteo Marine API (NOAA WW3 / ECMWF WAM) nas coordenadas exatas do pico
 * - Vento & Clima:   Open-Meteo Forecast API usando NOAA GFS (`models=gfs_seamless`) em nós (`kn`)
 * - Energia (J/m²):  E = (1/8) * 1025 * 9.81 * H² ≈ 1256.9 * H² (fórmula física padrão)
 * - Potência (kW/m): P ≈ 0.49 * H² * T
 * - Maré:            sea_level_height_msl + 1.25 m (escala positiva 0.0m – 2.5m)
 */

const CARDINAL_POINTS_16 = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
];

const SEAWATER_DENSITY = 1025; // kg/m³
const GRAVITY = 9.81;          // m/s²
const TIDE_DATUM_OFFSET_M = 1.25;

/**
 * Calcula a altura de onda exibida (`displayWaveHeight`) conforme o perfil costeiro determinístico:
 * - exposed_beach:  wave_height (altura total combinada: swell + vagas locais)
 * - sheltered_cove: (swell_wave_height || wave_height) * 0.90 (filtra marola local de vento)
 * - reef_point:     se dir (125°–215°, SE–SW) => (swell_wave_height || wave_height) * 1.10;
 *                   caso contrário (E/NE paralelo) => (swell_wave_height || wave_height) * 0.85
 */
function computeProfileWaveHeight(spotProfile, waveHeight, swellWaveHeight, dirDeg) {
  const wH = waveHeight !== null && waveHeight !== undefined && !isNaN(waveHeight) ? Number(waveHeight) : null;
  const sH = swellWaveHeight !== null && swellWaveHeight !== undefined && !isNaN(swellWaveHeight) && Number(swellWaveHeight) > 0
    ? Number(swellWaveHeight)
    : wH;
  const baseSwell = sH !== null ? sH : (wH || 0);
  const profile = spotProfile || 'exposed_beach';

  if (profile === 'sheltered_cove') {
    return baseSwell * 0.90;
  }
  if (profile === 'reef_point') {
    const dir = dirDeg !== null && dirDeg !== undefined && !isNaN(dirDeg) ? Number(dirDeg) : null;
    if (dir !== null && dir >= 125 && dir <= 215) {
      return baseSwell * 1.10;
    }
    return baseSwell * 0.85;
  }
  return wH !== null ? wH : baseSwell;
}

/**
 * Converte azimute (0°–360°) para sigla cardeal (16 direções)
 */
function degreesToCardinal(degrees) {
  if (degrees === null || degrees === undefined || isNaN(degrees)) {
    return null;
  }
  const normalized = ((Number(degrees) % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return CARDINAL_POINTS_16[index];
}

/**
 * Densidade de energia de ondas oceânicas em Joules/m² sobre a altura resultante da bancada:
 * E = Math.round(1257 * Math.pow(displayWaveHeight, 2))
 */
function calculateWaveEnergyJoulesM2(heightM) {
  const h = Number(heightM);
  if (!Number.isFinite(h) || h <= 0) return 0;
  return Math.round(1257 * Math.pow(h, 2));
}

/**
 * Fluxo de potência de onda em kW/m:
 * P ≈ 0.49 * H² * T
 */
function calculateWavePowerKwM(heightM, periodS) {
  const h = Number(heightM);
  const t = Number(periodS);
  if (!Number.isFinite(h) || !Number.isFinite(t) || h <= 0 || t <= 0) return 0;
  return Number((0.49 * h * h * t).toFixed(1));
}

function calculateSwellEnergyIndex(heightM, periodS) {
  return calculateWaveEnergyJoulesM2(heightM);
}

function roundOrNull(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(val)) return null;
  return Number(Number(val).toFixed(decimals));
}

/**
 * Detecção parabólica de picos de maré (Preia-mar / HIGH e Baixa-mar / LOW)
 * com offset fixo de +1.25 m sobre sea_level_height_msl.
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
      const timePart = (timeStr.split('T')[1]) || '00:00';
      const [hBase] = timePart.split(':').map(Number);
      const totalMinutes = Math.round((hBase + delta) * 60);
      const finalH = Math.min(23, Math.max(0, Math.floor(totalMinutes / 60)));
      const finalM = Math.min(59, Math.max(0, totalMinutes % 60));
      const formattedTime = `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}h`;
      const nauticalHeightM = Math.max(0, Number((exactH + TIDE_DATUM_OFFSET_M).toFixed(2)));

      results[i] = {
        type: isHigh ? 'HIGH' : 'LOW',
        exactTime: formattedTime,
        hourFloat: +(hBase + delta).toFixed(2),
        mslHeightM: +(exactH).toFixed(2),
        nauticalHeightM
      };
    }
  }
  return results;
}

/**
 * Purga chaves antigas de cache de versões anteriores no localStorage
 */
function purgeLegacyForecastCaches() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    for (let k = localStorage.length - 1; k >= 0; k--) {
      const key = localStorage.key(k);
      if (key && (key.startsWith('dsysa_cache_') || key.startsWith('surfguru_std_v1_') || key.startsWith('surfguru_ww3_v2_') || key.startsWith('surfguru_ww3_v3_') || key.startsWith('surfguru_ww3_v4_'))) {
        localStorage.removeItem(key);
      }
    }
  } catch (_) {}
}

/**
 * Ingestão direta e limpa (Padrão Surfguru):
 * - Marine API: coordenadas exatas do pico (WW3 / ECMWF WAM)
 * - Forecast API: modelo NOAA GFS (`models=gfs_seamless`) em nós (`kn`)
 */
async function fetchSurfForecast({
  lat,
  lon,
  spotProfile = 'exposed_beach',
  timezone = 'auto',
  forecastDays = 7
}) {
  if (lat === undefined || lon === undefined) {
    throw new Error('Parâmetros obrigatórios ausentes: lat e lon');
  }

  const exactLat = Number(lat);
  const exactLon = Number(lon);
  const resolvedProfile = ['reef_point', 'sheltered_cove', 'exposed_beach'].includes(spotProfile)
    ? spotProfile
    : 'exposed_beach';
  const marineDays = Math.min(8, Math.max(1, Number(forecastDays) || 7));
  const weatherDays = Math.min(15, Math.max(7, Number(forecastDays) || 7));
  const encodedTz = encodeURIComponent(timezone);

  purgeLegacyForecastCaches();

  // 1. Tenta backend local (/api/forecast) se estiver rodando via servidor Node
  if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
    try {
      const apiUrl = `/api/forecast?lat=${exactLat}&lon=${exactLon}&spot_profile=${encodeURIComponent(resolvedProfile)}&timezone=${encodedTz}&forecast_days=${weatherDays}`;
      const apiRes = await fetch(apiUrl);
      if (apiRes.ok) {
        return await apiRes.json();
      }
    } catch (_) {
      // Fallback direto para Open-Meteo
    }
  }

  // 2. Cache local limpo (TTL = 2 horas) — Perfis Costeiros Determinísticos + NOAA WW3 + NOAA GFS
  const clientCacheKey = `surfguru_profile_v5_${exactLat.toFixed(4)}_${exactLon.toFixed(4)}_${resolvedProfile}_${weatherDays}`;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const rawCache = localStorage.getItem(clientCacheKey);
      if (rawCache) {
        const parsedCache = JSON.parse(rawCache);
        if (parsedCache.expiresAt && parsedCache.expiresAt > Date.now()) {
          return parsedCache.data;
        }
      }
    } catch (_) {}
  }

  // 3. Marine API — Modelo NOAA WaveWatch III (`ncep_gfswave025`, mesmo modelo do Surfguru)
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
    'wind_wave_height',
    'wind_wave_direction',
    'wind_wave_period',
    'sea_level_height_msl',
    'sea_surface_temperature'
  ].join(',');
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${exactLat}&longitude=${exactLon}&models=ncep_gfswave025&hourly=${marineParams}&timezone=${encodedTz}&forecast_days=${marineDays}`;

  // 4. Forecast API — Modelo NOAA GFS (`gfs_seamless`) em nós (padrão Surfguru)
  const weatherParams = 'wind_speed_10m,wind_direction_10m,wind_gusts_10m';
  const currentParams = 'wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code,is_day,cloud_cover,temperature_2m';
  const dailyParams = 'weather_code,temperature_2m_max,temperature_2m_min';
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${exactLat}&longitude=${exactLon}&models=gfs_seamless&hourly=${weatherParams}&current=${currentParams}&daily=${dailyParams}&wind_speed_unit=kn&timezone=${encodedTz}&forecast_days=${weatherDays}`;

  const [marineRes, weatherRes] = await Promise.all([
    fetch(marineUrl).then((r) => {
      if (!r.ok) throw new Error(`Falha na Marine API Open-Meteo: HTTP ${r.status}`);
      return r.json();
    }),
    fetch(weatherUrl).then((r) => {
      if (!r.ok) throw new Error(`Falha na Forecast API Open-Meteo (GFS): HTTP ${r.status}`);
      return r.json();
    })
  ]);

  const marineHourly = marineRes.hourly || {};
  const weatherHourly = weatherRes.hourly || {};
  const marineTimes = marineHourly.time || [];
  const weatherTimes = weatherHourly.time || [];

  // Leitura direta do GFS (suporta chave direta ou sufixada `_gfs_seamless`)
  const readGfsArr = (field) => weatherHourly[field] || weatherHourly[`${field}_gfs_seamless`] || [];
  const gfsSpeedArr = readGfsArr('wind_speed_10m');
  const gfsGustsArr = readGfsArr('wind_gusts_10m');
  const gfsDirArr = readGfsArr('wind_direction_10m');

  const weatherMap = new Map();
  for (let i = 0; i < weatherTimes.length; i++) {
    const t = weatherTimes[i];
    const spd = gfsSpeedArr[i];
    const gst = gfsGustsArr[i];
    const dir = gfsDirArr[i];
    weatherMap.set(t, {
      speedKnots: spd !== null && spd !== undefined && !isNaN(spd) ? Math.round(Number(spd)) : null,
      gustsKnots: gst !== null && gst !== undefined && !isNaN(gst) ? Math.round(Number(gst)) : null,
      directionDeg: dir !== null && dir !== undefined && !isNaN(dir) ? Math.round(Number(dir)) % 360 : null
    });
  }

  // Leitura direta do NOAA WW3 (suporta chave direta ou sufixada `_ncep_gfswave025`)
  const readMarineArr = (field) => marineHourly[field] || marineHourly[`${field}_ncep_gfswave025`] || [];
  const waveHeightArr = readMarineArr('wave_height');
  const wavePeriodArr = readMarineArr('wave_period');
  const waveDirArr = readMarineArr('wave_direction');
  const swellHeightArr = readMarineArr('swell_wave_height');
  const swellPeriodArr = readMarineArr('swell_wave_period');
  const swellDirArr = readMarineArr('swell_wave_direction');
  const secSwellHeightArr = readMarineArr('secondary_swell_wave_height');
  const secSwellPeriodArr = readMarineArr('secondary_swell_wave_period');
  const secSwellDirArr = readMarineArr('secondary_swell_wave_direction');
  const windWaveHeightArr = readMarineArr('wind_wave_height');
  const windWavePeriodArr = readMarineArr('wind_wave_period');
  const windWaveDirArr = readMarineArr('wind_wave_direction');
  const seaTempArr = readMarineArr('sea_surface_temperature');

  const seaLevels = readMarineArr('sea_level_height_msl');
  const tideExtrema = detectTideExtrema(marineTimes, seaLevels);

  const timeline = [];
  for (let i = 0; i < marineTimes.length; i++) {
    const timestamp = marineTimes[i];
    const windData = weatherMap.get(timestamp) || { speedKnots: null, gustsKnots: null, directionDeg: null };

    // Componentes espectrais puros da Open-Meteo (NOAA WW3) sem deslocamento de coordenadas
    const rawWaveH = waveHeightArr[i];
    const rawSwellHVal = swellHeightArr[i];
    const rawWaveP = wavePeriodArr[i];
    const rawSwellPVal = swellPeriodArr[i];
    const rawWaveD = waveDirArr[i];
    const rawSwellDVal = swellDirArr[i];

    const totalWaveHeight = roundOrNull(rawWaveH, 1);
    const totalWavePeriod = roundOrNull(rawWaveP, 1);
    const totalWaveDir = roundOrNull(rawWaveD, 0);

    const rawSwellH = roundOrNull(rawSwellHVal, 1);
    const rawSwellP = roundOrNull(rawSwellPVal, 1);
    const rawSwellDir = roundOrNull(rawSwellDVal, 0);

    // Período e Direção determinísticos sem alterações: swell_wave_* com fallback para wave_*
    const displayPeriod = roundOrNull(rawSwellPVal || rawWaveP, 1);
    const displayDir = roundOrNull(rawSwellDVal || rawWaveD, 0);

    // Altura exibida (displayWaveHeight) calculada pelo Perfil Costeiro (spotProfile)
    const exactDisplayH = computeProfileWaveHeight(resolvedProfile, rawWaveH, rawSwellHVal, displayDir);
    const displayWaveHeight = roundOrNull(exactDisplayH, 1);

    const swellPrimaryHeight = rawSwellH !== null ? rawSwellH : totalWaveHeight;
    const swellPrimaryPeriod = displayPeriod;
    const swellPrimaryDir = displayDir;

    const secondaryHeight = roundOrNull(secSwellHeightArr[i], 1);
    const secondaryPeriod = roundOrNull(secSwellPeriodArr[i], 1);
    const secondaryDir = roundOrNull(secSwellDirArr[i], 0);

    const windWaveHeight = roundOrNull(windWaveHeightArr[i], 1);
    const windWavePeriod = roundOrNull(windWavePeriodArr[i], 1);
    const windWaveDir = roundOrNull(windWaveDirArr[i], 0);

    // Energia (J/m²) calculada sobre a altura resultante da bancada: Math.round(1257 * displayWaveHeight²)
    const energyJoulesM2 = calculateWaveEnergyJoulesM2(exactDisplayH);
    const powerKwM = calculateWavePowerKwM(exactDisplayH, displayPeriod || 0);

    const extremaObj = tideExtrema[i];
    const msl = seaLevels[i];
    const nauticalHeightM = msl !== null && msl !== undefined && !isNaN(msl)
      ? Math.max(0, Number((msl + TIDE_DATUM_OFFSET_M).toFixed(2)))
      : null;

    timeline.push({
      timestamp,
      swell: {
        spotProfile: resolvedProfile,
        displayHeightM: displayWaveHeight,
        displayPeriodS: displayPeriod,
        displayDirectionDeg: displayDir,
        displayDirectionCardinal: degreesToCardinal(displayDir),
        totalHeightM: totalWaveHeight,
        wavePeriodS: totalWavePeriod,
        waveDirectionDeg: totalWaveDir,
        waveDirectionCardinal: degreesToCardinal(totalWaveDir),
        primary: {
          heightM: swellPrimaryHeight,
          periodS: swellPrimaryPeriod,
          directionDeg: swellPrimaryDir,
          directionCardinal: degreesToCardinal(swellPrimaryDir)
        },
        secondary: {
          heightM: secondaryHeight,
          periodS: secondaryPeriod,
          directionDeg: secondaryDir,
          directionCardinal: degreesToCardinal(secondaryDir)
        },
        windWave: {
          heightM: windWaveHeight,
          periodS: windWavePeriod,
          directionDeg: windWaveDir,
          directionCardinal: degreesToCardinal(windWaveDir)
        },
        energyJoulesM2,
        powerKwM,
        energyIndex: energyJoulesM2
      },
      wind: {
        speedKnots: windData.speedKnots,
        gustsKnots: windData.gustsKnots,
        directionDeg: windData.directionDeg,
        directionCardinal: degreesToCardinal(windData.directionDeg),
        model: 'gfs_seamless'
      },
      tide: {
        heightM: roundOrNull(msl, 2),
        nauticalHeightM,
        type: extremaObj ? extremaObj.type : null,
        exactTime: extremaObj ? extremaObj.exactTime : null,
        hourFloat: extremaObj ? extremaObj.hourFloat : null,
        peakNauticalHeightM: extremaObj ? extremaObj.nauticalHeightM : null
      },
      waterTempC: roundOrNull(seaTempArr[i], 1)
    });
  }

  const currentRaw = weatherRes.current || {};
  const readGfsCur = (field) => currentRaw[field] ?? currentRaw[`${field}_gfs_seamless`];
  const currentWeather = {
    weatherCode: typeof readGfsCur('weather_code') === 'number' ? readGfsCur('weather_code') : 0,
    isDay: typeof readGfsCur('is_day') === 'number' ? readGfsCur('is_day') : 1,
    cloudCover: typeof readGfsCur('cloud_cover') === 'number' ? readGfsCur('cloud_cover') : 0,
    temperatureC: roundOrNull(readGfsCur('temperature_2m'), 0),
    windSpeedKnots: roundOrNull(readGfsCur('wind_speed_10m'), 0),
    windGustsKnots: roundOrNull(readGfsCur('wind_gusts_10m'), 0),
    windDirectionDeg: roundOrNull(readGfsCur('wind_direction_10m'), 0),
    time: currentRaw.time || null,
    timezone: weatherRes.timezone || timezone
  };

  const dailyRaw = weatherRes.daily || {};
  const readGfsDaily = (field) => dailyRaw[field] || dailyRaw[`${field}_gfs_seamless`] || [];
  const dailyTimes = Array.isArray(dailyRaw.time) ? dailyRaw.time : [];
  const dailyCodes = readGfsDaily('weather_code');
  const dailyMin = readGfsDaily('temperature_2m_min');
  const dailyMax = readGfsDaily('temperature_2m_max');

  const dailyWeather = dailyTimes.slice(0, 15).map((dateStr, idx) => ({
    date: dateStr,
    weatherCode: typeof dailyCodes[idx] === 'number' ? dailyCodes[idx] : 1,
    tempMinC: roundOrNull(dailyMin[idx], 0),
    tempMaxC: roundOrNull(dailyMax[idx], 0)
  }));

  const result = {
    spot: {
      lat: exactLat,
      lon: exactLon,
      timezone: weatherRes.timezone || timezone
    },
    meta: {
      standard: `Surfguru (Perfis Costeiros Determinísticos: ${resolvedProfile})`,
      marineModel: 'ncep_gfswave025',
      spotProfile: resolvedProfile,
      windModel: 'gfs_seamless',
      energyUnit: 'J/m²',
      tideDatumOffsetM: TIDE_DATUM_OFFSET_M
    },
    currentWeather,
    dailyWeather,
    timeline
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(clientCacheKey, JSON.stringify({
        data: result,
        expiresAt: Date.now() + 2 * 60 * 60 * 1000
      }));
    } catch (_) {
      try {
        for (let k = localStorage.length - 1; k >= 0; k--) {
          const key = localStorage.key(k);
          if (key && (key.startsWith('surfguru_std_v1_') || key.startsWith('surfguru_ww3_v2_') || key.startsWith('surfguru_ww3_v3_') || key.startsWith('surfguru_ww3_v4_') || key.startsWith('surfguru_profile_v5_'))) {
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchSurfForecast,
    degreesToCardinal,
    calculateWaveEnergyJoulesM2,
    calculateWavePowerKwM,
    calculateSwellEnergyIndex,
    detectTideExtrema
  };
}
if (typeof window !== 'undefined') {
  window.fetchSurfForecast = fetchSurfForecast;
  window.degreesToCardinal = degreesToCardinal;
  window.calculateWaveEnergyJoulesM2 = calculateWaveEnergyJoulesM2;
  window.calculateWavePowerKwM = calculateWavePowerKwM;
  window.calculateSwellEnergyIndex = calculateSwellEnergyIndex;
  window.detectTideExtrema = detectTideExtrema;
}
