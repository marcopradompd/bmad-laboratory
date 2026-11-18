/**
 * Edge Function / Serverless API Route: /api/forecast
 * Compatível com Vercel Edge Network, Cloudflare Workers, Netlify Edge e Next.js.
 * 
 * Implementa cache de 2 horas (7200s) na camada de CDN/Edge + memória local.
 */

// Importa a lógica de ingestão e normalização
const {
  fetchSurfForecast,
  degreesToCardinal,
  calculateSwellEnergyIndex,
  detectTideExtrema
} = require('../DsySA/open-meteo-service.js');

// Configuração de Edge Runtime para plataformas Serverless modernas
export const config = {
  runtime: 'edge'
};

// Cache em memória na instância do Edge (2 horas = 7200 segundos)
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const memoryCache = new Map();

/**
 * Handler HTTP da Edge Function (Web Standard API: Request -> Response)
 * @param {Request} request 
 * @returns {Promise<Response>}
 */
export default async function handler(request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const lat = parseFloat(searchParams.get('lat') || '-12.95');
  const lon = parseFloat(searchParams.get('lon') || '-38.35');
  const timezone = searchParams.get('timezone') || 'America/Sao_Paulo';
  const forecastDays = parseInt(searchParams.get('forecast_days') || '7', 10);

  // Chave de cache normalizada (arredonda lat/lon para 2 casas decimais = raio de ~1km no mar)
  const cacheKey = `${lat.toFixed(2)}:${lon.toFixed(2)}:${timezone}:${forecastDays}`;
  const now = Date.now();

  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    const remainingMin = Math.round((cached.expiresAt - now) / 60000);
    return new Response(JSON.stringify(cached.data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Cache': 'HIT',
        'X-Cache-Expires-In-Min': String(remainingMin),
        // Cache na CDN/Edge por 2h (7200s) + revalidação em segundo plano por mais 1h
        'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=3600, max-age=3600'
      }
    });
  }

  try {
    const forecastData = await fetchSurfForecast({
      lat,
      lon,
      timezone,
      forecastDays
    });

    // Salva no cache com expiração de 2 horas
    memoryCache.set(cacheKey, {
      data: forecastData,
      expiresAt: now + CACHE_TTL_MS
    });

    return new Response(JSON.stringify(forecastData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Cache': 'MISS',
        'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=3600, max-age=3600'
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Falha na ingestão Open-Meteo', message: error.message }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}
