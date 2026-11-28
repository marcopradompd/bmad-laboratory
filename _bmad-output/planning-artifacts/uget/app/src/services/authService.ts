/**
 * uGet — Serviço de Autenticação Segura (Cadastro, Login, Refresh Rotacionável, Logout)
 */
import crypto from 'node:crypto';
import { env } from '../config/env.ts';
import { securityStore } from '../repositories/securityStore.ts';
import {
  decryptPii,
  encryptPii,
  hashPassword,
  sha256Hex,
  verifyPassword
} from '../security/cryptoService.ts';
import {
  generateOpaqueRefreshToken,
  hashRefreshToken,
  signAccessToken
} from '../security/tokenService.ts';
import {
  isStrongPassword,
  isValidEmail,
  sanitizeCpf,
  sanitizeText
} from '../security/owaspGuard.ts';
import { recordAudit } from './auditService.ts';
import { recordUserConsent } from './lgpdService.ts';
import { ROLES, type UgetRole } from '../types/security.ts';

export async function registerUser(params: {
  name: unknown;
  email: unknown;
  password: unknown;
  cpf?: unknown;
  phone?: unknown;
  role?: UgetRole;
  tenantId?: string | null;
  acceptTerms: boolean;
  consentGps?: boolean;
  consentPush?: boolean;
  ip?: string | null;
  correlationId?: string;
}) {
  const name = sanitizeText(params.name, 100);
  const email = sanitizeText(params.email, 254).toLowerCase();
  const password = typeof params.password === 'string' ? params.password : '';
  const cpf = sanitizeCpf(params.cpf);
  const phone = params.phone ? sanitizeText(params.phone, 24) : null;

  if (name.length < 2) throw new Error('VALIDATION:Nome deve ter ao menos 2 caracteres.');
  if (!isValidEmail(email)) throw new Error('VALIDATION:E-mail inválido.');
  if (!isStrongPassword(password)) {
    throw new Error('VALIDATION:Senha deve ter mínimo 10 caracteres, com maiúscula, minúscula e número.');
  }
  if (!params.acceptTerms) {
    throw new Error('VALIDATION:Aceite dos Termos e Política LGPD é obrigatório.');
  }

  const emailHash = sha256Hex(email);
  if (securityStore.findUserByEmailHash(emailHash)) {
    throw new Error('CONFLICT:E-mail já cadastrado.');
  }

  const passwordHash = await hashPassword(password);
  const role: UgetRole = params.role || ROLES.USER_ASSOCIATE;

  const user = securityStore.createUser({
    emailHash,
    emailEncrypted: encryptPii(email),
    nameEncrypted: encryptPii(name),
    cpfEncrypted: cpf ? encryptPii(cpf) : null,
    phoneEncrypted: phone ? encryptPii(phone) : null,
    passwordHash,
    role,
    tenantId: params.tenantId || null,
    isAnonymized: false,
    anonymizedAt: null
  });

  // Registra consentimentos iniciais LGPD
  recordUserConsent({ userId: user.id, role: user.role, purpose: 'terms', granted: true, ip: params.ip, correlationId: params.correlationId });
  recordUserConsent({ userId: user.id, role: user.role, purpose: 'gps', granted: Boolean(params.consentGps), ip: params.ip, correlationId: params.correlationId });
  recordUserConsent({ userId: user.id, role: user.role, purpose: 'push', granted: Boolean(params.consentPush), ip: params.ip, correlationId: params.correlationId });

  recordAudit({
    correlationId: params.correlationId,
    actorId: user.id,
    actorRole: user.role,
    action: 'AUTH_REGISTER',
    resource: `user:${user.id}`,
    status: 'SUCCESS',
    ip: params.ip
  });

  return {
    id: user.id,
    name,
    email,
    role: user.role,
    tenantId: user.tenantId
  };
}

export async function loginUser(params: {
  email: unknown;
  password: unknown;
  ip?: string | null;
  correlationId?: string;
}) {
  const email = sanitizeText(params.email, 254).toLowerCase();
  const password = typeof params.password === 'string' ? params.password : '';
  const user = securityStore.findUserByEmailHash(sha256Hex(email));

  if (!user || user.isAnonymized || !(await verifyPassword(password, user.passwordHash))) {
    recordAudit({
      correlationId: params.correlationId,
      actorId: user ? user.id : null,
      actorRole: user ? user.role : 'ANONYMOUS',
      action: 'AUTH_LOGIN',
      resource: 'auth:login',
      status: 'DENIED',
      ip: params.ip,
      metadata: { reason: 'invalid_credentials' }
    });
    throw new Error('UNAUTHORIZED:Credenciais inválidas.');
  }

  const accessToken = signAccessToken({ id: user.id, role: user.role, tenantId: user.tenantId });
  const { rawToken: refreshToken, tokenHash } = generateOpaqueRefreshToken();
  const familyId = crypto.randomUUID();

  securityStore.saveRefreshToken({
    userId: user.id,
    tokenHash,
    familyId,
    revoked: false,
    expiresAt: new Date(Date.now() + env.jwtRefreshTtlSeconds * 1000).toISOString()
  });

  recordAudit({
    correlationId: params.correlationId,
    actorId: user.id,
    actorRole: user.role,
    action: 'AUTH_LOGIN',
    resource: `user:${user.id}`,
    status: 'SUCCESS',
    ip: params.ip
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: env.jwtAccessTtlSeconds,
    user: {
      id: user.id,
      name: decryptPii(user.nameEncrypted),
      email: decryptPii(user.emailEncrypted),
      role: user.role,
      tenantId: user.tenantId
    }
  };
}

export function rotateRefreshToken(params: {
  rawRefreshToken: string;
  ip?: string | null;
  correlationId?: string;
}) {
  const tokenHash = hashRefreshToken(params.rawRefreshToken);
  const stored = securityStore.findRefreshToken(tokenHash);

  if (!stored) {
    throw new Error('UNAUTHORIZED:Refresh token inválido.');
  }

  // Detecção de reuso de token revogado -> revoga TODA a família de sessões!
  if (stored.revoked) {
    securityStore.revokeTokenFamily(stored.familyId);
    recordAudit({
      correlationId: params.correlationId,
      actorId: stored.userId,
      actorRole: 'ANONYMOUS',
      action: 'AUTH_REFRESH_REUSE_DETECTED',
      resource: `token_family:${stored.familyId}`,
      status: 'DENIED',
      ip: params.ip
    });
    throw new Error('UNAUTHORIZED:Reuso de token detectado. Todas as sessões foram revogadas.');
  }

  if (new Date(stored.expiresAt).getTime() <= Date.now()) {
    securityStore.revokeRefreshToken(tokenHash);
    throw new Error('UNAUTHORIZED:Refresh token expirado.');
  }

  const user = securityStore.findUserById(stored.userId);
  if (!user || user.isAnonymized) {
    securityStore.revokeTokenFamily(stored.familyId);
    throw new Error('UNAUTHORIZED:Usuário indisponível.');
  }

  // Revoga o token atual e emite o próximo na mesma família
  securityStore.revokeRefreshToken(tokenHash);
  const { rawToken: nextRefreshToken, tokenHash: nextHash } = generateOpaqueRefreshToken();
  securityStore.saveRefreshToken({
    userId: user.id,
    tokenHash: nextHash,
    familyId: stored.familyId,
    revoked: false,
    expiresAt: new Date(Date.now() + env.jwtRefreshTtlSeconds * 1000).toISOString()
  });

  const accessToken = signAccessToken({ id: user.id, role: user.role, tenantId: user.tenantId });
  return {
    accessToken,
    refreshToken: nextRefreshToken,
    expiresIn: env.jwtAccessTtlSeconds
  };
}
