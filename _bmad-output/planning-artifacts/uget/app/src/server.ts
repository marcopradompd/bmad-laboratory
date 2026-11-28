/**
 * ============================================================================
 * uGet — API Server (Módulo 1: Fundação, Segurança, RBAC & LGPD)
 * ============================================================================
 */
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.ts';
import { securityStore } from './repositories/securityStore.ts';
import { catalogStore } from './repositories/catalogStore.ts';
import { pushStore } from './repositories/pushStore.ts';
import { decryptPii } from './security/cryptoService.ts';
import { verifyAccessToken } from './security/tokenService.ts';
import { assertTenantAccess, hasPermission } from './security/rbac.ts';
import {
  applySecurityHeaders,
  issueCsrfCookie,
  rateLimiter,
  verifyCsrfProtection
} from './security/owaspGuard.ts';
import { loginUser, registerUser, rotateRefreshToken } from './services/authService.ts';
import {
  anonymizeUserAccount,
  exportUserPersonalData,
  recordUserConsent
} from './services/lgpdService.ts';
import { getBenefitDetail, listNearbyBenefits } from './services/geoCatalogService.ts';
import { recordAudit } from './services/auditService.ts';
import { evaluateGeofencePing } from './services/geofencingService.ts';
import { processPushOutboxBatch, registerOrRotateUserDevice } from './services/pushHaService.ts';
import {
  buildUserPassCard,
  issueBenefitPassRedemption,
  submitPostVisitSurvey,
  verifyAndValidatePassCode
} from './services/passSurveyService.ts';
import { passStore } from './repositories/passStore.ts';
import {
  createTenantBenefit,
  getTenantDashboard,
  listTenantScopedBenefits,
  toggleTenantBenefitStatus,
  validatePassAtB2bCheckout
} from './services/b2bPortalService.ts';
import { ROLES } from './types/security.ts';
import type { AccessTokenPayload, LgpdPurpose } from './types/security.ts';
import type { PushPlatform } from './types/push.ts';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(CURRENT_DIR, '..', 'public');
const UGETDS_DIR = path.resolve(CURRENT_DIR, '..', '..', 'ugetds');

const STATIC_MIMES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

function serveStatic(res: ServerResponse, filePath: string): void {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      sendJson(res, 404, { error: 'Arquivo não encontrado.' });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': STATIC_MIMES[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readJsonBody(req: IncomingMessage, maxBytes = 64 * 1024): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let total = 0;
    let raw = '';
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        req.destroy();
        reject(new Error('PAYLOAD_TOO_LARGE'));
        return;
      }
      raw += chunk.toString('utf8');
    });
    req.on('end', () => {
      try {
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', reject);
  });
}

function getClientIp(req: IncomingMessage): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress || '0.0.0.0';
}

function authenticateRequest(req: IncomingMessage): AccessTokenPayload | null {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return verifyAccessToken(auth.slice(7).trim());
}

export function createUgetServer(): http.Server {
  return http.createServer(async (req, res) => {
    const correlationId = crypto.randomUUID();
    const clientIp = getClientIp(req);
    const method = (req.method || 'GET').toUpperCase();
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    applySecurityHeaders(res);
    res.setHeader('X-Correlation-Id', correlationId);

    // CORS estrito para origens permitidas
    const origin = req.headers.origin;
    if (origin && env.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
    }

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 1. Rate Limiting Global e Estrito em Auth
    const isAuthRoute = pathname.startsWith('/api/v1/auth/');
    const limitResult = rateLimiter.check(
      `${clientIp}:${isAuthRoute ? 'auth' : 'api'}`,
      isAuthRoute ? 10 : 100,
      60_000
    );
    res.setHeader('X-RateLimit-Remaining', String(limitResult.remaining));
    if (!limitResult.allowed) {
      res.setHeader('Retry-After', String(limitResult.retryAfterSec));
      recordAudit({
        correlationId,
        actorId: null,
        actorRole: 'ANONYMOUS',
        action: 'RATE_LIMIT_EXCEEDED',
        resource: pathname,
        status: 'DENIED',
        ip: clientIp
      });
      sendJson(res, 429, { error: 'Muitas requisições. Tente novamente em instantes.' });
      return;
    }

    // 2. Healthcheck, Emissão de CSRF & Assets Estáticos (Frontend + ugetds)
    if (pathname === '/api/v1/health' && method === 'GET') {
      sendJson(res, 200, { ok: true, service: 'uGet API', modules: [1, 2, 3, 4, 5], security: 'LGPD+OWASP+RBAC' });
      return;
    }

    if (pathname === '/api/v1/security/csrf' && method === 'GET') {
      const csrfToken = issueCsrfCookie(res);
      sendJson(res, 200, { csrfToken });
      return;
    }

    if (method === 'GET' && !pathname.startsWith('/api/')) {
      if (pathname.startsWith('/ugetds/')) {
        const rel = pathname.replace(/^\/ugetds\//, '');
        const candidate = path.normalize(path.join(UGETDS_DIR, rel));
        if (candidate.startsWith(UGETDS_DIR)) {
          serveStatic(res, candidate);
          return;
        }
      }
      const reqFile =
        pathname === '/'
          ? 'index.html'
          : pathname === '/b2b' || pathname === '/b2b/'
            ? 'b2b.html'
            : pathname.replace(/^\/+/, '');
      const candidate = path.normalize(path.join(PUBLIC_DIR, reqFile));
      if (candidate.startsWith(PUBLIC_DIR) && fs.existsSync(candidate)) {
        serveStatic(res, candidate);
        return;
      }
    }

    // 2B. Rotas Públicas de Leitura do Catálogo Geoespacial (Módulo 2)
    if (pathname === '/api/v1/clubs' && method === 'GET') {
      const q = (parsedUrl.searchParams.get('q') || '').trim().toLowerCase();
      const clubs = catalogStore.listClubs().filter((c) => !q || c.name.toLowerCase().includes(q) || c.segment.toLowerCase().includes(q));
      sendJson(res, 200, { clubs });
      return;
    }

    if (pathname === '/api/v1/benefits/nearby' && method === 'GET') {
      const actorOpt = authenticateRequest(req);
      const lat = Number(parsedUrl.searchParams.get('lat') ?? -13.0082);
      const lon = Number(parsedUrl.searchParams.get('lon') ?? -38.5318);
      const radius = Number(parsedUrl.searchParams.get('radius') ?? 5000);
      const category = parsedUrl.searchParams.get('category') || '';
      const q = parsedUrl.searchParams.get('q') || '';
      const clubIdsParam = parsedUrl.searchParams.get('clubIds');
      const hourParam = parsedUrl.searchParams.get('hour');

      const clubIds = clubIdsParam
        ? clubIdsParam.split(',').map((s) => s.trim()).filter(Boolean)
        : actorOpt
          ? catalogStore.getUserClubs(actorOpt.sub)
          : undefined;

      const items = listNearbyBenefits({
        lat: Number.isFinite(lat) ? lat : -13.0082,
        lon: Number.isFinite(lon) ? lon : -38.5318,
        radiusMeters: radius,
        clubIds,
        category,
        query: q,
        userId: actorOpt?.sub || null,
        currentHour: hourParam !== null ? Number(hourParam) : undefined
      });
      sendJson(res, 200, { count: items.length, radiusMeters: radius, items });
      return;
    }

    const benefitDetailMatch = pathname.match(/^\/api\/v1\/benefits\/([a-zA-Z0-9_-]+)$/);
    if (benefitDetailMatch && method === 'GET') {
      const actorOpt = authenticateRequest(req);
      const lat = Number(parsedUrl.searchParams.get('lat') ?? -13.0082);
      const lon = Number(parsedUrl.searchParams.get('lon') ?? -38.5318);
      const item = getBenefitDetail(
        benefitDetailMatch[1],
        Number.isFinite(lat) ? lat : -13.0082,
        Number.isFinite(lon) ? lon : -38.5318,
        actorOpt?.sub || null
      );
      if (!item) {
        sendJson(res, 404, { error: 'Benefício não encontrado.' });
        return;
      }
      sendJson(res, 200, { item });
      return;
    }

    // 3. Proteção Anti-CSRF obrigatória para métodos mutáveis
    const csrfCheck = verifyCsrfProtection(req);
    if (!csrfCheck.ok) {
      recordAudit({
        correlationId,
        actorId: null,
        actorRole: 'ANONYMOUS',
        action: 'CSRF_BLOCKED',
        resource: pathname,
        status: 'DENIED',
        ip: clientIp,
        metadata: { reason: csrfCheck.reason || 'csrf_invalid' }
      });
      sendJson(res, 403, { error: csrfCheck.reason || 'Bloqueado por proteção Anti-CSRF.' });
      return;
    }

    try {
      // 4. Rotas de Autenticação
      if (pathname === '/api/v1/auth/register' && method === 'POST') {
        const body = await readJsonBody(req);
        const created = await registerUser({
          name: body.name,
          email: body.email,
          password: body.password,
          cpf: body.cpf,
          phone: body.phone,
          acceptTerms: Boolean(body.acceptTerms),
          consentGps: Boolean(body.consentGps),
          consentPush: Boolean(body.consentPush),
          ip: clientIp,
          correlationId
        });
        sendJson(res, 201, { user: created });
        return;
      }

      if (pathname === '/api/v1/auth/login' && method === 'POST') {
        const body = await readJsonBody(req);
        const session = await loginUser({
          email: body.email,
          password: body.password,
          ip: clientIp,
          correlationId
        });
        sendJson(res, 200, session);
        return;
      }

      if (pathname === '/api/v1/auth/refresh' && method === 'POST') {
        const body = await readJsonBody(req);
        const rawRefreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : '';
        const rotated = rotateRefreshToken({ rawRefreshToken, ip: clientIp, correlationId });
        sendJson(res, 200, rotated);
        return;
      }

      // 5. Rotas Protegidas por JWT + RBAC
      const actor = authenticateRequest(req);
      if (!actor) {
        sendJson(res, 401, { error: 'Autenticação obrigatória.' });
        return;
      }

      if (pathname === '/api/v1/me' && method === 'GET') {
        const user = securityStore.findUserById(actor.sub);
        if (!user || user.isAnonymized) {
          sendJson(res, 404, { error: 'Usuário não encontrado.' });
          return;
        }
        sendJson(res, 200, {
          id: user.id,
          name: decryptPii(user.nameEncrypted),
          email: decryptPii(user.emailEncrypted),
          role: user.role,
          tenantId: user.tenantId,
          consents: securityStore.getLatestConsentMap(user.id)
        });
        return;
      }

      if (pathname === '/api/v1/me/clubs' && method === 'GET') {
        sendJson(res, 200, { clubIds: catalogStore.getUserClubs(actor.sub) });
        return;
      }

      if (pathname === '/api/v1/me/clubs' && method === 'PUT') {
        const body = await readJsonBody(req);
        const rawIds = Array.isArray(body.clubIds) ? body.clubIds.map(String) : [];
        const saved = catalogStore.setUserClubs(actor.sub, rawIds);
        recordAudit({
          correlationId,
          actorId: actor.sub,
          actorRole: actor.role,
          action: 'USER_CLUBS_UPDATED',
          resource: `user:${actor.sub}:clubs`,
          status: 'SUCCESS',
          ip: clientIp,
          metadata: { count: saved.length }
        });
        sendJson(res, 200, { clubIds: saved });
        return;
      }

      const favMatch = pathname.match(/^\/api\/v1\/benefits\/([a-zA-Z0-9_-]+)\/favorite$/);
      if (favMatch && method === 'POST') {
        const benefitId = favMatch[1];
        if (!catalogStore.getBenefitById(benefitId)) {
          sendJson(res, 404, { error: 'Benefício não encontrado.' });
          return;
        }
        const isFavorite = catalogStore.toggleFavorite(actor.sub, benefitId);
        sendJson(res, 200, { benefitId, isFavorite });
        return;
      }

      if (pathname === '/api/v1/lgpd/consents' && method === 'POST') {
        const body = await readJsonBody(req);
        const purpose = String(body.purpose || '') as LgpdPurpose;
        if (!['terms', 'gps', 'push', 'surveys'].includes(purpose)) {
          sendJson(res, 400, { error: 'Finalidade de consentimento inválida.' });
          return;
        }
        const consent = recordUserConsent({
          userId: actor.sub,
          role: actor.role,
          purpose,
          granted: Boolean(body.granted),
          ip: clientIp,
          correlationId
        });
        sendJson(res, 201, { consent });
        return;
      }

      if (pathname === '/api/v1/lgpd/export' && method === 'GET') {
        const exported = exportUserPersonalData(actor.sub, actor.role, clientIp, correlationId);
        if (!exported) {
          sendJson(res, 404, { error: 'Dados não disponíveis.' });
          return;
        }
        sendJson(res, 200, exported);
        return;
      }

      if (pathname === '/api/v1/lgpd/anonymize' && method === 'POST') {
        const body = await readJsonBody(req);
        if (body.confirm !== 'ANONIMIZAR') {
          sendJson(res, 400, { error: 'Confirmação explícita obrigatória: envie { "confirm": "ANONIMIZAR" }.' });
          return;
        }
        await anonymizeUserAccount(actor.sub, actor.role, clientIp, correlationId);
        pushStore.revokeUserTokens(actor.sub);
        sendJson(res, 200, { ok: true, message: 'Conta anonimizada irreversivelmente e sessões revogadas.' });
        return;
      }

      // 6. Rotas do Módulo 3 — Geofencing & Push Notifications HA
      if (pathname === '/api/v1/push/devices' && method === 'GET') {
        const devices = pushStore.listUserTokens(actor.sub).map((d) => ({
          id: d.id,
          deviceId: d.deviceId,
          platform: d.platform,
          status: d.status,
          rotatedFromTokenId: d.rotatedFromTokenId,
          lastSeenAt: d.lastSeenAt,
          updatedAt: d.updatedAt
        }));
        sendJson(res, 200, { devices });
        return;
      }

      if (pathname === '/api/v1/push/devices' && method === 'POST') {
        const body = await readJsonBody(req);
        const device = registerOrRotateUserDevice({
          userId: actor.sub,
          deviceId: String(body.deviceId || ''),
          platform: String(body.platform || '') as PushPlatform,
          token: String(body.token || ''),
          ip: clientIp,
          correlationId
        });
        sendJson(res, device.rotated ? 200 : 201, { device });
        return;
      }

      if (pathname === '/api/v1/push/preferences' && method === 'GET') {
        sendJson(res, 200, { preferences: pushStore.getPreferences(actor.sub) });
        return;
      }

      if (pathname === '/api/v1/push/preferences' && method === 'PUT') {
        const body = await readJsonBody(req);
        const preferences = pushStore.updatePreferences(actor.sub, {
          radiusMeters: body.radiusMeters !== undefined ? Number(body.radiusMeters) : undefined,
          dndStartHour: body.dndStartHour !== undefined ? Number(body.dndStartHour) : undefined,
          dndEndHour: body.dndEndHour !== undefined ? Number(body.dndEndHour) : undefined,
          cooldownHours: body.cooldownHours !== undefined ? Number(body.cooldownHours) : undefined,
          maxDailyPushes: body.maxDailyPushes !== undefined ? Number(body.maxDailyPushes) : undefined
        });
        sendJson(res, 200, { preferences });
        return;
      }

      if (pathname === '/api/v1/geofencing/ping' && method === 'POST') {
        const body = await readJsonBody(req);
        const lat = Number(body.lat);
        const lon = Number(body.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          sendJson(res, 400, { error: 'Coordenadas lat/lon inválidas.' });
          return;
        }
        const rawHour = body.hour !== undefined ? body.hour : body.currentHour;
        const currentHour = rawHour !== undefined ? Number(rawHour) : undefined;
        const evaluation = evaluateGeofencePing({
          userId: actor.sub,
          lat,
          lon,
          currentHour,
          ip: clientIp,
          correlationId
        });
        const delivery =
          evaluation.enqueuedJobs.length > 0 && body.deferDelivery !== true
            ? await processPushOutboxBatch()
            : { processed: 0, delivered: 0, retried: 0, deadLettered: 0, expiredTokensInvalidated: 0 };
        sendJson(res, 200, { evaluation, delivery });
        return;
      }

      if (pathname === '/api/v1/push/notifications' && method === 'GET') {
        const notifications = pushStore.listUserNotifications(actor.sub, 30);
        sendJson(res, 200, { notifications });
        return;
      }

      if (pathname === '/api/v1/admin/push/health' && method === 'GET') {
        if (!hasPermission(actor.role, 'audit:read_all')) {
          sendJson(res, 403, { error: 'Acesso restrito a SUPER_ADMIN.' });
          return;
        }
        sendJson(res, 200, {
          health: pushStore.getHealthSnapshot(),
          deadLetters: pushStore.listDeadLetters()
        });
        return;
      }

      const dlqReplayMatch = pathname.match(/^\/api\/v1\/admin\/push\/dlq\/([a-zA-Z0-9_-]+)\/replay$/);
      if (dlqReplayMatch && method === 'POST') {
        if (!hasPermission(actor.role, 'audit:read_all')) {
          sendJson(res, 403, { error: 'Acesso restrito a SUPER_ADMIN.' });
          return;
        }
        const replayed = pushStore.replayDeadLetter(dlqReplayMatch[1], Date.now());
        if (!replayed) {
          sendJson(res, 404, { error: 'Job não encontrado na Dead Letter Queue.' });
          return;
        }
        const delivery = await processPushOutboxBatch();
        sendJson(res, 200, { replayed, delivery });
        return;
      }

      // 7. Rotas do Módulo 4 — Carteirinha uGet Pass 3D Offline & Micro-pesquisa Pós-Visita
      if (pathname === '/api/v1/pass/card' && method === 'GET') {
        const card = buildUserPassCard(actor.sub);
        if (!card) {
          sendJson(res, 404, { error: 'Carteirinha indisponível para esta conta.' });
          return;
        }
        sendJson(res, 200, { card });
        return;
      }

      if (pathname === '/api/v1/pass/redeem' && method === 'POST') {
        const body = await readJsonBody(req);
        const redemption = issueBenefitPassRedemption({
          userId: actor.sub,
          benefitId: String(body.benefitId || ''),
          ip: clientIp,
          correlationId
        });
        sendJson(res, 201, { redemption });
        return;
      }

      if (pathname === '/api/v1/pass/verify' && method === 'POST') {
        const body = await readJsonBody(req);
        const result = verifyAndValidatePassCode({
          signedCode: String(body.signedCode || ''),
          actorId: actor.sub,
          actorRole: actor.role,
          ip: clientIp,
          correlationId
        });
        sendJson(res, result.valid ? 200 : 400, result);
        return;
      }

      if (pathname === '/api/v1/surveys' && method === 'POST') {
        const body = await readJsonBody(req);
        const result = submitPostVisitSurvey({
          userId: actor.sub,
          benefitId: String(body.benefitId || ''),
          redemptionId: body.redemptionId ? String(body.redemptionId) : null,
          rating: Number(body.rating),
          discountHonored: body.discountHonored !== false,
          savedEstimateBrl: body.savedEstimateBrl !== undefined ? Number(body.savedEstimateBrl) : 0,
          comment: body.comment ? String(body.comment) : '',
          ip: clientIp,
          correlationId
        });
        sendJson(res, 201, result);
        return;
      }

      if (pathname === '/api/v1/surveys/me' && method === 'GET') {
        const surveys = passStore.listUserSurveys(actor.sub);
        const totalSavedBrl = Number(
          surveys.reduce((acc, s) => acc + s.savedEstimateBrl, 0).toFixed(2)
        );
        sendJson(res, 200, { surveys, totalSavedBrl });
        return;
      }

      // 8. Rotas do Módulo 5 — Portal Web B2B Multi-Tenant (Clubes & Parceiros)
      if (pathname === '/api/v1/b2b/dashboard' && method === 'GET') {
        const dashboard = getTenantDashboard(actor);
        sendJson(res, 200, dashboard);
        return;
      }

      if (pathname === '/api/v1/b2b/benefits' && method === 'GET') {
        const benefits = listTenantScopedBenefits(actor);
        sendJson(res, 200, { benefits });
        return;
      }

      if (pathname === '/api/v1/b2b/benefits' && method === 'POST') {
        const body = await readJsonBody(req);
        const benefit = createTenantBenefit(
          actor,
          {
            clubId: String(body.clubId || ''),
            partnerId: String(body.partnerId || ''),
            title: String(body.title || ''),
            discountLabel: String(body.discountLabel || ''),
            rules: String(body.rules || ''),
            validFromHour: body.validFromHour !== undefined ? Number(body.validFromHour) : undefined,
            validToHour: body.validToHour !== undefined ? Number(body.validToHour) : undefined,
            isVip: Boolean(body.isVip)
          },
          { ip: clientIp, correlationId }
        );
        sendJson(res, 201, { benefit });
        return;
      }

      const b2bStatusMatch = pathname.match(/^\/api\/v1\/b2b\/benefits\/([a-zA-Z0-9_-]+)\/status$/);
      if (b2bStatusMatch && method === 'PATCH') {
        const body = await readJsonBody(req);
        const benefit = toggleTenantBenefitStatus(
          actor,
          b2bStatusMatch[1],
          Boolean(body.isActive),
          { ip: clientIp, correlationId }
        );
        sendJson(res, 200, { benefit });
        return;
      }

      if (pathname === '/api/v1/b2b/checkout/validate' && method === 'POST') {
        const body = await readJsonBody(req);
        const result = validatePassAtB2bCheckout(
          actor,
          String(body.signedCode || ''),
          { ip: clientIp, correlationId }
        );
        sendJson(res, result.valid ? 200 : 400, result);
        return;
      }

      // Rota Multi-Tenant protegida por RBAC (Clube/Parceiro só vê o próprio tenant)
      const tenantMatch = pathname.match(/^\/api\/v1\/tenants\/([a-zA-Z0-9_-]+)\/reports$/);
      if (tenantMatch && method === 'GET') {
        const targetTenantId = tenantMatch[1];
        if (!hasPermission(actor.role, 'reports:read_tenant') || !assertTenantAccess(actor, targetTenantId)) {
          recordAudit({
            correlationId,
            actorId: actor.sub,
            actorRole: actor.role,
            action: 'RBAC_TENANT_ACCESS',
            resource: pathname,
            status: 'DENIED',
            ip: clientIp
          });
          sendJson(res, 403, { error: 'Acesso negado para este escopo/tenant (RBAC).' });
          return;
        }
        sendJson(res, 200, {
          tenantId: targetTenantId,
          aggregatedOnly: true,
          metrics: { alertsSent: 0, opens: 0, routeClicks: 0 }
        });
        return;
      }

      // Rota de Auditoria estrita para SUPER_ADMIN
      if (pathname === '/api/v1/admin/audit-logs' && method === 'GET') {
        if (!hasPermission(actor.role, 'audit:read_all')) {
          recordAudit({
            correlationId,
            actorId: actor.sub,
            actorRole: actor.role,
            action: 'RBAC_AUDIT_READ',
            resource: pathname,
            status: 'DENIED',
            ip: clientIp
          });
          sendJson(res, 403, { error: 'Acesso restrito a SUPER_ADMIN.' });
          return;
        }
        sendJson(res, 200, { logs: securityStore.listAuditLogs(50) });
        return;
      }

      sendJson(res, 404, { error: 'Rota não encontrada.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro interno';
      if (msg === 'INVALID_JSON') return sendJson(res, 400, { error: 'JSON inválido.' });
      if (msg === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { error: 'Payload excede o limite permitido.' });
      if (msg.startsWith('VALIDATION:')) return sendJson(res, 400, { error: msg.slice(11) });
      if (msg.startsWith('FORBIDDEN:')) return sendJson(res, 403, { error: msg.slice(10) });
      if (msg.startsWith('CONFLICT:')) return sendJson(res, 409, { error: msg.slice(9) });
      if (msg.startsWith('UNAUTHORIZED:')) return sendJson(res, 401, { error: msg.slice(13) });
      sendJson(res, 500, { error: 'Erro interno no servidor.' });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Seed de contas demo B2B apenas para uso local em dev (não afeta testes isolados)
  Promise.all([
    registerUser({
      name: 'Gestor OAB-BA',
      email: 'gestor@oab-ba.uget.app',
      password: 'UgetOabDemoPassword2026',
      role: ROLES.CLUB_MANAGER,
      tenantId: 'club-oab-ba',
      acceptTerms: true
    }).catch(() => {}),
    registerUser({
      name: 'Gerente Drogaria Vida',
      email: 'parceiro@drogaria.uget.app',
      password: 'UgetPartnerDemoPassword2026',
      role: ROLES.PARTNER_MANAGER,
      tenantId: 'ptr-drogaria-vida',
      acceptTerms: true
    }).catch(() => {})
  ]).finally(() => {
    const server = createUgetServer();
    server.listen(env.port, () => {
      console.log(`\n🛡️  uGet Platform (Módulos 1–5) ativa em http://localhost:${env.port}`);
      console.log(`   • App Associado: http://localhost:${env.port}/`);
      console.log(`   • Portal B2B:    http://localhost:${env.port}/b2b\n`);
    });
  });
}
