/**
 * SurfAgent — Servidor HTTP Node.js com Cache de 2 Horas
 * 
 * Executa sem dependências externas (apenas módulos nativos do Node: http, fs, path, url).
 * Serve os arquivos estáticos do protótipo e expõe a rota /api/forecast com cache em memória.
 * 
 * Como rodar:
 *   node server.js
 * Acessar:
 *   http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Importa o serviço de ingestão, catálogo oficial verificado, serviço de conhecimento de picos e guardrail LLM
const { fetchSurfForecast } = require('./DsySA/open-meteo-service.js');
const SpotsCatalogService = require('./DsySA/spots-catalog-service.js');
const SpotKnowledgeService = require('./DsySA/spot-knowledge-service.js');
const SurfeAgentGuardrail = require('./DsySA/surfeagent-llm-guardrail.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const SPOTS_DB_PATH = path.join(__dirname, 'data', 'surf_spots.json');

// Carrega catálogo oficial verificado (src/data/spots_catalog.json) na inicialização
SpotsCatalogService.loadOfficialCatalog();

function readSharedSpots() {
  try {
    const officialSpots = SpotsCatalogService.getNormalizedSpots();
    const officialIds = new Set(officialSpots.map((s) => s.id));
    if (!fs.existsSync(SPOTS_DB_PATH)) return officialSpots;
    const raw = fs.readFileSync(SPOTS_DB_PATH, 'utf8');
    const extra = JSON.parse(raw);
    if (!Array.isArray(extra)) return officialSpots;
    // Mantém os 14 picos oficiais verificados como prioridade e preserva picos extras de outros estados
    const legacyBaIds = new Set(['itacimirim', 'stella_maris', 'guarajuba', 'pedra_do_sal', 'barravento']);
    const nonConflicting = extra.filter((s) => s && !officialIds.has(s.id) && !legacyBaIds.has(s.id));
    return [...officialSpots, ...nonConflicting];
  } catch (e) {
    console.warn('⚠️ Falha ao ler catálogo de picos:', e.message);
    return SpotsCatalogService.getNormalizedSpots();
  }
}

function writeSharedSpots(spots) {
  try {
    const dir = path.dirname(SPOTS_DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SPOTS_DB_PATH, JSON.stringify(spots, null, 2), 'utf8');
  } catch (e) {
    console.warn('⚠️ Falha ao gravar data/surf_spots.json:', e.message);
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// ============================================================================
// CAMADA DE CACHE DO BACKEND (TTL = 2 HORAS = 7200 SEGUNDOS)
// ============================================================================
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas em milissegundos
const backendCache = new Map();

/**
 * MIME types para servir arquivos estáticos com cabeçalhos corretos
 */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  const pathname = parsedUrl.pathname;

  // Habilita CORS globalmente
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ==========================================================================
  // ROTA BLINDADA DO AGENTE LLM (GUARDRAIL + GROUNDING + JSON ESTRUTURADO)
  // POST /api/agent/respond  { query, spots }
  // ==========================================================================
  if (pathname === '/api/agent/respond' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const query = String(body.query || '').trim();
      const spots = Array.isArray(body.spots) ? body.spots : [];
      const knownSpots = readSharedSpots();

      const response = await SurfeAgentGuardrail.generateGroundedResponse({
        userQuery: query,
        spots,
        knownSpots,
        apiKey: process.env.OPENAI_API_KEY || null,
        model: process.env.SURFEAGENT_LLM_MODEL || 'gpt-4o-mini'
      });

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(response));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Erro no motor de guardrail do surfeAgent', details: err.message }));
    }
    return;
  }

  // ==========================================================================
  // ROTAS DA BASE GLOBAL COLABORATIVA: surf_spots
  // ==========================================================================
  if (pathname === '/api/spots' && req.method === 'GET') {
    const spots = readSharedSpots().sort((a, b) => (b.searchCount || 0) - (a.searchCount || 0));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ count: spots.length, spots }));
    return;
  }

  if (pathname === '/api/spots/discover' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const query = String(body.query || '').trim();
      if (!query) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Parâmetro query obrigatório' }));
        return;
      }

      const spots = readSharedSpots();
      const cleanedQuery = SpotKnowledgeService.cleanSpotName(query, spots) || query;
      const existing = SpotKnowledgeService.findSpotBySemanticMatch(spots, cleanedQuery);
      if (existing) {
        existing.searchCount = (existing.searchCount || 1) + 1;
        writeSharedSpots(spots);
        console.log(`🔎 [surf_spots] Deduplicação semântica: "${query}" → "${cleanedQuery}" → ${existing.name} (searchCount=${existing.searchCount})`);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ spot: existing, isNew: false, source: 'database_dedup' }));
        return;
      }

      // Auto-Discovery via Web Grounding (Nominatim + Wikipedia) com nome higienizado
      const result = await SpotKnowledgeService.discoverAndRegisterSpot(cleanedQuery, []);
      if (result && result.spot) {
        spots.push(result.spot);
        writeSharedSpots(spots);
        console.log(`✨ [surf_spots] Novo pico aprendido pela IA e salvo globalmente: ${result.spot.name} (${result.spot.lat}, ${result.spot.lon})`);
        res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Não foi possível localizar o pico' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Erro ao descobrir pico', details: err.message }));
    }
    return;
  }

  const enrichMatch = pathname.match(/^\/api\/spots\/([^/]+)\/enrich$/);
  if (enrichMatch && req.method === 'POST') {
    try {
      const spotId = decodeURIComponent(enrichMatch[1]);
      const spots = readSharedSpots();
      const idx = spots.findIndex(s => s.id === spotId);
      if (idx < 0) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Pico não encontrado na base global' }));
        return;
      }

      const enriched = await SpotKnowledgeService.enrichSpotKnowledge(spots[idx]);
      spots[idx] = { ...spots[idx], ...enriched };
      writeSharedSpots(spots);
      console.log(`🧠 [surf_spots] Enriquecimento web concluído para ${spots[idx].name}`);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ spot: spots[idx] }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Erro ao enriquecer pico', details: err.message }));
    }
    return;
  }

  // ==========================================================================
  // ROTA DA API: GET /api/forecast?lat=-12.95&lon=-38.35
  // ==========================================================================
  if (pathname === '/api/forecast') {
    const lat = parseFloat(parsedUrl.searchParams.get('lat') || '-12.9445');
    const lon = parseFloat(parsedUrl.searchParams.get('lon') || '-38.3345');
    const spotProfile = parsedUrl.searchParams.get('spot_profile') || 'exposed_beach';
    const timezone = parsedUrl.searchParams.get('timezone') || 'auto';
    const forecastDays = parseInt(parsedUrl.searchParams.get('forecast_days') || '7', 10);

    const cacheKey = `sg_profile_v5:${lat.toFixed(4)}:${lon.toFixed(4)}:${spotProfile}:${timezone}:${forecastDays}`;
    const now = Date.now();

    // 1. Verifica se existe no Cache e ainda é válido (< 2 horas)
    const cachedEntry = backendCache.get(cacheKey);
    if (cachedEntry && cachedEntry.expiresAt > now) {
      const remainingMinutes = Math.round((cachedEntry.expiresAt - now) / 60000);
      console.log(`⚡ [Cache HIT] Servindo previsão para (${lat.toFixed(4)}, ${lon.toFixed(4)}) da memória. Válido por mais ${remainingMinutes} min.`);

      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Cache': 'HIT',
        'X-Cache-TTL-Remaining': `${remainingMinutes}m`,
        'Cache-Control': 'public, max-age=7200, s-maxage=7200'
      });
      res.end(JSON.stringify(cachedEntry.data));
      return;
    }

    // 2. Cache MISS: Consulta direta Open-Meteo (Marine WW3 + Forecast NOAA GFS) nas coordenadas exatas do pico
    console.log(`🌐 [Cache MISS] Consultando Open-Meteo (Padrão Surfguru) para (${lat}, ${lon})...`);
    try {
      const forecast = await fetchSurfForecast({
        lat,
        lon,
        spotProfile,
        timezone,
        forecastDays
      });

      // 3. Grava no cache por 2 horas
      backendCache.set(cacheKey, {
        data: forecast,
        expiresAt: now + CACHE_TTL_MS
      });
      console.log(`💾 [Cache STORE] Previsão armazenada no cache por 2 horas. Total de horas: ${forecast.timeline.length}.`);

      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=7200, s-maxage=7200'
      });
      res.end(JSON.stringify(forecast));
    } catch (err) {
      console.error(`❌ [Erro Ingestão] Falha ao consultar Open-Meteo:`, err.message);
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Erro ao buscar dados meteorológicos', details: err.message }));
    }
    return;
  }

  // ==========================================================================
  // SERVIR ARQUIVOS ESTÁTICOS DO FRONTEND
  // ==========================================================================
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Se o caminho apontar para um diretório, busca index.html dentro dele
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`404 — Arquivo não encontrado: ${pathname}`);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`500 — Erro interno no servidor: ${err.code}`);
      }
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': Buffer.byteLength(content)
    });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🏄 SurfAgent Server rodando com Cache de 2 Horas!`);
  console.log(`📡 URL Principal:   http://localhost:${PORT}`);
  console.log(`🎨 Catálogo DsySA:  http://localhost:${PORT}/DsySA/index.html`);
  console.log(`⚡ API de Previsão: http://localhost:${PORT}/api/forecast?lat=-12.95&lon=-38.35`);
  console.log(`======================================================\n`);
});
