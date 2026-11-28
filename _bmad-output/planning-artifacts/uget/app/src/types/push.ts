/**
 * uGet — Contratos de Domínio do Módulo 3 (Geofencing & Push Notifications HA)
 */

export type PushPlatform = 'fcm' | 'apns' | 'webpush';
export type PushTokenStatus = 'ACTIVE' | 'ROTATED' | 'EXPIRED' | 'REVOKED';
export type PushJobStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'RETRY_SCHEDULED'
  | 'DELIVERED'
  | 'DEAD_LETTER';

export interface DevicePushTokenRecord {
  id: string;
  userId: string;
  deviceId: string;
  platform: PushPlatform;
  tokenEncrypted: string;
  tokenHash: string;
  status: PushTokenStatus;
  rotatedFromTokenId: string | null;
  lastSeenAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserNotificationPreferences {
  userId: string;
  radiusMeters: number;
  dndStartHour: number;
  dndEndHour: number;
  cooldownHours: number;
  maxDailyPushes: number;
  updatedAt: string;
}

export interface PushOutboxJob {
  id: string;
  idempotencyKey: string;
  userId: string;
  benefitId: string;
  partnerUnitId: string;
  title: string;
  body: string;
  deepLink: string;
  discountLabel: string;
  distanceLabel: string;
  status: PushJobStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: number; // epoch ms
  providerMessageId: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PushDeadLetterEntry {
  id: string;
  jobId: string;
  userId: string;
  reason: string;
  attempts: number;
  replayedAt: string | null;
  createdAt: string;
}

export type PushProviderOutcome =
  | { status: 'OK'; providerMessageId: string }
  | { status: 'TRANSIENT_ERROR'; error: string }
  | { status: 'TOKEN_EXPIRED'; error: string }
  | { status: 'PERMANENT_ERROR'; error: string };

export interface PushDeliveryProvider {
  send(input: {
    platform: PushPlatform;
    token: string;
    title: string;
    body: string;
    deepLink: string;
    idempotencyKey: string;
  }): Promise<PushProviderOutcome>;
}

export interface GeofenceEvaluationResult {
  evaluated: boolean;
  reason?: 'BLOCKED_LGPD_CONSENT' | 'SUPPRESSED_DND' | 'SUPPRESSED_DAILY_CAP' | 'NO_MATCHES_IN_RADIUS';
  radiusMeters: number;
  matchedCount: number;
  enqueuedJobs: PushOutboxJob[];
  skippedCooldownIds: string[];
  skippedDuplicateIds: string[];
}
