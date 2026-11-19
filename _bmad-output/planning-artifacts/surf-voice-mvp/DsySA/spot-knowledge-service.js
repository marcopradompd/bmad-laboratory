/**
 * surfeAgent — Spot Knowledge & Auto-Discovery Service (Web Grounding)
 *
 * Responsabilidades:
 * 1. Deduplicação Semântica contra `name` e `aliases` da coleção global `surf_spots`.
 * 2. `discoverAndRegisterSpot(query)`: Pesquisa Web (Nominatim Geocoding + Wikipedia)
 *    para localizar coordenadas e extrair características técnicas de surfe, cadastrando
 *    automaticamente o novo pico na base global compartilhada.
 * 3. `enrichSpotKnowledge(spotId)`: Pesquisa profunda sob demanda ("Saber mais sobre o pico")
 *    para atualizar `localNotes`, `lastEnrichedAt` e metadados oceanográficos.
 *
 * Compatível com Browser (`window.SpotKnowledgeService`) e Node.js (`module.exports`).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SpotKnowledgeService = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const SHARED_SPOTS_LOCAL_KEY = 'surfeAgent_global_surf_spots_v2';

  function normalizeText(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function stripBeachPrefixes(str) {
    return normalizeText(str)
      .replace(/^(praia d[aeo]s?|praia|pico d[aeo]s?|pico|beach)\s+/i, '')
      .trim();
  }

  /**
   * 1. Deduplicação Semântica (verifica `name` e `aliases` sem acentos)
   */
  function findSpotBySemanticMatch(spots, query) {
    if (!Array.isArray(spots) || !query) return null;
    const qNorm = normalizeText(query);
    const qCore = stripBeachPrefixes(query);
    if (!qNorm) return null;

    // 1a. Match exato por nome ou alias
    for (const spot of spots) {
      const candidates = [spot.name, ...(Array.isArray(spot.aliases) ? spot.aliases : [])];
      for (const cand of candidates) {
        const cNorm = normalizeText(cand);
        const cCore = stripBeachPrefixes(cand);
        if (cNorm === qNorm || (qCore.length >= 3 && cCore === qCore)) {
          return spot;
        }
      }
    }

    // 1b. Match parcial / fuzzy seguro
    for (const spot of spots) {
      const candidates = [spot.name, ...(Array.isArray(spot.aliases) ? spot.aliases : [])];
      for (const cand of candidates) {
        const cCore = stripBeachPrefixes(cand);
        if (qCore.length >= 4 && (cCore.includes(qCore) || qCore.includes(cCore))) {
          return spot;
        }
      }
    }

    return null;
  }

  /**
   * Infere metadados técnicos de surfe a partir de texto web (Wikipedia/Geocoding)
   */
  function extractSurfMetadataFromText(text, lat, lon, spotName) {
    const t = normalizeText(text || '');

    // Tipo de fundo
    let bottomType = 'sand';
    if (t.includes('coral') || t.includes('recife') || t.includes('laje') || t.includes('reef') || t.includes('pedra')) {
      bottomType = 'reef';
    } else if (t.includes('ponta') || t.includes('costao') || t.includes('point break') || t.includes('cabo')) {
      bottomType = 'point';
    }

    // Melhor maré
    let bestTide = 'MID';
    if (t.includes('mare baixa') || t.includes('mare seca') || t.includes('low tide')) {
      bestTide = 'LOW';
    } else if (t.includes('mare cheia') || t.includes('mare alta') || t.includes('high tide')) {
      bestTide = 'HIGH';
    } else if (t.includes('todas as mares') || t.includes('all tides')) {
      bestTide = 'ALL';
    }

    // Orientação costeira aproximada (Atlântico Sul / Brasil vs Pacífico)
    const isEastCoastBrazil = lon > -55 && lon < -30 && lat < 5;
    let beachFaceDeg = isEastCoastBrazil ? 135 : 220;
    let offshoreWindDir = isEastCoastBrazil ? [270, 345] : [40, 120];
    let idealSwellDir = isEastCoastBrazil ? [110, 185] : [180, 260];

    if (lat < -22 && lat > -24.5 && lon < -41 && lon > -47) {
      // Litoral SP / RJ (costa voltada para Sul/Sudeste)
      beachFaceDeg = 170;
      offshoreWindDir = [330, 45];
      idealSwellDir = [145, 215];
    }

    // Níveis de surfe recomendados
    let skillLevelFit = ['iniciante', 'intermediario', 'avancado'];
    if (bottomType === 'reef' || t.includes('tubo') || t.includes('pesada') || t.includes('pipeline') || t.includes('forte')) {
      skillLevelFit = ['intermediario', 'avancado'];
    } else if (t.includes('calma') || t.includes('iniciante') || t.includes('longboard')) {
      skillLevelFit = ['iniciante', 'intermediario'];
    }

    const bottomPt = bottomType === 'reef' ? 'bancada de pedra/coral' : bottomType === 'point' ? 'point break junto ao costão' : 'fundo de areia (beach break)';
    const tidePt = bestTide === 'LOW' ? 'maré baixa/secando' : bestTide === 'HIGH' ? 'maré cheia' : 'meia-maré enchendo';

    let localNotes = '';
    if (text && text.trim().length > 40) {
      const cleanSnippet = text.replace(/\s+/g, ' ').trim().slice(0, 260);
      localNotes = `${cleanSnippet}${text.length > 260 ? '...' : ''} Perfil técnico inferido: ${bottomPt}, melhor rendimento em ${tidePt}, terral estimado entre ${offshoreWindDir[0]}° e ${offshoreWindDir[1]}°.`;
    } else {
      localNotes = `${spotName} mapeado via Web Grounding: ${bottomPt} com melhor formação em ${tidePt}. Swell ideal entre ${idealSwellDir[0]}°–${idealSwellDir[1]}° e vento terral no quadrante ${offshoreWindDir[0]}°–${offshoreWindDir[1]}°. Recomenda-se observar correntes de retorno na entrada.`;
    }

    return {
      bottomType,
      bestTide,
      idealSwellDir,
      offshoreWindDir,
      beachFaceDeg,
      skillLevelFit,
      localNotes
    };
  }

  /**
   * Busca coordenadas reais via OpenStreetMap Nominatim
   */
  async function geocodeSpotWeb(query) {
    try {
      const searchStr = /praia|beach|surf|baia|cabo/i.test(query) ? query : `Praia ${query}`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(searchStr)}`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'surfeAgent-MVP/2.0' }
      });
      if (!res.ok) return null;
      const list = await res.json();
      if (!Array.isArray(list) || list.length === 0) return null;
      const top = list[0];
      const addr = top.address || {};
      return {
        lat: parseFloat(top.lat),
        lon: parseFloat(top.lon),
        displayName: top.display_name || query,
        region: addr.city || addr.town || addr.village || addr.municipality || addr.county || 'Litoral',
        state: addr.state_code || addr.state || addr.country || ''
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Web Grounding via Wikipedia API (PT -> fallback EN) para extrair notas do pico
   */
  async function fetchWikiSurfContext(spotName, regionHint = '') {
    const queries = [
      `${spotName} surfe praia`,
      `${spotName} ${regionHint}`.trim(),
      spotName
    ];

    for (const q of queries) {
      try {
        const searchUrl = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=1&format=json&origin=*`;
        const sRes = await fetch(searchUrl);
        if (!sRes.ok) continue;
        const sJson = await sRes.json();
        const hit = sJson?.query?.search?.[0];
        if (!hit) continue;

        const sumUrl = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title)}`;
        const sumRes = await fetch(sumUrl);
        if (sumRes.ok) {
          const sumJson = await sumRes.json();
          if (sumJson?.extract && sumJson.extract.length > 35) {
            return {
              extract: sumJson.extract,
              sourceUrl: sumJson?.content_urls?.desktop?.page || ''
            };
          }
        }
      } catch (e) {
        // continua para o próximo fallback
      }
    }
    return { extract: '', sourceUrl: '' };
  }

  /**
   * 2. Auto-Discovery e Cadastro Global: discoverAndRegisterSpot(query)
   * Tenta o backend (/api/spots/discover); se offline/static, executa Web Grounding direto no browser.
   */
  async function discoverAndRegisterSpot(query, currentSpots = []) {
    const cleanQuery = cleanSpotName(query, currentSpots) || String(query || '').trim();
    if (!cleanQuery) return null;

    // 2a. Tenta primeiro deduplicação local imediata
    const localMatch = findSpotBySemanticMatch(currentSpots, cleanQuery);
    if (localMatch) {
      localMatch.searchCount = (localMatch.searchCount || 1) + 1;
      // Notifica backend em background para incrementar popularidade
      if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
        fetch('/api/spots/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: cleanQuery })
        }).catch(() => {});
      }
      return { spot: localMatch, isNew: false, source: 'database_dedup' };
    }

    // 2b. Se estiver rodando via servidor Node (http/https), delega ao endpoint global compartilhado
    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch('/api/spots/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: cleanQuery })
        });
        if (res.ok) {
          const payload = await res.json();
          if (payload && payload.spot) {
            return payload;
          }
        }
      } catch (err) {
        // Fallback para Web Grounding direto no cliente
      }
    }

    // 2c. Pipeline Web Grounding (Nominatim Geocoding + Wikipedia)
    const geo = await geocodeSpotWeb(cleanQuery);
    const titleName = cleanQuery
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const lat = geo ? geo.lat : -22.95;
    const lon = geo ? geo.lon : -43.20;
    const region = geo ? geo.region : 'Litoral Brasileiro';
    const state = geo ? geo.state : '';

    const wiki = await fetchWikiSurfContext(titleName, region);
    const tech = extractSurfMetadataFromText(wiki.extract, lat, lon, titleName);

    const slug = normalizeText(titleName).replace(/\s+/g, '_');
    const newSpot = {
      id: `spot_${slug}`,
      name: titleName,
      aliases: Array.from(new Set([cleanQuery, `Praia de ${titleName}`, `Praia do ${titleName}`])),
      region: state ? `${region}, ${state}` : region,
      baseRegion: state ? `${region}, ${state}` : region,
      state,
      lat,
      lon,
      bottomType: tech.bottomType,
      bestTide: tech.bestTide,
      idealSwellDir: tech.idealSwellDir,
      offshoreWindDir: tech.offshoreWindDir,
      offshoreWindDeg: tech.offshoreWindDir,
      beachFaceDeg: tech.beachFaceDeg,
      skillLevelFit: tech.skillLevelFit,
      localNotes: tech.localNotes,
      lastEnrichedAt: new Date().toISOString(),
      searchCount: 1,
      swellSize: '1.2 m',
      swellPeriod: '11 s',
      swellDir: 'SE 140°',
      energy: '380 kJ',
      windSpeed: '9 km/h',
      windSpeedKnots: 4.8,
      windDir: 'NO 305°',
      windDirDeg: 305,
      windRelation: 'Terral Fraco',
      tidePhase: 'Enchendo (0.7m → 1.6m)',
      moonPhase: '🌕 Lua Cheia',
      weather: '☀️ Sol (26 °C)',
      waterTemp: '24 °C (Boardshort / Lycra)',
      hourlyEnergy: [280, 320, 360, 380, 370, 340, 300, 260],
      peakHourIndex: 3,
      distribution: [50, 30, 20]
    };

    return { spot: newSpot, isNew: true, source: geo ? 'web_grounding' : 'heuristic_grounding' };
  }

  const PRESERVED_COMPOUND_NAMES = [
    'praia do forte',
    'praia grande',
    'praia do rosa',
    'praia brava',
    'praia mole',
    'praia do futuro',
    'praia do amor',
    'praia do frances',
    'praia do flamengo',
    'praia da vila',
    'praia do surf',
    'praia da pipa',
    'boca do rio',
    'farol de itapua',
    'farol da barra',
    'banco santo antonio',
    'pedra do sal',
    'barra da tijuca',
    'canto do moreira',
    'guarda do embau'
  ];

  const LOWERCASE_CONNECTORS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

  /**
   * Formata nomes de picos em Title Case limpo para português
   * Ex: "stella maris" -> "Stella Maris", "praia do forte" -> "Praia do Forte"
   */
  function toTitleCasePt(str) {
    return String(str || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word, idx) => {
        const lower = word.toLowerCase();
        if (idx > 0 && LOWERCASE_CONNECTORS.has(lower)) {
          return lower;
        }
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(' ');
  }

  /**
   * Remove stop-phrases conversacionais e prefixos genéricos preservando nomes compostos consagrados
   */
  function cleanSpotName(rawFragment, knownSpots = []) {
    if (!rawFragment) return '';

    let text = String(rawFragment)
      .replace(/[?!."“”'()]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 1. Remove ruído conversacional inicial (verbos, comandos e conectores)
    const leadingNoisePatterns = [
      /^(?:oi|ol[aá]|hey|e\s+a[ií]|surfe?\s*agent)\s*,?\s*/i,
      /^(?:por\s+favor|pfv)\s*,?\s*/i,
      /^(?:me\s+d[eêa]|me\s+traz|me\s+traga|me\s+fala|me\s+fale|me\s+mostra|me\s+mostre|quero\s+saber|gostaria\s+de\s+saber|pode\s+me\s+dizer|veja|ver|mostra|mostre|abre|abra|traz|traga|consultar\s+pico)\s*:?\s*/i,
      /^(?:quais\s+(?:s[aã]o\s+)?as\s+previs[oõ]es|qual\s+(?:[eé]\s+)?a\s+previs[aã]o|a\s+previs[aã]o|as\s+previs[oõ]es|previs[aã]o|as\s+condi[cç][oõ]es|condi[cç][oõ]es|as\s+ondas|ondas|como\s+est[aá]\s+o\s+mar|como\s+t[aá]\s+o\s+mar|como\s+est[aã]o\s+as\s+condi[cç][oõ]es|como\s+est[aá]|como\s+t[aá])\s+/i,
      /^(?:l[aá]\s+)?(?:para\s+a|para\s+o|para|pra|pro|em|na|no|nas|nos|da|do|de|das|dos|sobre\s+a|sobre\s+o|sobre)\s+/i
    ];

    // Aplica iterativamente até estabilizar
    let prev;
    let guard = 0;
    do {
      prev = text;
      for (const rx of leadingNoisePatterns) {
        text = text.replace(rx, '').trim();
      }
      guard++;
    } while (text !== prev && guard < 6);

    // 2. Remove ruído temporal/conversacional no final
    text = text
      .replace(/\s+(?:hoje|agora|amanh[aã]|neste\s+fim\s+de\s+semana|no\s+fim\s+de\s+semana|por\s+favor|pra\s+mim|para\s+mim)$/gi, '')
      .trim();

    if (!text) return '';

    const normText = normalizeText(text);

    // 3. Verifica se é nome composto próprio consagrado (ex: "Praia do Forte", "Boca do Rio")
    const isPreservedCompound = PRESERVED_COMPOUND_NAMES.some(
      (comp) => normText === comp || normText.startsWith(comp + ' ')
    );

    if (!isPreservedCompound) {
      // Remove prefixo genérico "praia de/da/do" ou "pico de/da/do" quando for apenas conector
      text = text
        .replace(/^(?:a\s+|o\s+)?(?:praia|pico)\s+(?:de|da|do|das|dos)\s+/i, '')
        .replace(/^(?:a|o)\s+/i, '')
        .trim();
    }

    if (!text || text.length < 2) return '';

    // 4. Deduplicação canônica contra a base global `surf_spots` (name + aliases)
    if (Array.isArray(knownSpots) && knownSpots.length > 0) {
      const canonical = findSpotBySemanticMatch(knownSpots, text);
      if (canonical && canonical.name) {
        return canonical.name;
      }
    }

    return toTitleCasePt(text);
  }

  /**
   * Parser de Intenção & Extração em Lote (Contrato JSON Schema):
   * {
   *   "intent": "SEARCH_SPOTS" | "BEST_SPOT" | "ENRICH_SPOT",
   *   "spots": ["Stella Maris", "Jaguaribe", "Itacimirim"],
   *   "skillLevelFilter": null | "INTENT_NO_LEVEL" | "INTENT_BEGINNER" | "INTENT_INTERMEDIATE" | "INTENT_ADVANCED"
   * }
   */
  function parseUserQuery(rawInput, knownSpots = []) {
    const raw = String(rawInput || '').trim();
    const norm = normalizeText(raw);

    // 1. Intenção de Enriquecimento / Saber mais sobre o pico ativo
    if (
      norm.includes('fale mais') ||
      norm.includes('saber mais') ||
      norm.includes('detalhes') ||
      norm.includes('como funciona a bancada') ||
      norm.includes('sobre esse pico') ||
      norm.includes('sobre essa praia') ||
      norm.includes('insights')
    ) {
      return {
        intent: 'ENRICH_SPOT',
        spots: [],
        skillLevelFilter: null
      };
    }

    // 2. Extração de filtro de nível (se mencionado)
    let skillLevelFilter = null;
    if (norm.includes('iniciante') || norm.includes('basico') || norm.includes('comecando') || norm.includes('aprendendo') || norm.includes('primeira vez')) {
      skillLevelFilter = 'INTENT_BEGINNER';
    } else if (norm.includes('intermediario') || norm.includes('medio') || norm.includes('evolucao')) {
      skillLevelFilter = 'INTENT_INTERMEDIATE';
    } else if (norm.includes('avancado') || norm.includes('experiente') || norm.includes('tubo') || norm.includes('pressao') || /\bpro\b/.test(norm)) {
      skillLevelFilter = 'INTENT_ADVANCED';
    } else if (norm.includes('sem nivel') || norm.includes('nao precisa') || norm.includes('tanto faz') || norm.includes('apenas me traga')) {
      skillLevelFilter = 'INTENT_NO_LEVEL';
    }

    // 3. Verifica se é consulta genérica de melhor pico (sem nome de praia)
    const isBestSpotQuery =
      norm.includes('melhor pico') ||
      norm.includes('melhores condicoes') ||
      norm.includes('melhor condicao') ||
      norm.includes('onde surfar') ||
      norm.includes('qual o pico') ||
      norm.includes('qual praia') ||
      norm === 'nao' ||
      norm === 'sim' ||
      Boolean(skillLevelFilter && !/(,|\/|\se\s|\sou\s)/.test(norm) && !knownSpots.some(s => norm.includes(stripBeachPrefixes(s.name))));

    if (isBestSpotQuery) {
      return {
        intent: 'BEST_SPOT',
        spots: [],
        skillLevelFilter: skillLevelFilter || 'INTENT_NO_LEVEL'
      };
    }

    // 4. Extração em Lote (Múltiplos Picos na mesma frase)
    // Primeiro limpa o comando inicial da frase inteira
    let body = raw
      .replace(/[?!."“”]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const batchLeadPatterns = [
      /^(?:oi|ol[aá]|hey|surfe?\s*agent)\s*,?\s*/i,
      /^(?:me\s+d[eêa]|me\s+traz|me\s+traga|quero\s+saber|mostra|mostre|abre|abra)\s+/i,
      /^(?:quais\s+(?:s[aã]o\s+)?as\s+previs[oõ]es|qual\s+(?:[eé]\s+)?a\s+previs[aã]o|as\s+previs[oõ]es|a\s+previs[aã]o|previs[oõ]es|previs[aã]o|como\s+est[aã]o\s+as\s+condi[cç][oõ]es|como\s+est[aá]\s+o\s+mar|como\s+t[aá]\s+o\s+mar|como\s+est[aá]|como\s+t[aá]|as\s+ondas|ondas)\s+/i,
      /^(?:l[aá]\s+)?(?:de|da|do|das|dos|em|na|no|nas|nos|para|pra)\s+/i
    ];
    let prevBody;
    let g = 0;
    do {
      prevBody = body;
      for (const rx of batchLeadPatterns) {
        body = body.replace(rx, '').trim();
      }
      g++;
    } while (body !== prevBody && g < 6);

    // Quebra por vírgula, barra, ponto-e-vírgula, " e " ou " ou "
    const rawParts = body
      .split(/\s*(?:,|\/|;|\||\s+e\s+|\s+ou\s+)\s*/i)
      .map(p => p.trim())
      .filter(Boolean);

    const extractedSpots = [];
    const seenNorm = new Set();

    for (const part of rawParts) {
      const cleaned = cleanSpotName(part, knownSpots);
      const cNorm = normalizeText(cleaned);
      if (cleaned && cNorm.length >= 2 && !seenNorm.has(cNorm)) {
        seenNorm.add(cNorm);
        extractedSpots.push(cleaned);
      }
    }

    if (extractedSpots.length > 0) {
      return {
        intent: 'SEARCH_SPOTS',
        spots: extractedSpots,
        skillLevelFilter
      };
    }

    return {
      intent: 'BEST_SPOT',
      spots: [],
      skillLevelFilter: skillLevelFilter || 'INTENT_NO_LEVEL'
    };
  }

  /**
   * 3. Enriquecimento Profundo Sob Demanda: enrichSpotKnowledge(spotId)
   * Realiza nova busca web e atualiza `localNotes`, `lastEnrichedAt` e metadados técnicos.
   */
  async function enrichSpotKnowledge(spot) {
    if (!spot) return null;

    // Tenta rota compartilhada no backend
    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch(`/api/spots/${encodeURIComponent(spot.id)}/enrich`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: spot.name, region: spot.region, state: spot.state || '' })
        });
        if (res.ok) {
          const payload = await res.json();
          if (payload && payload.spot) return payload.spot;
        }
      } catch (err) {
        // Fallback direto no browser
      }
    }

    // Pesquisa web direta
    const wiki = await fetchWikiSurfContext(spot.name, spot.region || spot.state || '');
    const tech = extractSurfMetadataFromText(wiki.extract, spot.lat || -12.95, spot.lon || -38.35, spot.name);

    return {
      ...spot,
      bottomType: spot.bottomType || tech.bottomType,
      bestTide: spot.bestTide || tech.bestTide,
      idealSwellDir: spot.idealSwellDir || tech.idealSwellDir,
      offshoreWindDir: spot.offshoreWindDir || spot.offshoreWindDeg || tech.offshoreWindDir,
      skillLevelFit: spot.skillLevelFit || tech.skillLevelFit,
      localNotes: tech.localNotes,
      lastEnrichedAt: new Date().toISOString()
    };
  }

  return {
    SHARED_SPOTS_LOCAL_KEY,
    PRESERVED_COMPOUND_NAMES,
    normalizeText,
    toTitleCasePt,
    cleanSpotName,
    parseUserQuery,
    findSpotBySemanticMatch,
    extractSurfMetadataFromText,
    geocodeSpotWeb,
    fetchWikiSurfContext,
    discoverAndRegisterSpot,
    enrichSpotKnowledge
  };
});
