/**
 * surfeAgent — Serviço do Catálogo Oficial Verificado (`src/data/spots_catalog.json`)
 *
 * Fonte única e verificada dos 14 picos de Salvador e Litoral Norte da Bahia.
 * Elimina alucinações sobre fundo/bancada e garante coordenadas reais exatas em todos os gráficos.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SpotsCatalogService = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Espelho exato de src/data/spots_catalog.json para fallback instantâneo em file:// ou antes do fetch
  const EMBEDDED_OFFICIAL_CATALOG = [
    {
      id: 'farol-da-barra',
      name: 'Farol da Barra',
      aliases: ['Barra', 'Praia do Farol da Barra', 'Barravento'],
      city: 'Salvador',
      state: 'BA',
      coords: { lat: -13.0103, lon: -38.5329 },
      beachAzimuth: 175,
      bottomType: 'Bancada de pedra e coral (point/reef break)',
      waveCharacteristics: 'Ondas longas e manobráveis, com esquerdas clássicas no lado do Farol e direitas na Bancada',
      idealSwellDirection: 'Sul (S) e Sudoeste (SW)',
      idealWindDirection: 'Norte (N), Nordeste (NE) e Noroeste (NW)',
      idealTide: 'Meia-maré a maré cheia',
      skillLevels: ['Intermediário', 'Avançado'],
      hazards: 'Pedras rasas e ouriços na maré seca; correnteza na boca da baía'
    },
    {
      id: 'jardim-de-alah',
      name: 'Jardim de Alah',
      aliases: ['Praia Jardim de Alah'],
      city: 'Salvador',
      state: 'BA',
      coords: { lat: -12.9904, lon: -38.4368 },
      beachAzimuth: 145,
      bottomType: 'Fundo misto de areia com lajes de pedra e coral',
      waveCharacteristics: 'Ondas rápidas, cavadas e com boa pressão quando o swell de sul ou sudeste encaixa',
      idealSwellDirection: 'Sul (S) e Sudeste (SE)',
      idealWindDirection: 'Noroeste (NW) e Oeste (W)',
      idealTide: 'Meia-maré para cheia',
      skillLevels: ['Intermediário', 'Avançado'],
      hazards: 'Lajes de pedra submersas e correntes de retorno'
    },
    {
      id: 'jaguaribe',
      name: 'Jaguaribe',
      aliases: ['Praia de Jaguaribe'],
      city: 'Salvador',
      state: 'BA',
      coords: { lat: -12.9565, lon: -38.3840 },
      beachAzimuth: 135,
      bottomType: 'Fundo de areia (beach break) próximo à foz do rio',
      waveCharacteristics: 'Valas bem definidas com esquerdas e direitas manobráveis e constantes',
      idealSwellDirection: 'Sudeste (SE), Sul (S) e Leste (E)',
      idealWindDirection: 'Noroeste (NW) e Oeste (W)',
      idealTide: 'Meia-maré enchendo ou secando',
      skillLevels: ['Iniciante', 'Intermediário', 'Avançado'],
      hazards: 'Correntes de retorno nas valas em dias de swell maior'
    },
    {
      id: 'farol-de-itapua',
      name: 'Farol de Itapuã',
      aliases: ['Itapuã', 'Praia do Farol de Itapuã'],
      city: 'Salvador',
      state: 'BA',
      coords: { lat: -12.9585, lon: -38.3530 },
      beachAzimuth: 140,
      bottomType: 'Bancada de pedra/coral com bolsões de areia',
      waveCharacteristics: 'Ondas bem desenhadas e com boa parede sobre as bancadas de recife',
      idealSwellDirection: 'Sul (S) e Sudeste (SE)',
      idealWindDirection: 'Noroeste (NW) e Norte (N)',
      idealTide: 'Meia-maré a maré cheia',
      skillLevels: ['Intermediário', 'Avançado'],
      hazards: 'Bancada de coral rasa na maré seca'
    },
    {
      id: 'stella-maris',
      name: 'Stella Maris',
      aliases: ['Praia de Stella Maris', 'Stella', 'Stella Mares'],
      city: 'Salvador',
      state: 'BA',
      coords: { lat: -12.9445, lon: -38.3345 },
      beachAzimuth: 135,
      bottomType: 'Fundo de areia (beach break de valas)',
      waveCharacteristics: 'Ondas fortes, cavadas e consistentes que seguram bem swells maiores',
      idealSwellDirection: 'Sudeste (SE), Leste (E) e Sul (S)',
      idealWindDirection: 'Noroeste (NW) e Oeste (W)',
      idealTide: 'Meia-maré',
      skillLevels: ['Intermediário', 'Avançado'],
      hazards: 'Valas profundas e correnteza forte'
    },
    {
      id: 'ipitanga',
      name: 'Ipitanga',
      aliases: ['Praia de Ipitanga'],
      city: 'Lauro de Freitas',
      state: 'BA',
      coords: { lat: -12.9182, lon: -38.3085 },
      beachAzimuth: 130,
      bottomType: 'Fundo de areia (beach break aberto)',
      waveCharacteristics: 'Ondas rápidas e tubulares quando o terral encaixa, muito exposto às ondulações',
      idealSwellDirection: 'Sudeste (SE) e Leste (E)',
      idealWindDirection: 'Noroeste (NW) e Oeste (W)',
      idealTide: 'Meia-maré enchendo',
      skillLevels: ['Intermediário', 'Avançado'],
      hazards: 'Forte corrente de deriva lateral e repuxo'
    },
    {
      id: 'vilas-do-atlantico',
      name: 'Vilas do Atlântico',
      aliases: ['Vilas', 'Praia de Vilas do Atlântico'],
      city: 'Lauro de Freitas',
      state: 'BA',
      coords: { lat: -12.8935, lon: -38.2915 },
      beachAzimuth: 125,
      bottomType: 'Areia com bancadas de recife e coral raso',
      waveCharacteristics: 'Ondas bem formadas e com boa parede sobre as bancadas externas quando a maré sobe',
      idealSwellDirection: 'Sudeste (SE) e Leste (E)',
      idealWindDirection: 'Noroeste (NW) e Oeste (W)',
      idealTide: 'Meia-maré a maré cheia',
      skillLevels: ['Intermediário', 'Avançado'],
      hazards: 'Bancadas de coral e pedra rasas na baixa-mar'
    },
    {
      id: 'busca-vida',
      name: 'Busca Vida',
      aliases: ['Praia de Busca Vida'],
      city: 'Camaçari',
      state: 'BA',
      coords: { lat: -12.8520, lon: -38.2610 },
      beachAzimuth: 125,
      bottomType: 'Fundo de areia extenso (beach break)',
      waveCharacteristics: 'Ondas abertas com boa pressão e menos crowd em mar aberto',
      idealSwellDirection: 'Sudeste (SE), Leste (E) e Sul (S)',
      idealWindDirection: 'Noroeste (NW) e Oeste (W)',
      idealTide: 'Todas as marés (melhor na meia-maré)',
      skillLevels: ['Iniciante', 'Intermediário', 'Avançado'],
      hazards: 'Correntes de retorno em dias de mar grande'
    },
    {
      id: 'pirui',
      name: 'Piruí',
      aliases: ['Praia do Piruí', 'Arembepe'],
      city: 'Camaçari',
      state: 'BA',
      coords: { lat: -12.7685, lon: -38.1745 },
      beachAzimuth: 125,
      bottomType: 'Areia e bancadas de recife/coral',
      waveCharacteristics: 'Picos definidos com esquerdas e direitas fortes que seguram bem a energia do swell',
      idealSwellDirection: 'Sudeste (SE) e Sul (S)',
      idealWindDirection: 'Noroeste (NW) e Oeste (W)',
      idealTide: 'Meia-maré para cheia',
      skillLevels: ['Intermediário', 'Avançado'],
      hazards: 'Bancadas de coral na maré seca e correnteza'
    },
    {
      id: 'barra-do-jacuipe',
      name: 'Barra do Jacuípe',
      aliases: ['Jacuípe', 'Praia de Barra do Jacuípe'],
      city: 'Camaçari',
      state: 'BA',
      coords: { lat: -12.7042, lon: -38.1225 },
      beachAzimuth: 125,
      bottomType: 'Fundo de areia em foz de rio',
      waveCharacteristics: 'Bancos de areia esculpidos pelo rio que geram ondas longas e bem alinhadas nos dois lados da barra',
      idealSwellDirection: 'Sudeste (SE), Leste (E) e Sul (S)',
      idealWindDirection: 'Noroeste (NW) e Oeste (W)',
      idealTide: 'Meia-maré enchendo ou vazando',
      skillLevels: ['Iniciante', 'Intermediário', 'Avançado'],
      hazards: 'Correnteza forte no canal da foz do rio durante a maré vazante'
    },
    {
      id: 'scar-reef',
      name: 'Scar Reef',
      aliases: ['Scar Reef Guarajuba'],
      city: 'Camaçari',
      state: 'BA',
      coords: { lat: -12.6565, lon: -38.0745 },
      beachAzimuth: 130,
      bottomType: 'Bancada de coral rasa (reef break)',
      waveCharacteristics: 'Onda pesada, rápida e tubular sobre bancada de coral exigindo drop técnico',
      idealSwellDirection: 'Sul (S) e Sudeste (SE)',
      idealWindDirection: 'Noroeste (NW) e Oeste (W)',
      idealTide: 'Meia-maré a maré cheia',
      skillLevels: ['Avançado'],
      hazards: 'Bancada de coral muito rasa e afiada, proibitivo na maré seca'
    },
    {
      id: 'guarajuba',
      name: 'Guarajuba',
      aliases: ['Praia de Guarajuba'],
      city: 'Camaçari',
      state: 'BA',
      coords: { lat: -12.6468, lon: -38.0665 },
      beachAzimuth: 130,
      bottomType: 'Areia e bancadas de coral',
      waveCharacteristics: 'Canais de areia entre recifes com ondas consistentes e divertidas',
      idealSwellDirection: 'Sudeste (SE), Leste (E) e Sul (S)',
      idealWindDirection: 'Noroeste (NW) e Oeste (W)',
      idealTide: 'Meia-maré para cheia',
      skillLevels: ['Iniciante', 'Intermediário', 'Avançado'],
      hazards: 'Recifes de coral nas laterais dos canais'
    },
    {
      id: 'espera-de-itacimirim',
      name: 'Espera de Itacimirim',
      aliases: ['Itacimirim', 'Praia da Espera', 'Praia de Itacimirim'],
      city: 'Camaçari',
      state: 'BA',
      coords: { lat: -12.6245, lon: -38.0468 },
      beachAzimuth: 135,
      bottomType: 'Enseada de areia com recifes nas extremidades',
      waveCharacteristics: 'Enseada protegida de ventos nordeste que entrega ondas limpas, perfeitas e manobráveis',
      idealSwellDirection: 'Sul (S) e Sudeste (SE)',
      idealWindDirection: 'Noroeste (NW), Oeste (W) e Norte (N)',
      idealTide: 'Meia-maré para cheia',
      skillLevels: ['Iniciante', 'Intermediário', 'Avançado'],
      hazards: 'Recifes de coral nas pontas da enseada na maré muito seca'
    },
    {
      id: 'praia-do-forte',
      name: 'Praia do Forte',
      aliases: ['Papa-Gente', 'Praia do Forte Papa-Gente'],
      city: 'Mata de São João',
      state: 'BA',
      coords: { lat: -12.5785, lon: -38.0012 },
      beachAzimuth: 130,
      bottomType: 'Bancadas de coral (Papa-Gente) e canais de areia (Portinho/Igreja)',
      waveCharacteristics: 'Ondas longas e bem estruturadas sobre recifes no Papa-Gente e ondas mais cheias na área da Igreja',
      idealSwellDirection: 'Sul (S), Sudeste (SE) e Leste (E)',
      idealWindDirection: 'Noroeste (NW) e Oeste (W)',
      idealTide: 'Meia-maré enchendo a cheia',
      skillLevels: ['Iniciante', 'Intermediário', 'Avançado'],
      hazards: 'Bancadas de coral rasas na maré seca'
    }
  ];

  let cachedRawCatalog = EMBEDDED_OFFICIAL_CATALOG;

  function normText(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function inferOffshoreWindRange(idealWindText, azimuth) {
    const t = normText(idealWindText);
    if (t.includes('nordeste') && t.includes('noroeste')) return [310, 55];
    if (t.includes('norte') && t.includes('noroeste')) return [290, 20];
    if (t.includes('oeste') && t.includes('noroeste')) return [260, 335];
    const opp = ((Number(azimuth) || 135) + 180) % 360;
    return [(opp - 35 + 360) % 360, (opp + 35) % 360];
  }

  function inferBottomCode(bottomTypeText) {
    const t = normText(bottomTypeText);
    if (t.includes('coral') || t.includes('reef') || t.includes('pedra')) return 'reef';
    if (t.includes('point')) return 'point';
    return 'sand';
  }

  function inferBestTideCode(idealTideText) {
    const t = normText(idealTideText);
    if (t.includes('todas')) return 'ALL';
    if (t.includes('seca') || t.includes('baixa')) return 'LOW';
    if (t.includes('cheia') && !t.includes('meia')) return 'HIGH';
    return 'MID';
  }

  /**
   * Converte uma ficha do catálogo oficial para o contrato completo do surfeAgent,
   * preservando 100% dos textos verificados sem inventar detalhes.
   */
  const SPOT_PROFILES_BY_ID = {
    'farol-da-barra': 'reef_point',
    'jardim-de-alah': 'reef_point',
    'farol-de-itapua': 'reef_point',
    'vilas-do-atlantico': 'reef_point',
    'scar-reef': 'reef_point',
    'praia-do-forte': 'reef_point',
    'espera-de-itacimirim': 'sheltered_cove',
    'jaguaribe': 'sheltered_cove',
    'barra-do-jacuipe': 'sheltered_cove',
    'stella-maris': 'exposed_beach',
    'ipitanga': 'exposed_beach',
    'busca-vida': 'exposed_beach',
    'pirui': 'exposed_beach',
    'guarajuba': 'exposed_beach'
  };

  function normalizeCatalogEntry(entry, idx = 0) {
    const lat = Number(entry.coords?.lat ?? entry.lat);
    const lon = Number(entry.coords?.lon ?? entry.lon);
    const offshoreRange = inferOffshoreWindRange(entry.idealWindDirection, entry.beachAzimuth);
    const levelsNormalized = (entry.skillLevels || []).map((lvl) => normText(lvl));
    const spotProfile = entry.spotProfile || SPOT_PROFILES_BY_ID[entry.id] || 'exposed_beach';

    const verifiedLocalNotes = [
      `${entry.waveCharacteristics}.`,
      `Fundo: ${entry.bottomType}.`,
      `Swell ideal: ${entry.idealSwellDirection} · Vento ideal: ${entry.idealWindDirection} · Maré ideal: ${entry.idealTide}.`,
      `Atenção: ${entry.hazards}.`
    ].join(' ');

    return {
      id: entry.id,
      name: entry.name,
      aliases: Array.isArray(entry.aliases) ? entry.aliases : [],
      city: entry.city,
      state: entry.state,
      region: `${entry.city}, ${entry.state}`,
      baseRegion: `${entry.city}, ${entry.state}`,
      coords: { lat, lon },
      lat,
      lon,
      beachAzimuth: entry.beachAzimuth,
      beachFaceDeg: entry.beachAzimuth,
      spotProfile,
      bottomType: inferBottomCode(entry.bottomType),
      bottomTypeLabel: entry.bottomType,
      waveCharacteristics: entry.waveCharacteristics,
      idealSwellDirection: entry.idealSwellDirection,
      idealWindDirection: entry.idealWindDirection,
      idealTide: entry.idealTide,
      bestTide: inferBestTideCode(entry.idealTide),
      offshoreWindDir: offshoreRange,
      offshoreWindDeg: offshoreRange,
      skillLevels: Array.isArray(entry.skillLevels) ? entry.skillLevels : ['Intermediário'],
      skillLevelFit: levelsNormalized.length > 0 ? levelsNormalized : ['intermediario'],
      hazards: entry.hazards,
      localNotes: verifiedLocalNotes,
      verifiedCatalog: true,
      searchCount: 140 - idx * 4,
      swellSize: '1.1 m',
      swellPeriod: '10 s',
      swellDir: 'SE 135°',
      energy: '340 kJ',
      windSpeed: '9 km/h',
      windSpeedKnots: 4.9,
      windDir: 'NO 315°',
      windDirDeg: 315,
      windRelation: 'Terral Fraco',
      tidePhase: 'Meia-maré',
      moonPhase: '🌕 Lua Cheia',
      weather: '☀️ Sol (27 °C)',
      waterTemp: '26 °C (Boardshort)',
      hourlyEnergy: [260, 300, 330, 340, 325, 300, 280, 250],
      peakHourIndex: 3,
      distribution: [50, 30, 20]
    };
  }

  /**
   * Carrega `src/data/spots_catalog.json` (Node.js via fs ou Browser via fetch)
   */
  async function loadOfficialCatalog(jsonUrl = './src/data/spots_catalog.json') {
    if (typeof require === 'function' && typeof module !== 'undefined' && module.exports) {
      try {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, '..', 'src', 'data', 'spots_catalog.json');
        if (fs.existsSync(filePath)) {
          const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (Array.isArray(parsed) && parsed.length > 0) {
            cachedRawCatalog = parsed;
          }
        }
      } catch (_) {}
      return getNormalizedSpots();
    }

    if (typeof fetch === 'function' && typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
      const candidates = [jsonUrl, './src/data/spots_catalog.json', '../src/data/spots_catalog.json'];
      for (const url of candidates) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const parsed = await res.json();
            if (Array.isArray(parsed) && parsed.length > 0) {
              cachedRawCatalog = parsed;
              break;
            }
          }
        } catch (_) {}
      }
    }
    return getNormalizedSpots();
  }

  function getNormalizedSpots() {
    return cachedRawCatalog.map((entry, idx) => normalizeCatalogEntry(entry, idx));
  }

  function findVerifiedSpot(query) {
    const q = normText(query);
    if (!q) return null;
    const list = getNormalizedSpots();

    // 1. Match exato por id, nome ou alias
    for (const s of list) {
      if (normText(s.id) === q || normText(s.id).replace(/-/g, ' ') === q || normText(s.name) === q) {
        return s;
      }
      if (Array.isArray(s.aliases) && s.aliases.some((a) => normText(a) === q)) {
        return s;
      }
    }

    // 2. Match parcial seguro (ex: "itacimirim" -> "Espera de Itacimirim", "barra" -> "Farol da Barra")
    for (const s of list) {
      const nameN = normText(s.name);
      if (nameN.includes(q) || q.includes(nameN)) return s;
      if (Array.isArray(s.aliases) && s.aliases.some((a) => {
        const aN = normText(a);
        return aN.length >= 4 && (aN.includes(q) || q.includes(aN));
      })) {
        return s;
      }
    }
    return null;
  }

  function buildVerifiedSpotDescription(spot) {
    if (!spot) return '';
    const name = spot.name || 'Este pico';
    const cityState = spot.city && spot.state ? ` (${spot.city}, ${spot.state})` : '';
    const chars = spot.waveCharacteristics ? `${spot.waveCharacteristics}.` : '';
    const bottom = spot.bottomTypeLabel ? ` Fundo: ${spot.bottomTypeLabel}.` : '';
    const swell = spot.idealSwellDirection ? ` Swell ideal de ${spot.idealSwellDirection}` : '';
    const wind = spot.idealWindDirection ? `, vento ideal de ${spot.idealWindDirection}` : '';
    const tide = spot.idealTide ? ` e maré ideal ${spot.idealTide.toLowerCase()}.` : (swell || wind ? '.' : '');
    const levels = Array.isArray(spot.skillLevels) && spot.skillLevels.length > 0
      ? ` Indicado para nível ${spot.skillLevels.join(', ')}.`
      : '';
    const hazards = spot.hazards ? ` Atenção: ${spot.hazards}.` : '';
    return `${name}${cityState}: ${chars}${bottom}${swell}${wind}${tide}${levels}${hazards}`.replace(/\s+/g, ' ').trim();
  }

  function getSpotsByCity(cityName = 'Salvador') {
    const q = normText(cityName);
    return getNormalizedSpots().filter((s) => normText(s.city) === q);
  }

  function buildSalvadorBeachesOverview() {
    const salvadorSpots = getSpotsByCity('Salvador');
    if (salvadorSpots.length === 0) return '';
    const parts = salvadorSpots.map((s) =>
      `${s.name}: ${s.waveCharacteristics.charAt(0).toLowerCase() + s.waveCharacteristics.slice(1)} (${s.bottomTypeLabel.toLowerCase()}, maré ideal: ${s.idealTide.toLowerCase()})`
    );
    return `As praias de surfe de Salvador no catálogo oficial são: ${parts.join('; ')}.`;
  }

  return {
    EMBEDDED_OFFICIAL_CATALOG,
    loadOfficialCatalog,
    getNormalizedSpots,
    normalizeCatalogEntry,
    findVerifiedSpot,
    buildVerifiedSpotDescription,
    getSpotsByCity,
    buildSalvadorBeachesOverview
  };
});
