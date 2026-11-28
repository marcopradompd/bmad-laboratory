/**
 * surfeAgent — Guardrail, Strict Grounding & Deterministic LLM Service
 *
 * Enforce:
 * - temperature: 0.1 (inferência determinística, sem criatividade)
 * - max_tokens: 250 (respostas curtas e objetivas para TTS)
 * - response_format: { type: "json_object" } (saída JSON estruturada obrigatória)
 * - Guardrail de Escopo Único (bloqueia imediatamente assuntos fora do surfe)
 * - Grounding Estrito no bloco [DADOS_DA_API] (zero alucinação)
 *
 * Compatível com Node.js (`module.exports`) e Browser (`window.SurfeAgentGuardrail`).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SurfeAgentGuardrail = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STANDARD_CLOSING =
    'Sempre que quiser responder ou fazer uma nova consulta, basta clicar novamente no botão Falar com o surfeAgent.';

  const OFF_TOPIC_REFUSAL =
    'Eu sou o surfeAgent e respondo apenas sobre previsão de ondas e picos de surfe. Diga o nome de uma praia ou seu nível para eu checar o mar.';

  // =========================================================================
  // 1. CONFIGURAÇÃO DETERMINÍSTICA DA API DA LLM
  // =========================================================================
  const LLM_DETERMINISTIC_CONFIG = Object.freeze({
    temperature: 0.1,
    max_tokens: 250,
    response_format: { type: 'json_object' }
  });

  // =========================================================================
  // 2. SYSTEM PROMPT BLINDADO (GUARDRAIL DE ESCOPO E GROUNDING)
  // =========================================================================
  const SURFEAGENT_SYSTEM_PROMPT = `VOCÊ É O SURFEAGENT, UM SISTEMA ESPECIALISTA EXCLUSIVO EM PREVISÃO DE ONDAS E CONDIÇÕES DE SURFE.

REGRAS INVIOLÁVEIS (GUARDRAILS):
1. ESCOPO ÚNICO: Você só pode falar sobre previsão de ondas, swell, período, energia, vento, maré, temperatura da água e características técnicas de picos de surfe (bancada, fundo, nível recomendado).
2. BLOQUEIO DE OUTROS ASSUNTOS: Se o usuário perguntar sobre qualquer outro tema (política, receitas, programação, piadas, notícias gerais, conversas aleatórias ou assuntos fora do surfe), recuse imediatamente e redirecione em uma única frase curta:
   "Eu sou o surfeAgent e respondo apenas sobre previsão de ondas e picos de surfe. Diga o nome de uma praia ou seu nível para eu checar o mar."
3. ZERO ALUCINAÇÃO (GROUNDING ESTRITO): Baseie o seu reporte EXCLUSIVAMENTE nos dados numéricos fornecidos no bloco [DADOS_DA_API] do contexto. NUNCA invente altura de onda, direção de vento, horário de maré ou nomes de praias que não estejam nos dados fornecidos ou confirmados pela ferramenta de busca de picos.
4. SEM ENROLAÇÃO: Não faça saudações longas, não dê conselhos genéricos de vida e não repita a pergunta do usuário. Vá direto aos números e à leitura técnica do mar.
5. ENCERRAMENTO PADRÃO: Sempre termine o campo "spokenResponse" com a frase exata:
   "Sempre que quiser responder ou fazer uma nova consulta, basta clicar novamente no botão Falar com o surfeAgent."

FORMATO DE SAÍDA OBRIGATÓRIO (JSON):
{
  "inScope": true | false,
  "intent": "SEARCH_SPOTS" | "BEST_SPOT" | "ENRICH_SPOT" | "OUT_OF_SCOPE",
  "spots": ["Nome Canônico"],
  "skillLevelFilter": null | "INTENT_NO_LEVEL" | "INTENT_BEGINNER" | "INTENT_INTERMEDIATE" | "INTENT_ADVANCED",
  "spokenResponse": "Texto objetivo estritamente baseado em [DADOS_DA_API] encerrando com a frase padrão."
}`;

  function normalizeStr(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Padrões explícitos fora de escopo (política, receitas, código, piadas, trivialidades, etc.)
  const OFF_TOPIC_PATTERNS = [
    /\b(receita|bolo|comida|cozinhar|ingredientes|restaurante|pizza|churrasco|almoco|jantar)\b/,
    /\b(politica|presidente|eleicao|eleicoes|deputado|senador|governo|partido|ministro|prefeito|voto)\b/,
    /\b(piada|charada|historia engracada|me faz rir|conta uma historia|poema|poesia|musica|letra de musica)\b/,
    /\b(programacao|codigo|python|javascript|java|html|css|sql|algoritmo|react|node|bug|compilar)\b/,
    /\b(futebol|flamengo|corinthians|palmeiras|bahia fc|vitoria fc|campeonato|libertadores|nba|formula 1)\b/,
    /\b(bitcoin|cripto|acoes|bolsa de valores|dolar hoje|cotacao|investimento|imposto de renda)\b/,
    /\b(capital da|capital do|quem descobriu|quantos anos tem|quem e o|o que e um|significado de|traduza|traduzir)\b/,
    /\b(namoro|relacionamento|conselho de vida|depressao|remedio|sintomas|doenca|medico|horoscopo|signo)\b/,
    /\b(quanto e \d|calcule|raiz quadrada|equacao|matematica|fisica quantica)\b/
  ];

  // Vocabulário autorizado do domínio de surfe & oceanografia
  const SURF_DOMAIN_KEYWORDS = [
    'surf', 'surfe', 'surfar', 'onda', 'ondas', 'mar', 'swell', 'periodo',
    'energia', 'kj', 'joules', 'vento', 'terral', 'maral', 'cruzado', 'rajada',
    'mare', 'preamar', 'baixamar', 'enchendo', 'vazante', 'seca', 'cheia',
    'pico', 'picos', 'praia', 'praias', 'bancada', 'reef', 'point', 'fundo',
    'areia', 'coral', 'pedra', 'tubo', 'prancha', 'longboard', 'wetsuit', 'agua',
    'previsao', 'previsoes', 'condicao', 'condicoes', 'iniciante', 'basico',
    'intermediario', 'avancado', 'nivel', 'melhor', 'sem nivel', 'nao precisa',
    'tanto faz', 'fale mais', 'saber mais', 'detalhes', 'insights', 'bussola',
    'hoje', 'agora', 'amanha', 'litoral', 'costa', 'baia', 'cabo', 'farol'
  ];

  /**
   * 3. Verificador Determinístico de Escopo (Guardrail Pre-Flight)
   * Impede que perguntas fora de escopo criem abas inválidas ou gerem divagações.
   */
  function checkDomainScope(rawInput, knownSpots = []) {
    const norm = normalizeStr(rawInput);
    if (!norm) {
      return {
        inScope: false,
        reason: 'empty',
        refusal: `${OFF_TOPIC_REFUSAL} ${STANDARD_CLOSING}`
      };
    }

    // 1. Verifica se cita explicitamente algum pico conhecido (name ou aliases)
    const mentionsKnownSpot = Array.isArray(knownSpots) && knownSpots.some((spot) => {
      const candidates = [spot.name, ...(Array.isArray(spot.aliases) ? spot.aliases : [])];
      return candidates.some((c) => {
        const cn = normalizeStr(c);
        return cn.length >= 3 && (norm.includes(cn) || cn.includes(norm));
      });
    });

    // 2. Verifica termos do domínio de surfe
    const hasSurfKeyword = SURF_DOMAIN_KEYWORDS.some((kw) => norm.includes(kw));

    // 3. Bloqueia imediatamente temas fora do escopo (exceto se também houver pedido explícito de surfe/praia)
    const hitsOffTopic = OFF_TOPIC_PATTERNS.some((rx) => rx.test(norm));
    if (hitsOffTopic && !hasSurfKeyword && !mentionsKnownSpot) {
      return {
        inScope: false,
        reason: 'off_topic_blocked',
        refusal: `${OFF_TOPIC_REFUSAL} ${STANDARD_CLOSING}`
      };
    }

    // 4. Bloqueia frases conversacionais longas (> 5 palavras) sem nenhum termo de surfe nem pico conhecido
    const words = norm.split(' ').filter(Boolean);
    if (words.length >= 5 && !hasSurfKeyword && !mentionsKnownSpot) {
      return {
        inScope: false,
        reason: 'conversational_drift',
        refusal: `${OFF_TOPIC_REFUSAL} ${STANDARD_CLOSING}`
      };
    }

    return { inScope: true, reason: 'ok', refusal: null };
  }

  /**
   * Garante encerramento padrão obrigatório e remove quebras excessivas
   */
  function ensureStandardClosing(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return `${OFF_TOPIC_REFUSAL} ${STANDARD_CLOSING}`;
    if (clean.includes('basta clicar novamente no botão Falar com o surfeAgent')) {
      return clean;
    }
    const punct = /[.!?]$/.test(clean) ? '' : '.';
    return `${clean}${punct} ${STANDARD_CLOSING}`;
  }

  /**
   * Monta o bloco estruturado [DADOS_DA_API] para Grounding estrito
   */
  function buildApiDataBlock(spots = []) {
    const safeSpots = (Array.isArray(spots) ? spots : []).map((s) => ({
      id: s.id,
      name: s.name,
      region: s.region || s.baseRegion || '',
      waveHeight: s.swellSize || 'N/D',
      wavePeriod: s.swellPeriod || 'N/D',
      swellDir: s.swellDir || 'N/D',
      energy: s.energy || 'N/D',
      windSpeed: s.windSpeed || 'N/D',
      windDir: s.windDir || 'N/D',
      windRelation: s.windRelation || 'N/D',
      tidePhase: s.tidePhase || 'N/D',
      waterTemp: s.waterTemp || 'N/D',
      bottomType: s.bottomTypeLabel || s.bottomType || 'sand',
      waveCharacteristics: s.waveCharacteristics || null,
      idealSwellDirection: s.idealSwellDirection || null,
      idealWindDirection: s.idealWindDirection || null,
      idealTide: s.idealTide || s.bestTide || 'MID',
      skillLevels: s.skillLevels || null,
      hazards: s.hazards || null,
      score: s.displayScore || null
    }));
    return `[DADOS_DA_API]\n${JSON.stringify(safeSpots, null, 2)}\n[/DADOS_DA_API]`;
  }

  /**
   * 4. Chamada Blindada à LLM (quando API key existir no servidor) com fallback determinístico JSON
   */
  async function generateGroundedResponse({ userQuery, spots = [], knownSpots = [], apiKey = null, model = 'gpt-4o-mini' }) {
    // Guardrail Pre-Flight
    const scope = checkDomainScope(userQuery, knownSpots.length ? knownSpots : spots);
    if (!scope.inScope) {
      return {
        inScope: false,
        intent: 'OUT_OF_SCOPE',
        spots: [],
        skillLevelFilter: null,
        spokenResponse: scope.refusal,
        configUsed: LLM_DETERMINISTIC_CONFIG
      };
    }

    const apiBlock = buildApiDataBlock(spots);

    // Se houver chave OpenAI configurada no ambiente do servidor, executa inferência determinística com JSON Schema
    if (apiKey && typeof fetch === 'function') {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            temperature: LLM_DETERMINISTIC_CONFIG.temperature,
            max_tokens: LLM_DETERMINISTIC_CONFIG.max_tokens,
            response_format: LLM_DETERMINISTIC_CONFIG.response_format,
            messages: [
              { role: 'system', content: SURFEAGENT_SYSTEM_PROMPT },
              { role: 'user', content: `${apiBlock}\n\nCONSULTA DO SURFISTA: "${userQuery}"` }
            ]
          })
        });

        if (res.ok) {
          const data = await res.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            return {
              inScope: Boolean(parsed.inScope !== false),
              intent: parsed.intent || 'SEARCH_SPOTS',
              spots: Array.isArray(parsed.spots) ? parsed.spots : spots.map(s => s.name),
              skillLevelFilter: parsed.skillLevelFilter || null,
              spokenResponse: ensureStandardClosing(parsed.spokenResponse),
              configUsed: LLM_DETERMINISTIC_CONFIG
            };
          }
        }
      } catch (err) {
        // Fallback determinístico local se a API externa estiver indisponível
      }
    }

    // Síntese Determinística Local (100% Grounded em [DADOS_DA_API] e Catálogo Oficial, zero alucinação)
    if (spots.length === 1) {
      const s = spots[0];
      const catalogPart = s.waveCharacteristics
        ? `${s.waveCharacteristics}. Fundo: ${s.bottomTypeLabel || s.bottomType}. Swell ideal: ${s.idealSwellDirection || 'SE/S'}, vento ideal: ${s.idealWindDirection || 'terral'}, maré ideal: ${s.idealTide || 'meia-maré'}.${s.hazards ? ` Atenção: ${s.hazards}.` : ''} `
        : '';
      const msg = `${s.name}: ${catalogPart}Condições agora: ondas de ${s.swellSize} com período de ${s.swellPeriod} (${s.swellDir}), energia de ${s.energy}, vento ${s.windSpeed} (${s.windRelation}), maré ${(s.tidePhase || 'em variação').split('(')[0].trim()} e água a ${s.waterTemp}.`;
      return {
        inScope: true,
        intent: 'SEARCH_SPOTS',
        spots: [s.name],
        skillLevelFilter: null,
        spokenResponse: ensureStandardClosing(msg),
        configUsed: LLM_DETERMINISTIC_CONFIG
      };
    }

    if (spots.length > 1) {
      const parts = spots.map((s) => `${s.name} com ${s.swellSize}, ${s.swellPeriod} e ${s.windRelation}`);
      const msg = `Condições atuais: ${parts.join('; ')}.`;
      return {
        inScope: true,
        intent: 'SEARCH_SPOTS',
        spots: spots.map((s) => s.name),
        skillLevelFilter: null,
        spokenResponse: ensureStandardClosing(msg),
        configUsed: LLM_DETERMINISTIC_CONFIG
      };
    }

    return {
      inScope: true,
      intent: 'BEST_SPOT',
      spots: [],
      skillLevelFilter: 'INTENT_NO_LEVEL',
      spokenResponse: ensureStandardClosing('Diga o nome de uma praia ou seu nível para checar os dados reais do mar.'),
      configUsed: LLM_DETERMINISTIC_CONFIG
    };
  }

  return {
    STANDARD_CLOSING,
    OFF_TOPIC_REFUSAL,
    LLM_DETERMINISTIC_CONFIG,
    SURFEAGENT_SYSTEM_PROMPT,
    checkDomainScope,
    ensureStandardClosing,
    buildApiDataBlock,
    generateGroundedResponse
  };
});
