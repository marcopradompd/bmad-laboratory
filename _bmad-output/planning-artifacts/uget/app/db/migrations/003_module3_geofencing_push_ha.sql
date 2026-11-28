-- ============================================================================
-- uGet — Migration 003 (Módulo 3: Geofencing & Push Notifications HA)
-- Fila transacional persistente (Outbox), Retries, Idempotência, DLQ,
-- Renovação de Tokens e Controle Anti-Spam (RN-02) / Não Perturbe (DND).
-- ============================================================================

CREATE TABLE IF NOT EXISTS device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(120) NOT NULL,
  platform VARCHAR(16) NOT NULL CHECK (platform IN ('fcm', 'apns', 'webpush')),
  token_encrypted TEXT NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ROTATED', 'EXPIRED', 'REVOKED')),
  rotated_from_token_id UUID REFERENCES device_push_tokens(id),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_active_device
  ON device_push_tokens (user_id, device_id)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_status
  ON device_push_tokens (user_id, status);

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  radius_meters INT NOT NULL DEFAULT 500 CHECK (radius_meters BETWEEN 100 AND 15000),
  dnd_start_hour SMALLINT NOT NULL DEFAULT 22 CHECK (dnd_start_hour BETWEEN 0 AND 23),
  dnd_end_hour SMALLINT NOT NULL DEFAULT 7 CHECK (dnd_end_hour BETWEEN 0 AND 23),
  cooldown_hours SMALLINT NOT NULL DEFAULT 24 CHECK (cooldown_hours BETWEEN 1 AND 168),
  max_daily_pushes SMALLINT NOT NULL DEFAULT 6 CHECK (max_daily_pushes BETWEEN 1 AND 30),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geofence_cooldowns (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_unit_id UUID NOT NULL REFERENCES partner_units(id) ON DELETE CASCADE,
  last_notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, partner_unit_id)
);

CREATE TABLE IF NOT EXISTS push_outbox_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key VARCHAR(180) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  benefit_id UUID NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
  partner_unit_id UUID NOT NULL REFERENCES partner_units(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  deep_link VARCHAR(255) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'RETRY_SCHEDULED', 'DELIVERED', 'DEAD_LETTER')),
  attempts SMALLINT NOT NULL DEFAULT 0,
  max_attempts SMALLINT NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider_message_id VARCHAR(160),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_outbox_due
  ON push_outbox_jobs (status, next_attempt_at)
  WHERE status IN ('PENDING', 'RETRY_SCHEDULED');

CREATE TABLE IF NOT EXISTS push_dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES push_outbox_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  attempts SMALLINT NOT NULL,
  payload_json JSONB NOT NULL,
  replayed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
