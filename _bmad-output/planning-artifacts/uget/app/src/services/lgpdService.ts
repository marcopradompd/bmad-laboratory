/**
 * uGet — Serviço de Conformidade LGPD (RF-17 / RNF-08)
 * - Registro imutável de consentimentos granulares (terms, gps, push, surveys)
 * - Portabilidade de dados pessoais em JSON (descriptografando apenas para o titular autenticado)
 * - Anonimização irreversível (Direito ao Esquecimento) com revogação imediata de sessões
 */
import crypto from 'node:crypto';
import { env } from '../config/env.ts';
import { securityStore } from '../repositories/securityStore.ts';
import { decryptPii, encryptPii, hashPassword, sha256Hex } from '../security/cryptoService.ts';
import { recordAudit } from './auditService.ts';
import type { LgpdPurpose, UgetRole } from '../types/security.ts';

export function recordUserConsent(params: {
  userId: string;
  role: UgetRole;
  purpose: LgpdPurpose;
  granted: boolean;
  channel?: string;
  ip?: string | null;
  correlationId?: string;
}) {
  const consent = securityStore.appendConsent({
    userId: params.userId,
    purpose: params.purpose,
    granted: params.granted,
    policyVersion: env.policyVersion,
    channel: params.channel || 'app',
    ipHash: params.ip ? sha256Hex(params.ip) : null
  });

  recordAudit({
    correlationId: params.correlationId,
    actorId: params.userId,
    actorRole: params.role,
    action: 'LGPD_CONSENT_RECORDED',
    resource: `consent:${params.purpose}`,
    status: 'SUCCESS',
    ip: params.ip,
    metadata: { granted: params.granted, policyVersion: env.policyVersion }
  });

  return consent;
}

export function exportUserPersonalData(userId: string, role: UgetRole, ip?: string | null, correlationId?: string) {
  const user = securityStore.findUserById(userId);
  if (!user || user.isAnonymized) return null;

  recordAudit({
    correlationId,
    actorId: userId,
    actorRole: role,
    action: 'LGPD_DATA_EXPORT',
    resource: `user:${userId}`,
    status: 'SUCCESS',
    ip
  });

  return {
    exportedAt: new Date().toISOString(),
    policyVersion: env.policyVersion,
    profile: {
      id: user.id,
      name: decryptPii(user.nameEncrypted),
      email: decryptPii(user.emailEncrypted),
      cpf: user.cpfEncrypted ? decryptPii(user.cpfEncrypted) : null,
      phone: user.phoneEncrypted ? decryptPii(user.phoneEncrypted) : null,
      role: user.role,
      createdAt: user.createdAt
    },
    consentsHistory: securityStore.getUserConsents(userId)
  };
}

/**
 * Anonimização irreversível (Art. 18 LGPD):
 * Substitui toda PII por identificadores pseudonimizados descartáveis,
 * invalida a senha e revoga todos os refresh tokens do usuário.
 */
export async function anonymizeUserAccount(userId: string, role: UgetRole, ip?: string | null, correlationId?: string) {
  const user = securityStore.findUserById(userId);
  if (!user) return false;

  const anonId = `anon_${crypto.randomBytes(8).toString('hex')}`;
  const anonEmail = `${anonId}@anonymized.uget.local`;
  const unusablePassword = await hashPassword(crypto.randomBytes(32).toString('hex'));

  securityStore.updateUser(userId, {
    emailHash: sha256Hex(anonEmail),
    emailEncrypted: encryptPii(anonEmail),
    nameEncrypted: encryptPii('Usuário Anonimizado'),
    cpfEncrypted: null,
    phoneEncrypted: null,
    passwordHash: unusablePassword,
    isAnonymized: true,
    anonymizedAt: new Date().toISOString()
  });

  securityStore.revokeAllUserTokens(userId);

  // Registra revogação de todos os consentimentos opcionais
  for (const purpose of ['gps', 'push', 'surveys'] as LgpdPurpose[]) {
    securityStore.appendConsent({
      userId,
      purpose,
      granted: false,
      policyVersion: env.policyVersion,
      channel: 'lgpd_anonymize',
      ipHash: ip ? sha256Hex(ip) : null
    });
  }

  recordAudit({
    correlationId,
    actorId: userId,
    actorRole: role,
    action: 'LGPD_ACCOUNT_ANONYMIZED',
    resource: `user:${userId}`,
    status: 'SUCCESS',
    ip
  });

  return true;
}
