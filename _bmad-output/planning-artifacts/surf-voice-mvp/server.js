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

// Importa o serviço de ingestão e normalização
const { fetchSurfForecast } = require('./DsySA/open-meteo-service.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ==========================================================================
  // ROTA DA API: GET /api/forecast?lat=-12.95&lon=-38.35
  // ==========================================================================
  if (pathname === '/api/forecast') {
    const lat = parseFloat(parsedUrl.searchParams.get('lat') || '-12.95');
    const lon = parseFloat(parsedUrl.searchParams.get('lon') || '-38.35');
    const timezone = parsedUrl.searchParams.get('timezone') || 'America/Sao_Paulo';
    const forecastDays = parseInt(parsedUrl.searchParams.get('forecast_days') || '7', 10);

    const cacheKey = `${lat.toFixed(2)}:${lon.toFixed(2)}:${timezone}:${forecastDays}`;
    const now = Date.now();

    // 1. Verifica se existe no Cache e ainda é válido (< 2 horas)
    const cachedEntry = backendCache.get(cacheKey);
    if (cachedEntry && cachedEntry.expiresAt > now) {
      const remainingMinutes = Math.round((cachedEntry.expiresAt - now) / 60000);
      console.log(`⚡ [Cache HIT] Servindo previsão para (${lat.toFixed(2)}, ${lon.toFixed(2)}) da memória. Válido por mais ${remainingMinutes} min.`);

      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Cache': 'HIT',
        'X-Cache-TTL-Remaining': `${remainingMinutes}m`,
        'Cache-Control': 'public, max-age=7200, s-maxage=7200'
      });
      res.end(JSON.stringify(cachedEntry.data));
      return;
    }

    // 2. Cache MISS: Consulta as fontes Open-Meteo (WW3 + GFS)
    console.log(`🌐 [Cache MISS] Consultando Open-Meteo para coordenadas (${lat}, ${lon})...`);
    try {
      const forecast = await fetchSurfForecast({
        lat,
        lon,
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

    res.writeHead(200, { 'Content-Type': contentType });
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
