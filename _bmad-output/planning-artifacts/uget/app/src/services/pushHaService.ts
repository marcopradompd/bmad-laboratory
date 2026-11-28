/**
 * uGet — Push Notifications HA Worker (Módulo 3)
 * - Fila persistente com Idempotência
 * - Retries automáticos com Exponential Backoff + Jitter
 * - Renovação transparente e invalidação automática de tokens expirados
 * - Dead Letter Queue (DLQ) + Replay sob demanda
 */
import crypto from 'node:crypto';
import type { PushDeliveryProvider, PushPlatform } from '../types/push.ts';
import { pushStore } from '../repositories/pushStore.ts';
import { decryptPii } from '../security/cryptoService.ts';
import { recordAudit } from './auditService.ts';
import { ROLES } from '../types/security.ts';

/**
 * Provider padrão (simula entrega imediata FCM/APNs/WebPush em ambiente local/dev).
 * Em produção, injeta-se o adaptador HTTP/2 para APNs + FCM v1 + VAPID WebPush.
 */
export const defaultPushProvider: PushDeliveryProvider = {
  async send({ platform, idempotencyKey }) {
    return {
      status: 'OK',
      providerMessageId: `${platform}_msg_${crypto.createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 12)}`
    };
  }
};

let activeProvider: PushDeliveryProvider = defaultPushProvider;

export function setPushDeliveryProvider(provider: PushDeliveryProvider): void {
  activeProvider = provider;
}

export function resetPushDeliveryProvider(): void {
  activeProvider = defaultPushProvider;
}

/**
 * Calcula Exponential Backoff com Jitter (evita thundering herd em recuperações de SLA).
 */
export function computeBackoffWithJitterMs(
  attemptNumber: number,
  baseDelayMs = 1000,
  maxDelayMs = 60_000,
  randomFn: () => number = Math.random
): number {
  const exp = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, Math.max(0, attemptNumber - 1)));
  // Equal jitter: metade fixa + metade aleatória para previsibilidade e dispersão
  const half = Math.floor(exp / 2);
  return half + Math.floor(randomFn() * Math.max(1, half));
}

export function registerOrRotateUserDevice(input: {
  userId: string;
  deviceId: string;
  platform: PushPlatform;
  token: string;
  ip?: string;
  correlationId?: string;
}) {
  if (!input.deviceId || input.deviceId.trim().length < 3) {
    throw new Error('VALIDATION:deviceId inválido.');
  }
  if (!['fcm', 'apns', 'webpush'].includes(input.platform)) {
    throw new Error('VALIDATION:platform deve ser fcm, apns ou webpush.');
  }
  if (!input.token || input.token.trim().length < 12) {
    throw new Error('VALIDATION:push token inválido.');
  }

  const result = pushStore.registerOrRotateToken({
    userId: input.userId,
    deviceId: input.deviceId.trim(),
    platform: input.platform,
    rawToken: input.token.trim()
  });

  recordAudit({
    correlationId: input.correlationId || crypto.randomUUID(),
    actorId: input.userId,
    actorRole: ROLES.USER,
    action: result.rotated ? 'PUSH_TOKEN_ROTATED' : 'PUSH_TOKEN_REGISTERED',
    resource: `device:${input.deviceId.trim()}`,
    status: 'SUCCESS',
    ip: input.ip || '0.0.0.0',
    metadata: { platform: input.platform, rotated: result.rotated }
  });

  return {
    id: result.record.id,
    deviceId: result.record.deviceId,
    platform: result.record.platform,
    status: result.record.status,
    rotated: result.rotated,
    updatedAt: result.record.updatedAt
  };
}

export interface ProcessBatchSummary {
  processed: number;
  delivered: number;
  retried: number;
  deadLettered: number;
  expiredTokensInvalidated: number;
}

/**
 * Processa todos os jobs elegíveis da fila Outbox (PENDING ou RETRY_SCHEDULED vencidos).
 */
export async function processPushOutboxBatch(options?: {
  nowMs?: number;
  baseDelayMs?: number;
  randomFn?: () => number;
}): Promise<ProcessBatchSummary> {
  const nowMs = options?.nowMs ?? Date.now();
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  const dueJobs = pushStore.listDueJobs(nowMs);

  const summary: ProcessBatchSummary = {
    processed: 0,
    delivered: 0,
    retried: 0,
    deadLettered: 0,
    expiredTokensInvalidated: 0
  };

  for (const job of dueJobs) {
    summary.processed++;
    const activeTokens = pushStore.listUserTokens(job.userId, true);

    if (activeTokens.length === 0) {
      pushStore.moveJobToDeadLetter(job.id, 'NO_ACTIVE_DEVICE_TOKENS', nowMs);
      summary.deadLettered++;
      continue;
    }

    let deliveredMessageId: string | null = null;
    let lastTransientError: string | null = null;
    let permanentError: string | null = null;

    for (const tokenRec of activeTokens) {
      const rawToken = decryptPii(tokenRec.tokenEncrypted);
      const outcome = await activeProvider.send({
        platform: tokenRec.platform,
        token: rawToken,
        title: job.title,
        body: job.body,
        deepLink: job.deepLink,
        idempotencyKey: job.idempotencyKey
      });

      if (outcome.status === 'OK') {
        deliveredMessageId = outcome.providerMessageId;
        break;
      }
      if (outcome.status === 'TOKEN_EXPIRED') {
        pushStore.markTokenExpired(tokenRec.id);
        summary.expiredTokensInvalidated++;
        continue;
      }
      if (outcome.status === 'TRANSIENT_ERROR') {
        lastTransientError = outcome.error;
        continue;
      }
      if (outcome.status === 'PERMANENT_ERROR') {
        permanentError = outcome.error;
      }
    }

    if (deliveredMessageId) {
      pushStore.markJobDelivered(job.id, deliveredMessageId, nowMs);
      summary.delivered++;
      continue;
    }

    if (permanentError) {
      pushStore.moveJobToDeadLetter(job.id, `PERMANENT_ERROR:${permanentError}`, nowMs);
      summary.deadLettered++;
      continue;
    }

    // Se todos os tokens expiraram e não há erro transiente para retry
    const remainingActive = pushStore.listUserTokens(job.userId, true);
    if (remainingActive.length === 0 && !lastTransientError) {
      pushStore.moveJobToDeadLetter(job.id, 'ALL_TOKENS_EXPIRED', nowMs);
      summary.deadLettered++;
      continue;
    }

    // Erro transiente: aplica backoff exponencial + jitter ou envia para DLQ se esgotou tentativas
    const nextAttemptNumber = job.attempts + 1;
    if (nextAttemptNumber >= job.maxAttempts) {
      pushStore.moveJobToDeadLetter(
        job.id,
        `MAX_ATTEMPTS_EXCEEDED:${lastTransientError || 'UNKNOWN'}`,
        nowMs
      );
      summary.deadLettered++;
    } else {
      const delay = computeBackoffWithJitterMs(nextAttemptNumber, baseDelayMs, 60_000, options?.randomFn);
      pushStore.scheduleJobRetry(job.id, nowMs + delay, lastTransientError || 'TRANSIENT_ERROR', nowMs);
      summary.retried++;
    }
  }

  return summary;
}
