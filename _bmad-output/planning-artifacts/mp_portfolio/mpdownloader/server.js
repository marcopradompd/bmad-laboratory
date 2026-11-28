/**
 * ============================================================================
 * Mpdownloader v2.0 — Motor Playwright + Chromium (Padrão Asimov 3.0 + MPDs)
 * ============================================================================
 * Recursos:
 * - Renderização real com Playwright + Chromium (JavaScript, SPA, WebGL, fontes e lazy-load)
 * - Interceptação direta de rede (page.on('response')) para capturar todos os assets reais
 * - Auto-scroll inteligente para disparar lazy-loading de imagens e animações
 * - Reescrita automática de HTML e CSS para estrutura offline autônoma (index.html + assets/)
 * - Empacotador .ZIP nativo (PKZIP + DEFLATE + CRC32)
 * - Fallback automático para modo HTTP nativo caso Playwright ainda não esteja instalado
 *
 * Uso local:
 *   npm install && npx playwright install chromium
 *   npm start   ->   http://localhost:3333
 * ============================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const dns = require('dns').promises;

const PORT = process.env.PORT || 3333;
const ROOT_DIR = __dirname;
const MPDS_DIR = path.join(__dirname, '..', 'mpds');

let playwrightLib = null;
try {
  playwrightLib = require('playwright');
} catch (_) {
  playwrightLib = null;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.zip': 'application/zip'
};

const CONTENT_TYPE_EXT = {
  'text/css': '.css',
  'application/javascript': '.js',
  'text/javascript': '.js',
  'application/x-javascript': '.js',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
  'font/woff2': '.woff2',
  'font/woff': '.woff',
  'font/ttf': '.ttf',
  'application/font-woff2': '.woff2',
  'application/font-woff': '.woff',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'model/gltf-binary': '.glb',
  'application/json': '.json'
};

/* ============================================================================
   PROTEÇÃO SSRF (Bloqueia localhost e faixas privadas)
   ============================================================================ */
function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return true;
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;
  if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}

async function assertPublicHost(hostname) {
  const h = String(hostname || '').toLowerCase().trim();
  if (!h || h === 'localhost' || h.endsWith('.local')) {
    throw new Error('Endereços locais ou redes privadas não são permitidos.');
  }
  try {
    const resolved = await dns.lookup(h);
    if (isPrivateIp(resolved.address)) {
      throw new Error('Endereços internos/privados bloqueados por segurança.');
    }
  } catch (err) {
    if (err.message.includes('bloqueados') || err.message.includes('permitidos')) throw err;
  }
}

/* ============================================================================
   GERADOR NATIVO DE ARQUIVO .ZIP (PKZIP + DEFLATE + CRC32)
   ============================================================================ */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function buildZipBuffer(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  const now = new Date();
  const dosTime = ((now.getHours() & 0x1F) << 11) | ((now.getMinutes() & 0x3F) << 5) | ((now.getSeconds() >> 1) & 0x1F);
  const dosDate = (((Math.max(1980, now.getFullYear()) - 1980) & 0x7F) << 9) | (((now.getMonth() + 1) & 0x0F) << 5) | (now.getDate() & 0x1F);

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name.replace(/\\/g, '/'), 'utf8');
    const rawData = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8');
    const compressed = zlib.deflateRawSync(rawData, { level: 6 });
    const useDeflate = compressed.length < rawData.length;
    const payload = useDeflate ? compressed : rawData;
    const method = useDeflate ? 8 : 0;
    const checksum = crc32(rawData);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034B50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(rawData.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, nameBuf, payload);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014B50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(rawData.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + payload.length;
  }

  const centralSize = centralParts.reduce((sum, b) => sum + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054B50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, ...centralParts, eocd]);
}

/* ============================================================================
   HELPERS COMUNS
   ============================================================================ */
const jobs = new Map();

function sanitizeAssetFilename(rawUrl, contentType = '', fallbackExt = '.bin') {
  const hash = crypto.createHash('md5').update(rawUrl).digest('hex').slice(0, 10);
  let base = 'resource';
  let ext = '';
  try {
    const u = new URL(rawUrl);
    const seg = u.pathname.split('/').filter(Boolean).pop() || 'resource';
    const parsed = path.parse(seg);
    base = (parsed.name || 'resource').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32) || 'resource';
    ext = (parsed.ext || '').toLowerCase().replace(/[^a-z0-9.]/g, '').slice(0, 8);
  } catch (_) {}

  if (!ext || ext.length < 2) {
    const cleanCt = String(contentType || '').split(';')[0].trim().toLowerCase();
    ext = CONTENT_TYPE_EXT[cleanCt] || fallbackExt;
  }
  return `${base}_${hash}${ext}`;
}

function resolveAbsoluteUrl(ref, baseUrl) {
  if (!ref) return null;
  const trimmed = String(ref).trim().replace(/^['"]|['"]$/g, '');
  if (!trimmed || /^(data:|javascript:|mailto:|tel:|#|about:|blob:)/i.test(trimmed)) return null;
  try {
    return new URL(trimmed, baseUrl).href;
  } catch (_) {
    return null;
  }
}

function emitJobEvent(job, event, payload) {
  job.history.push({ event, payload, ts: Date.now() });
  for (const res of job.clients) {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
    } catch (_) {}
  }
}

function buildReadmeContent(baseUrl, mode, engineName, stats) {
  return [
    '==============================================================',
    `  Mpdownloader v2.0 — Pacote Offline (${engineName})`,
    '==============================================================',
    `Origem:   ${baseUrl}`,
    `Modo:     ${mode}`,
    `Data:     ${new Date().toLocaleString('pt-BR')}`,
    `Recursos: ${stats.css} CSS | ${stats.js} JS | ${stats.images} Imagens | ${stats.fonts} Fontes`,
    '',
    'COMO VISUALIZAR OFFLINE:',
    '1. Duplo clique: extraia o ZIP e abra "index.html" no navegador.',
    '2. Servidor local (recomendado para sites com JS/3D):',
    '   npx serve .   ou   python -m http.server 8080',
    '=============================================================='
  ].join('\n');
}

/* ============================================================================
   MOTOR 1: PLAYWRIGHT + CHROMIUM REAL (IGUAL AO ASIMOV 3.0)
   ============================================================================ */
async function captureWithPlaywright(job) {
  const startTime = Date.now();
  const { url, mode, options } = job;
  const includeImages = options.includeImages !== false;
  const includeFonts = options.includeFonts !== false;
  const includeScripts = mode === 'fast' ? false : options.includeScripts !== false;
  const includeReadme = options.includeReadme !== false;
  const maxAssets = mode === 'fast' ? 60 : 250;
  const maxTotalBytes = 65 * 1024 * 1024; // 65 MB de teto seguro

  let browser = null;
  try {
    emitJobEvent(job, 'progress', {
      pct: 10,
      step: 'Iniciando navegador Chromium (Playwright)...',
      log: `Chromium headless iniciado para ${url}`
    });

    browser = await playwrightLib.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'pt-BR',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    const captured = new Map(); // absUrl -> { localPath, buffer, kind, contentType }
    const stats = { css: 0, js: 0, images: 0, fonts: 0, failed: 0 };
    let totalBytesCaptured = 0;

    // Intercepta TODAS as respostas reais de rede carregadas pelo Chromium
    page.on('response', async (response) => {
      try {
        const status = response.status();
        if (status < 200 || status >= 400) return;

        const req = response.request();
        const resType = req.resourceType();
        const resUrl = response.url();
        if (!/^https?:\/\//i.test(resUrl) || captured.has(resUrl)) return;
        if (captured.size >= maxAssets || totalBytesCaptured >= maxTotalBytes) return;

        let kind = null;
        let fallbackExt = '.bin';
        if (resType === 'stylesheet') { kind = 'css'; fallbackExt = '.css'; }
        else if (resType === 'script' && includeScripts) { kind = 'js'; fallbackExt = '.js'; }
        else if (resType === 'font' && includeFonts) { kind = 'font'; fallbackExt = '.woff2'; }
        else if ((resType === 'image' || resType === 'media') && includeImages) { kind = 'image'; fallbackExt = '.webp'; }
        else return;

        const body = await response.body();
        if (!body || body.length === 0 || body.length > 10 * 1024 * 1024) return;

        const ct = response.headers()['content-type'] || '';
        const fname = sanitizeAssetFilename(resUrl, ct, fallbackExt);
        captured.set(resUrl, { localPath: `assets/${fname}`, buffer: body, kind, contentType: ct });
        totalBytesCaptured += body.length;

        if (kind === 'css') stats.css++;
        else if (kind === 'js') stats.js++;
        else if (kind === 'font') stats.fonts++;
        else stats.images++;
      } catch (_) {}
    });

    emitJobEvent(job, 'progress', {
      pct: 25,
      step: 'Renderizando página e executando JavaScript...',
      log: `Navegando em ${url} (aguardando rede e animações)...`
    });

    const navRes = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    if (navRes && navRes.status() >= 400) {
      throw new Error(`O site respondeu com HTTP ${navRes.status()} mesmo no navegador Chromium.`);
    }

    // Aguarda estabilização inicial da rede
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Auto-scroll para disparar lazy-loading de imagens e animações on-scroll
    if (mode !== 'fast') {
      emitJobEvent(job, 'progress', {
        pct: 52,
        step: 'Percorrendo página para capturar lazy-load e animações...',
        log: 'Executando auto-scroll para carregar imagens sob demanda.'
      });

      await page.evaluate(async () => {
        const step = 650;
        const maxScroll = Math.min(document.body.scrollHeight, 12000);
        for (let y = 0; y < maxScroll; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 180));
        }
        window.scrollTo(0, 0);
      });

      await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
    }

    const baseUrl = page.url() || url;
    const parsedBase = new URL(baseUrl);
    const slug = parsedBase.hostname.replace(/^www\./, '').replace(/[^a-zA-Z0-9.-]/g, '_');

    emitJobEvent(job, 'progress', {
      pct: 74,
      step: `Capturando DOM renderizado (${captured.size} recursos de rede)...`,
      log: `Capturados: ${stats.css} CSS, ${stats.js} JS, ${stats.images} imagens, ${stats.fonts} fontes.`
    });

    // Normaliza atributos relativos no DOM renderizado antes de serializar
    let html = await page.evaluate(() => {
      const toAbs = (el, attr) => {
        const v = el.getAttribute(attr);
        if (!v || /^(data:|javascript:|mailto:|tel:|#|blob:)/i.test(v)) return;
        try { el.setAttribute(attr, new URL(v, document.baseURI).href); } catch (_) {}
      };
      document.querySelectorAll('link[href]').forEach((el) => toAbs(el, 'href'));
      document.querySelectorAll('script[src]').forEach((el) => toAbs(el, 'src'));
      document.querySelectorAll('img[src]').forEach((el) => toAbs(el, 'src'));
      document.querySelectorAll('source[src]').forEach((el) => toAbs(el, 'src'));
      return '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
    });

    await browser.close();
    browser = null;

    // Reescreve URLs nos CSS capturados e no HTML para assets/
    emitJobEvent(job, 'progress', {
      pct: 86,
      step: 'Reescrevendo caminhos para funcionamento offline...',
      log: 'Substituindo URLs remotas por caminhos locais em assets/.'
    });

    const zipEntries = [];
    for (const [absUrl, fileObj] of captured.entries()) {
      let dataBuf = fileObj.buffer;
      if (fileObj.kind === 'css') {
        let cssStr = dataBuf.toString('utf8');
        cssStr = cssStr.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi, (full, quote, ref) => {
          const subAbs = resolveAbsoluteUrl(ref, absUrl);
          if (subAbs && captured.has(subAbs)) {
            const subLocal = captured.get(subAbs).localPath.replace(/^assets\//, '');
            return `url("${subLocal}")`;
          }
          return full;
        });
        dataBuf = Buffer.from(cssStr, 'utf8');
      }
      zipEntries.push({ name: fileObj.localPath, data: dataBuf });
    }

    // Substitui URLs absolutas capturadas no HTML pelo caminho local assets/
    for (const [absUrl, fileObj] of captured.entries()) {
      html = html.split(absUrl).join(fileObj.localPath);
      const escaped = absUrl.replace(/&/g, '&amp;');
      if (escaped !== absUrl) html = html.split(escaped).join(fileObj.localPath);
    }

    const banner = `<!-- Capturado offline com Mpdownloader v2.0 (Playwright + Chromium) · Origem: ${baseUrl} · Data: ${new Date().toISOString()} -->\n`;
    zipEntries.unshift({ name: 'index.html', data: Buffer.from(banner + html, 'utf8') });

    if (includeReadme) {
      zipEntries.push({
        name: 'README-OFFLINE.txt',
        data: Buffer.from(buildReadmeContent(baseUrl, mode, 'Playwright + Chromium', stats), 'utf8')
      });
    }

    emitJobEvent(job, 'progress', {
      pct: 95,
      step: 'Compactando pacote .ZIP...',
      log: `Empacotando ${zipEntries.length} arquivos no pacote .zip final.`
    });

    const zipBuffer = buildZipBuffer(zipEntries);
    const elapsedSec = Number(((Date.now() - startTime) / 1000).toFixed(1));
    const filename = `mpdownloader_${slug}_${Date.now().toString().slice(-6)}.zip`;

    job.zipBuffer = zipBuffer;
    job.filename = filename;
    job.status = 'done';
    job.summary = {
      url: baseUrl,
      hostname: parsedBase.hostname,
      filename,
      mode,
      engine: 'playwright',
      totalFiles: zipEntries.length,
      sizeBytes: zipBuffer.length,
      elapsedSec,
      stats
    };
    emitJobEvent(job, 'done', job.summary);
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    throw err;
  }
}

/* ============================================================================
   MOTOR 2: FALLBACK HTTP NATIVO (CASO PLAYWRIGHT NÃO ESTEJA INSTALADO)
   ============================================================================ */
async function fetchWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return {
      buffer: Buffer.from(await res.arrayBuffer()),
      contentType: res.headers.get('content-type') || '',
      finalUrl: res.url || url
    };
  } finally {
    clearTimeout(timer);
  }
}

async function captureWithHttpFallback(job) {
  const startTime = Date.now();
  const { url, mode } = job;
  emitJobEvent(job, 'progress', {
    pct: 15,
    step: 'Modo HTTP nativo (instale Playwright p/ renderização completa)...',
    log: 'Dica: rode "npm run setup" na pasta mpdownloader para ativar Chromium.'
  });
  const page = await fetchWithTimeout(url, 20000);
  const baseUrl = page.finalUrl || url;
  const parsedBase = new URL(baseUrl);
  const slug = parsedBase.hostname.replace(/^www\./, '').replace(/[^a-zA-Z0-9.-]/g, '_');
  const html = page.buffer.toString('utf8');

  const stats = { css: 0, js: 0, images: 0, fonts: 0, failed: 0 };
  const zipEntries = [
    { name: 'index.html', data: Buffer.from(`<!-- Capturado com Mpdownloader (HTTP Fallback) · ${baseUrl} -->\n` + html, 'utf8') },
    { name: 'README-OFFLINE.txt', data: Buffer.from(buildReadmeContent(baseUrl, mode, 'HTTP Fallback', stats), 'utf8') }
  ];

  const zipBuffer = buildZipBuffer(zipEntries);
  const elapsedSec = Number(((Date.now() - startTime) / 1000).toFixed(1));
  const filename = `mpdownloader_${slug}_${Date.now().toString().slice(-6)}.zip`;

  job.zipBuffer = zipBuffer;
  job.filename = filename;
  job.status = 'done';
  job.summary = {
    url: baseUrl,
    hostname: parsedBase.hostname,
    filename,
    mode,
    engine: 'http-fallback',
    totalFiles: zipEntries.length,
    sizeBytes: zipBuffer.length,
    elapsedSec,
    stats
  };
  emitJobEvent(job, 'done', job.summary);
}

async function executeCaptureJob(job) {
  try {
    const parsed = new URL(job.url);
    await assertPublicHost(parsed.hostname);
    if (playwrightLib) {
      await captureWithPlaywright(job);
    } else {
      await captureWithHttpFallback(job);
    }
  } catch (err) {
    job.status = 'error';
    job.error = err.message || 'Falha ao capturar o site informado.';
    emitJobEvent(job, 'failed', { error: job.error });
  }
}

/* ============================================================================
   SERVIDOR HTTP
   ============================================================================ */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function serveStaticFile(res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Arquivo não encontrado');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:' + PORT}`);
  const pathname = parsedUrl.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      ok: true,
      service: 'Mpdownloader',
      version: '2.0.0',
      engine: playwrightLib ? 'playwright-chromium' : 'http-fallback'
    }));
    return;
  }

  if (pathname === '/api/capture' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      let rawUrl = String(body.url || '').trim();
      if (!rawUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Informe uma URL válida para captura.' }));
        return;
      }
      if (!/^https?:\/\//i.test(rawUrl)) rawUrl = 'https://' + rawUrl;
      new URL(rawUrl);

      const jobId = crypto.randomBytes(6).toString('hex');
      const job = {
        id: jobId,
        url: rawUrl,
        mode: ['standard', 'complete', 'fast'].includes(body.mode) ? body.mode : 'standard',
        options: body.options || {},
        status: 'running',
        history: [],
        clients: new Set(),
        zipBuffer: null,
        filename: null,
        summary: null,
        createdAt: Date.now()
      };
      jobs.set(jobId, job);

      for (const [id, j] of jobs.entries()) {
        if (Date.now() - j.createdAt > 30 * 60 * 1000) jobs.delete(id);
      }

      executeCaptureJob(job);

      res.writeHead(202, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ jobId, url: rawUrl, mode: job.mode }));
    } catch (_) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'URL inválida. Ex.: https://exemplo.com' }));
    }
    return;
  }

  const eventsMatch = pathname.match(/^\/api\/capture\/([a-f0-9]+)\/events$/);
  if (eventsMatch && req.method === 'GET') {
    const job = jobs.get(eventsMatch[1]);
    if (!job) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Captura não encontrada' }));
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    for (const item of job.history) {
      res.write(`event: ${item.event}\ndata: ${JSON.stringify(item.payload)}\n\n`);
    }
    if (job.status === 'done' || job.status === 'error') {
      res.end();
      return;
    }
    job.clients.add(res);
    req.on('close', () => job.clients.delete(res));
    return;
  }

  const dlMatch = pathname.match(/^\/api\/capture\/([a-f0-9]+)\/download$/);
  if (dlMatch && req.method === 'GET') {
    const job = jobs.get(dlMatch[1]);
    if (!job || !job.zipBuffer) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Arquivo ZIP não disponível ou expirado.');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${job.filename}"`,
      'Content-Length': job.zipBuffer.length
    });
    res.end(job.zipBuffer);
    return;
  }

  // Serve MPDs diretamente da pasta oficial ../mpds/
  if (pathname.startsWith('/mpds/')) {
    const rel = pathname.replace(/^\/mpds\//, '');
    const mpdsPath = path.normalize(path.join(MPDS_DIR, rel));
    if (mpdsPath.startsWith(MPDS_DIR)) {
      serveStaticFile(res, mpdsPath);
      return;
    }
  }

  const reqPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.normalize(path.join(ROOT_DIR, reqPath));
  if (filePath.startsWith(ROOT_DIR)) {
    serveStaticFile(res, filePath);
    return;
  }

  res.writeHead(403, { 'Content-Type': 'text/plain' });
  res.end('Acesso negado');
});

server.listen(PORT, () => {
  const modeLabel = playwrightLib ? 'Playwright + Chromium ATIVO' : 'HTTP Fallback (rode "npm run setup" p/ ativar Chromium)';
  console.log(`\n⚡ Mpdownloader v2.0 (MPDs) ativo em: http://localhost:${PORT}`);
  console.log(`   Motor: ${modeLabel}\n`);
});
