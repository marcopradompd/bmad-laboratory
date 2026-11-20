/**
 * surfeAgent — User Settings Service (Persistent localStorage + Cascading Geo Filter + Drag-and-Drop Home Layout)
 *
 * Persiste na chave `surfeAgent_userSettings`:
 * {
 *   locationFilter: { state: "Todos", city: "Todas" },
 *   skillLevel: "Todos" | "Iniciante" | "Intermediário" | "Avançado",
 *   homeLayout: [ { id, label, type, visible }, ... ]
 * }
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SurfeAgentSettings = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SETTINGS_STORAGE_KEY = 'surfeAgent_userSettings';
  const ONBOARDING_STORAGE_KEY = 'surfeAgent_onboardingCompleted';

  const DEFAULT_HOME_LAYOUT = [
    { id: 'card_voice_assistant', label: 'SurfAgent Voice Assistant', type: 'card', visible: true },
    { id: 'card_condition_balance', label: 'Equilíbrio da Condição', type: 'card', visible: true },
    { id: 'acc_wave_height_period', label: 'ALTURA E PERÍODO DAS ONDAS', type: 'accordion', visible: true },
    { id: 'acc_wave_energy', label: 'ENERGIA DAS ONDAS (POTÊNCIA)', type: 'accordion', visible: true },
    { id: 'acc_surface_wind', label: 'VENTO DE SUPERFÍCIE MÉDIO', type: 'accordion', visible: true },
    { id: 'acc_tide_height', label: 'ALTURA DA MARÉ', type: 'accordion', visible: true },
    { id: 'acc_beach_compass', label: 'BÚSSOLA DE POSICIONAMENTO DA PRAIA', type: 'accordion', visible: true }
  ];

  // Mapa completo de estados litorâneos brasileiros (UF ↔ Nome + Cidades principais de surfe)
  const BRAZIL_SURF_LOCATIONS = {
    'Bahia': {
      uf: 'BA',
      cities: ['Salvador', 'Camaçari', 'Lauro de Freitas', 'Mata de São João', 'Itacaré', 'Ilhéus', 'Porto Seguro', 'Cairu (Morro de São Paulo)']
    },
    'Rio de Janeiro': {
      uf: 'RJ',
      cities: ['Rio de Janeiro', 'Saquarema', 'Niterói', 'Arraial do Cabo', 'Búzios', 'Cabo Frio', 'Paraty']
    },
    'São Paulo': {
      uf: 'SP',
      cities: ['São Sebastião', 'Ubatuba', 'Guarujá', 'Bertioga', 'Santos', 'Ilhabela', 'Peruíbe']
    },
    'Santa Catarina': {
      uf: 'SC',
      cities: ['Florianópolis', 'Garopaba', 'Imbituba', 'Guarda do Embaú', 'Balneário Camboriú', 'Itajaí', 'São Francisco do Sul']
    },
    'Pernambuco': {
      uf: 'PE',
      cities: ['Recife', 'Ipojuca (Porto de Galinhas)', 'Fernando de Noronha', 'Olinda', 'Cabo de Santo Agostinho']
    },
    'Ceará': {
      uf: 'CE',
      cities: ['Fortaleza', 'Caucaia', 'Aquiraz', 'Paracuru', 'Jijoca de Jericoacoara']
    },
    'Rio Grande do Norte': {
      uf: 'RN',
      cities: ['Natal', 'Tibau do Sul (Pipa)', 'Baía Formosa', 'Parnamirim']
    },
    'Paraíba': {
      uf: 'PB',
      cities: ['João Pessoa', 'Cabedelo', 'Conde', 'Baía da Traição']
    },
    'Espírito Santo': {
      uf: 'ES',
      cities: ['Vila Velha', 'Vitória', 'Guarapari', 'Linhares (Regência)', 'Serra']
    },
    'Paraná': {
      uf: 'PR',
      cities: ['Matinhos', 'Guaratuba', 'Pontal do Paraná', 'Ilha do Mel']
    },
    'Rio Grande do Sul': {
      uf: 'RS',
      cities: ['Torres', 'Tramandaí', 'Capão da Canoa', 'Xangri-Lá', 'Imbé']
    },
    'Alagoas': {
      uf: 'AL',
      cities: ['Maceió', 'Marechal Deodoro (Francês)', 'Maragogi', 'São Miguel dos Milagres']
    },
    'Sergipe': {
      uf: 'SE',
      cities: ['Aracaju', 'Barra dos Coqueiros', 'Estância']
    }
  };

  // Mapeamento auxiliar de picos conhecidos (para associar cidades mesmo quando o campo `city` não veio explícito)
  const SPOT_CITY_HINTS = {
    itacimirim: { state: 'Bahia', city: 'Camaçari' },
    guarajuba: { state: 'Bahia', city: 'Camaçari' },
    stella_maris: { state: 'Bahia', city: 'Salvador' },
    pedra_do_sal: { state: 'Bahia', city: 'Salvador' },
    jaguaribe: { state: 'Bahia', city: 'Salvador' },
    piata: { state: 'Bahia', city: 'Salvador' },
    barra_farol: { state: 'Bahia', city: 'Salvador' },
    praia_do_forte: { state: 'Bahia', city: 'Mata de São João' },
    vilas_do_atlantico: { state: 'Bahia', city: 'Lauro de Freitas' },
    ipitinga: { state: 'Bahia', city: 'Lauro de Freitas' },
    buraquinho: { state: 'Bahia', city: 'Lauro de Freitas' },
    maresias: { state: 'São Paulo', city: 'São Sebastião' },
    itamambuca: { state: 'São Paulo', city: 'Ubatuba' },
    arpoador: { state: 'Rio de Janeiro', city: 'Rio de Janeiro' },
    itauna_saquarema: { state: 'Rio de Janeiro', city: 'Saquarema' },
    saquarema: { state: 'Rio de Janeiro', city: 'Saquarema' },
    joaquina_sc: { state: 'Santa Catarina', city: 'Florianópolis' }
  };

  function normalizeText(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getDefaultSettings() {
    return {
      locationFilter: {
        state: 'Todos',
        city: 'Todas'
      },
      skillLevel: 'Todos',
      homeLayout: DEFAULT_HOME_LAYOUT.map(item => ({ ...item }))
    };
  }

  function sanitizeSettings(raw) {
    const def = getDefaultSettings();
    if (!raw || typeof raw !== 'object') return def;

    const state = raw.locationFilter && typeof raw.locationFilter.state === 'string' && raw.locationFilter.state.trim()
      ? raw.locationFilter.state.trim()
      : 'Todos';
    const city = state === 'Todos'
      ? 'Todas'
      : (raw.locationFilter && typeof raw.locationFilter.city === 'string' && raw.locationFilter.city.trim()
        ? raw.locationFilter.city.trim()
        : 'Todas');

    const validLevels = ['Todos', 'Iniciante', 'Intermediário', 'Avançado'];
    const skillLevel = validLevels.includes(raw.skillLevel) ? raw.skillLevel : 'Todos';

    // Reconcilia homeLayout preservando ordem salva e garantindo todos os 7 itens oficiais
    const savedLayout = Array.isArray(raw.homeLayout) ? raw.homeLayout : [];
    const byId = new Map(DEFAULT_HOME_LAYOUT.map(item => [item.id, item]));
    const mergedLayout = [];
    const seen = new Set();

    savedLayout.forEach(item => {
      if (item && byId.has(item.id) && !seen.has(item.id)) {
        const canonical = byId.get(item.id);
        mergedLayout.push({
          id: canonical.id,
          label: canonical.label,
          type: canonical.type,
          visible: item.visible !== false
        });
        seen.add(canonical.id);
      }
    });

    DEFAULT_HOME_LAYOUT.forEach(canonical => {
      if (!seen.has(canonical.id)) {
        mergedLayout.push({ ...canonical });
      }
    });

    return {
      locationFilter: { state, city },
      skillLevel,
      homeLayout: mergedLayout
    };
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return getDefaultSettings();
      return sanitizeSettings(JSON.parse(raw));
    } catch (e) {
      return getDefaultSettings();
    }
  }

  function saveSettings(settings) {
    const clean = sanitizeSettings(settings);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(clean));
      // Integração direta com o fluxo de voz: nível predefinido marca onboarding como concluído
      if (clean.skillLevel && clean.skillLevel !== 'Todos') {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      }
    } catch (e) {}
    return clean;
  }

  function mapSkillLevelToIntent(skillLevel) {
    switch (skillLevel) {
      case 'Iniciante': return 'INTENT_BEGINNER';
      case 'Intermediário': return 'INTENT_INTERMEDIATE';
      case 'Avançado': return 'INTENT_ADVANCED';
      default: return 'INTENT_NO_LEVEL';
    }
  }

  function mapIntentToSkillLevel(intent) {
    switch (intent) {
      case 'INTENT_BEGINNER':
      case 'iniciante': return 'Iniciante';
      case 'INTENT_INTERMEDIATE':
      case 'intermediario': return 'Intermediário';
      case 'INTENT_ADVANCED':
      case 'avancado': return 'Avançado';
      default: return 'Todos';
    }
  }

  function resolveStateName(stateOrUf) {
    if (!stateOrUf) return '';
    const norm = normalizeText(stateOrUf);
    for (const [stateName, info] of Object.entries(BRAZIL_SURF_LOCATIONS)) {
      if (normalizeText(stateName) === norm || normalizeText(info.uf) === norm) {
        return stateName;
      }
    }
    return '';
  }

  function inferSpotLocation(spot) {
    if (!spot) return { state: '', city: '' };
    const hint = SPOT_CITY_HINTS[spot.id];
    let state = resolveStateName(spot.state) || (hint ? hint.state : '');
    let city = spot.city || (hint ? hint.city : '');

    const combined = `${spot.baseRegion || ''} ${spot.region || ''} ${spot.name || ''}`;
    const normCombined = normalizeText(combined);

    if (!state) {
      for (const [stateName, info] of Object.entries(BRAZIL_SURF_LOCATIONS)) {
        const ufRegex = new RegExp(`\\b${info.uf.toLowerCase()}\\b`);
        if (normCombined.includes(normalizeText(stateName)) || ufRegex.test(normCombined)) {
          state = stateName;
          break;
        }
      }
    }

    if (!city && state && BRAZIL_SURF_LOCATIONS[state]) {
      for (const c of BRAZIL_SURF_LOCATIONS[state].cities) {
        const baseCity = c.split('(')[0].trim();
        if (normCombined.includes(normalizeText(baseCity))) {
          city = c;
          break;
        }
      }
    }

    return { state, city };
  }

  function getAvailableStates(spotsDatabase = []) {
    const statesSet = new Set(Object.keys(BRAZIL_SURF_LOCATIONS));
    (Array.isArray(spotsDatabase) ? spotsDatabase : []).forEach(spot => {
      const loc = inferSpotLocation(spot);
      if (loc.state) statesSet.add(loc.state);
    });
    return Array.from(statesSet);
  }

  function getAvailableCitiesForState(stateName, spotsDatabase = []) {
    if (!stateName || stateName === 'Todos') return [];
    const baseCities = (BRAZIL_SURF_LOCATIONS[stateName] && BRAZIL_SURF_LOCATIONS[stateName].cities) || [];
    const citiesSet = new Set(baseCities);

    (Array.isArray(spotsDatabase) ? spotsDatabase : []).forEach(spot => {
      const loc = inferSpotLocation(spot);
      if (loc.state === stateName && loc.city) {
        citiesSet.add(loc.city);
      }
    });

    return Array.from(citiesSet);
  }

  function filterSpotsByLocation(spotsList, locationFilter) {
    const list = Array.isArray(spotsList) ? spotsList : [];
    if (!locationFilter || !locationFilter.state || locationFilter.state === 'Todos') {
      return list;
    }

    const targetStateNorm = normalizeText(locationFilter.state);
    const targetCity = locationFilter.city && locationFilter.city !== 'Todas' && locationFilter.city !== 'Todos'
      ? locationFilter.city
      : null;
    const targetCityBaseNorm = targetCity ? normalizeText(targetCity.split('(')[0].trim()) : null;

    const stateMatches = list.filter(spot => {
      const loc = inferSpotLocation(spot);
      return normalizeText(loc.state) === targetStateNorm;
    });

    if (!targetCityBaseNorm) {
      return stateMatches;
    }

    const cityMatches = stateMatches.filter(spot => {
      const loc = inferSpotLocation(spot);
      const spotCityNorm = normalizeText((loc.city || '').split('(')[0].trim());
      const spotTextNorm = normalizeText(`${spot.name || ''} ${spot.baseRegion || ''} ${spot.region || ''}`);
      return spotCityNorm === targetCityBaseNorm || spotTextNorm.includes(targetCityBaseNorm);
    });

    return cityMatches;
  }

  return {
    SETTINGS_STORAGE_KEY,
    DEFAULT_HOME_LAYOUT,
    BRAZIL_SURF_LOCATIONS,
    getDefaultSettings,
    sanitizeSettings,
    loadSettings,
    saveSettings,
    mapSkillLevelToIntent,
    mapIntentToSkillLevel,
    inferSpotLocation,
    getAvailableStates,
    getAvailableCitiesForState,
    filterSpotsByLocation
  };
});
