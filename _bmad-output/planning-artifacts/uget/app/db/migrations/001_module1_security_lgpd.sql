-- ============================================================================
-- uGet — Migration 001: Fundação de Segurança, RBAC, LGPD & Auditoria
-- Compatível com PostgreSQL 16 + PostGIS (queries 100% parametrizadas)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Papéis RBAC estritos (RNF-07)
DO $$ BEGIN
  CREATE TYPE uget_role AS ENUM (
    'USER_ASSOCIATE',
    'CLUB_MANAGER',
    'PARTNER_MANAGER',
    'SUPER_ADMIN'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. Usuários (PII criptografada em repouso via AES-256-GCM na aplicação)
CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash          CHAR(64) NOT NULL UNIQUE,       -- SHA-256 normalizado p/ lookup sem expor PII
  email_encrypted     TEXT NOT NULL,                  -- AES-256-GCM (v1:iv:tag:ciphertext)
  name_encrypted      TEXT NOT NULL,                  -- AES-256-GCM
  cpf_encrypted       TEXT,                           -- AES-256-GCM (opcional no onboarding)
  phone_encrypted     TEXT,                           -- AES-256-GCM
  password_hash       TEXT NOT NULL,                  -- scrypt / Argon2id com salt único
  role                uget_role NOT NULL DEFAULT 'USER_ASSOCIATE',
  tenant_id           UUID,                           -- Isolamento multi-tenant para CLUB/PARTNER_MANAGER
  is_anonymized       BOOLEAN NOT NULL DEFAULT FALSE,
  anonymized_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id) WHERE tenant_id IS NOT NULL;

-- 2. Refresh Tokens Rotacionáveis (com detecção de reuso)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash          CHAR(64) NOT NULL UNIQUE,
  family_id           UUID NOT NULL,
  revoked             BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at          TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);

-- 3. Registro Imutável de Consentimentos LGPD (RNF-08 / RF-17)
CREATE TABLE IF NOT EXISTS lgpd_consents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose             VARCHAR(40) NOT NULL CHECK (purpose IN ('terms', 'gps', 'push', 'surveys')),
  granted             BOOLEAN NOT NULL,
  policy_version      VARCHAR(24) NOT NULL,
  channel             VARCHAR(32) NOT NULL DEFAULT 'app',
  ip_hash             CHAR(64),
  recorded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lgpd_consents_user_purpose ON lgpd_consents(user_id, purpose, recorded_at DESC);

-- 4. Logs de Auditoria Imutáveis (Append-Only — RNF-09)
-- NUNCA armazenar senhas, tokens ou PII em texto claro em metadata!
CREATE TABLE IF NOT EXISTS audit_logs (
  id                  BIGSERIAL PRIMARY KEY,
  correlation_id      UUID NOT NULL,
  actor_id            UUID,
  actor_role          VARCHAR(32),
  action              VARCHAR(64) NOT NULL,
  resource            VARCHAR(128) NOT NULL,
  status              VARCHAR(16) NOT NULL CHECK (status IN ('SUCCESS', 'DENIED', 'ERROR')),
  ip_hash             CHAR(64),
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);
