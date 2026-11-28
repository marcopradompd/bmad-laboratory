/**
 * uGet — Repositório de Geofencing & Push Notifications HA (Módulo 3)
 * Armazena tokens criptografados, preferências, cooldowns anti-spam (RN-02),
 * fila Outbox com idempotência e Dead Letter Queue (DLQ).
 */
import crypto from 'node:crypto';
import type {
  DevicePushTokenRecord,
  PushDeadLetterEntry,
  PushOutboxJob,
  PushPlatform,
  UserNotificationPreferences
} from '../types/push.ts';
import { encryptPii } from '../security/cryptoService.ts';

function hashToken(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export const DEFAULT_PREFS = {
  radiusMeters: 500,
  dndStartHour: 22,
  dndEndHour: 7,
  cooldownHours: 24,
  maxDailyPushes: 6
};

export class InMemoryPushStore {
  private tokens = new Map<string, DevicePushTokenRecord>();
  private prefs = new Map<string, UserNotificationPreferences>();
  private cooldowns = new Map<string, number>(); // key: `${userId}:${unitId}` -> epoch ms
  private dailyCounts = new Map<string, number>(); // key: `${userId}:${YYYY-MM-DD}` -> count
  private outbox = new Map<string, PushOutboxJob>();
  private idempotencyIndex = new Map<string, string>(); // idempotencyKey -> jobId
  private dlq = new Map<string, PushDeadLetterEntry>();

  private metrics = {
    enqueued: 0,
    delivered: 0,
    retried: 0,
    deadLettered: 0,
    tokensRotated: 0,
    tokensInvalidated: 0
  };

  // --- Preferências do Usuário ---
  getPreferences(userId: string): UserNotificationPreferences {
    const existing = this.prefs.get(userId);
    if (existing) return { ...existing };
    return {
      userId,
      ...DEFAULT_PREFS,
      updatedAt: new Date().toISOString()
    };
  }

  updatePreferences(
    userId: string,
    patch: Partial<Omit<UserNotificationPreferences, 'userId' | 'updatedAt'>>
  ): UserNotificationPreferences {
    const current = this.getPreferences(userId);
    const updated: UserNotificationPreferences = {
      userId,
      radiusMeters:
        patch.radiusMeters !== undefined
          ? Math.max(100, Math.min(15000, Math.round(patch.radiusMeters)))
          : current.radiusMeters,
      dndStartHour:
        patch.dndStartHour !== undefined
          ? Math.max(0, Math.min(23, Math.round(patch.dndStartHour)))
          : current.dndStartHour,
      dndEndHour:
        patch.dndEndHour !== undefined
          ? Math.max(0, Math.min(23, Math.round(patch.dndEndHour)))
          : current.dndEndHour,
      cooldownHours:
        patch.cooldownHours !== undefined
          ? Math.max(1, Math.min(168, Math.round(patch.cooldownHours)))
          : current.cooldownHours,
      maxDailyPushes:
        patch.maxDailyPushes !== undefined
          ? Math.max(1, Math.min(30, Math.round(patch.maxDailyPushes)))
          : current.maxDailyPushes,
      updatedAt: new Date().toISOString()
    };
    this.prefs.set(userId, updated);
    return { ...updated };
  }

  // --- Dispositivos & Renovação Transparente de Tokens ---
  registerOrRotateToken(input: {
    userId: string;
    deviceId: string;
    platform: PushPlatform;
    rawToken: string;
    expiresAt?: string | null;
  }): { record: DevicePushTokenRecord; rotated: boolean } {
    const nowIso = new Date().toISOString();
    const newHash = hashToken(`${input.platform}:${input.rawToken}`);
    let rotatedFromId: string | null = null;

    // Verifica se já existe token ativo para o mesmo userId + deviceId
    for (const existing of this.tokens.values()) {
      if (existing.userId === input.userId && existing.deviceId === input.deviceId && existing.status === 'ACTIVE') {
        if (existing.tokenHash === newHash) {
          existing.lastSeenAt = nowIso;
          existing.updatedAt = nowIso;
          return { record: { ...existing }, rotated: false };
        }
        // Rotação transparente: marca o anterior como ROTATED e cria novo ACTIVE
        existing.status = 'ROTATED';
        existing.updatedAt = nowIso;
        rotatedFromId = existing.id;
        this.metrics.tokensRotated++;
      }
    }

    const record: DevicePushTokenRecord = {
      id: crypto.randomUUID(),
      userId: input.userId,
      deviceId: input.deviceId,
      platform: input.platform,
      tokenEncrypted: encryptPii(input.rawToken),
      tokenHash: newHash,
      status: 'ACTIVE',
      rotatedFromTokenId: rotatedFromId,
      lastSeenAt: nowIso,
      expiresAt: input.expiresAt ?? null,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    this.tokens.set(record.id, record);
    return { record: { ...record }, rotated: Boolean(rotatedFromId) };
  }

  listUserTokens(userId: string, onlyActive = false): DevicePushTokenRecord[] {
    return Array.from(this.tokens.values())
      .filter((t) => t.userId === userId && (!onlyActive || t.status === 'ACTIVE'))
      .map((t) => ({ ...t }));
  }

  markTokenExpired(tokenId: string): void {
    const rec = this.tokens.get(tokenId);
    if (rec && rec.status === 'ACTIVE') {
      rec.status = 'EXPIRED';
      rec.updatedAt = new Date().toISOString();
      this.metrics.tokensInvalidated++;
    }
  }

  revokeUserTokens(userId: string): void {
    const nowIso = new Date().toISOString();
    for (const rec of this.tokens.values()) {
      if (rec.userId === userId && rec.status === 'ACTIVE') {
        rec.status = 'REVOKED';
        rec.updatedAt = nowIso;
      }
    }
  }

  // --- Cooldown Anti-Spam (RN-02) & Limite Diário ---
  isInCooldown(userId: string, partnerUnitId: string, cooldownHours: number, nowMs: number): boolean {
    const lastMs = this.cooldowns.get(`${userId}:${partnerUnitId}`);
    if (!lastMs) return false;
    return nowMs - lastMs < cooldownHours * 3600 * 1000;
  }

  recordCooldown(userId: string, partnerUnitId: string, nowMs: number): void {
    this.cooldowns.set(`${userId}:${partnerUnitId}`, nowMs);
  }

  getDailyCount(userId: string, dateKey: string): number {
    return this.dailyCounts.get(`${userId}:${dateKey}`) || 0;
  }

  incrementDailyCount(userId: string, dateKey: string): number {
    const key = `${userId}:${dateKey}`;
    const next = (this.dailyCounts.get(key) || 0) + 1;
    this.dailyCounts.set(key, next);
    return next;
  }

  // --- Fila Transacional Outbox com Idempotência ---
  enqueueJob(input: {
    idempotencyKey: string;
    userId: string;
    benefitId: string;
    partnerUnitId: string;
    title: string;
    body: string;
    deepLink: string;
    discountLabel: string;
    distanceLabel: string;
    maxAttempts?: number;
    nowMs?: number;
  }): { job: PushOutboxJob; deduplicated: boolean } {
    const existingId = this.idempotencyIndex.get(input.idempotencyKey);
    if (existingId) {
      const existing = this.outbox.get(existingId)!;
      return { job: { ...existing }, deduplicated: true };
    }

    const nowMs = input.nowMs ?? Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const job: PushOutboxJob = {
      id: crypto.randomUUID(),
      idempotencyKey: input.idempotencyKey,
      userId: input.userId,
      benefitId: input.benefitId,
      partnerUnitId: input.partnerUnitId,
      title: input.title,
      body: input.body,
      deepLink: input.deepLink,
      discountLabel: input.discountLabel,
      distanceLabel: input.distanceLabel,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 4,
      nextAttemptAt: nowMs,
      providerMessageId: null,
      lastError: null,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    this.outbox.set(job.id, job);
    this.idempotencyIndex.set(job.idempotencyKey, job.id);
    this.metrics.enqueued++;
    return { job: { ...job }, deduplicated: false };
  }

  listDueJobs(nowMs: number): PushOutboxJob[] {
    return Array.from(this.outbox.values()).filter(
      (j) => (j.status === 'PENDING' || j.status === 'RETRY_SCHEDULED') && j.nextAttemptAt <= nowMs
    );
  }

  getJobById(jobId: string): PushOutboxJob | null {
    const job = this.outbox.get(jobId);
    return job ? { ...job } : null;
  }

  listUserNotifications(userId: string, limit = 30): PushOutboxJob[] {
    return Array.from(this.outbox.values())
      .filter((j) => j.userId === userId && j.status === 'DELIVERED')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit)
      .map((j) => ({ ...j }));
  }

  markJobDelivered(jobId: string, providerMessageId: string, nowMs: number): void {
    const job = this.outbox.get(jobId);
    if (!job) return;
    job.attempts += 1;
    job.status = 'DELIVERED';
    job.providerMessageId = providerMessageId;
    job.lastError = null;
    job.updatedAt = new Date(nowMs).toISOString();
    this.metrics.delivered++;
  }

  scheduleJobRetry(jobId: string, nextAttemptAt: number, error: string, nowMs: number): void {
    const job = this.outbox.get(jobId);
    if (!job) return;
    job.attempts += 1;
    job.status = 'RETRY_SCHEDULED';
    job.nextAttemptAt = nextAttemptAt;
    job.lastError = error;
    job.updatedAt = new Date(nowMs).toISOString();
    this.metrics.retried++;
  }

  moveJobToDeadLetter(jobId: string, reason: string, nowMs: number): PushDeadLetterEntry | null {
    const job = this.outbox.get(jobId);
    if (!job) return null;
    job.attempts += 1;
    job.status = 'DEAD_LETTER';
    job.lastError = reason;
    job.updatedAt = new Date(nowMs).toISOString();
    this.metrics.deadLettered++;

    const entry: PushDeadLetterEntry = {
      id: crypto.randomUUID(),
      jobId: job.id,
      userId: job.userId,
      reason,
      attempts: job.attempts,
      replayedAt: null,
      createdAt: new Date(nowMs).toISOString()
    };
    this.dlq.set(job.id, entry);
    return { ...entry };
  }

  replayDeadLetter(jobId: string, nowMs: number): PushOutboxJob | null {
    const job = this.outbox.get(jobId);
    const dlqEntry = this.dlq.get(jobId);
    if (!job || !dlqEntry || job.status !== 'DEAD_LETTER') return null;

    job.status = 'PENDING';
    job.attempts = 0;
    job.nextAttemptAt = nowMs;
    job.lastError = null;
    job.updatedAt = new Date(nowMs).toISOString();
    dlqEntry.replayedAt = new Date(nowMs).toISOString();
    return { ...job };
  }

  listDeadLetters(): PushDeadLetterEntry[] {
    return Array.from(this.dlq.values()).map((d) => ({ ...d }));
  }

  getHealthSnapshot() {
    let pending = 0;
    let retryScheduled = 0;
    let delivered = 0;
    let deadLetter = 0;
    for (const job of this.outbox.values()) {
      if (job.status === 'PENDING') pending++;
      else if (job.status === 'RETRY_SCHEDULED') retryScheduled++;
      else if (job.status === 'DELIVERED') delivered++;
      else if (job.status === 'DEAD_LETTER') deadLetter++;
    }

    let activeTokens = 0;
    let expiredTokens = 0;
    let rotatedTokens = 0;
    for (const t of this.tokens.values()) {
      if (t.status === 'ACTIVE') activeTokens++;
      else if (t.status === 'EXPIRED') expiredTokens++;
      else if (t.status === 'ROTATED') rotatedTokens++;
    }

    return {
      queue: { pending, retryScheduled, delivered, deadLetter },
      tokens: { active: activeTokens, expired: expiredTokens, rotated: rotatedTokens },
      totals: { ...this.metrics }
    };
  }

  clearForTests(): void {
    this.tokens.clear();
    this.prefs.clear();
    this.cooldowns.clear();
    this.dailyCounts.clear();
    this.outbox.clear();
    this.idempotencyIndex.clear();
    this.dlq.clear();
    this.metrics = {
      enqueued: 0,
      delivered: 0,
      retried: 0,
      deadLettered: 0,
      tokensRotated: 0,
      tokensInvalidated: 0
    };
  }
}

export const pushStore = new InMemoryPushStore();
