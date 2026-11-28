/**
 * uGet — Serviço de Logs de Auditoria Imutáveis (RNF-09)
 * Garante remoção automática de chaves sensíveis (password, token, cpf, email) antes de gravar.
 */
import crypto from 'node:crypto';
import { securityStore } from '../repositories/securityStore.ts';
import { sha256Hex } from '../security/cryptoService.ts';
import type { AuditLogRecord, UgetRole } from '../types/security.ts';

const FORBIDDEN_LOG_KEYS = new Set(['password', 'passwordhash', 'token', 'refreshtoken', 'cpf', 'email', 'phone']);

function sanitizeMetadata(meta: Record<string, unknown> = {}): Record<string, string | number | boolean | null> {
  const clean: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (FORBIDDEN_LOG_KEYS.has(k.toLowerCase())) {
      clean[k] = '[REDACTED]';
      continue;
    }
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) {
      clean[k] = v;
    } else {
      clean[k] = String(v).slice(0, 120);
    }
  }
  return clean;
}

export function recordAudit(params: {
  correlationId?: string;
  actorId: string | null;
  actorRole: UgetRole | 'ANONYMOUS';
  action: string;
  resource: string;
  status: 'SUCCESS' | 'DENIED' | 'ERROR';
  ip?: string | null;
  metadata?: Record<string, unknown>;
}): AuditLogRecord {
  return securityStore.appendAuditLog({
    correlationId: params.correlationId || crypto.randomUUID(),
    actorId: params.actorId,
    actorRole: params.actorRole,
    action: params.action,
    resource: params.resource,
    status: params.status,
    ipHash: params.ip ? sha256Hex(params.ip) : null,
    metadata: sanitizeMetadata(params.metadata)
  });
}
