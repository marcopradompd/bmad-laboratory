-- ============================================================================
-- uGet — Migration 002: Clubes, Parceiros Geoespaciais (PostGIS) & Benefícios
-- ============================================================================

-- 1. Clubes, Associações, Sindicatos e Programas
CREATE TABLE IF NOT EXISTS clubs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                VARCHAR(64) NOT NULL UNIQUE,
  name                VARCHAR(120) NOT NULL,
  segment             VARCHAR(64) NOT NULL,
  members_estimate    INTEGER DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Vínculo Usuário <-> Clubes Ativos (RN-01)
CREATE TABLE IF NOT EXISTS user_clubs (
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id             UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  activated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, club_id)
);

-- 3. Estabelecimentos Parceiros
CREATE TABLE IF NOT EXISTS partners (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(140) NOT NULL,
  category            VARCHAR(48) NOT NULL,
  description         TEXT NOT NULL,
  phone               VARCHAR(32),
  whatsapp            VARCHAR(32),
  website             VARCHAR(255),
  rating              NUMERIC(2,1) DEFAULT 4.8,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Unidades Físicas Georreferenciadas (RN-03: cada filial tem seu próprio geofence)
CREATE TABLE IF NOT EXISTS partner_units (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id          UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  unit_name           VARCHAR(120) NOT NULL,
  address             VARCHAR(240) NOT NULL,
  neighborhood        VARCHAR(80) NOT NULL,
  city                VARCHAR(80) NOT NULL,
  state               CHAR(2) NOT NULL,
  location            GEOGRAPHY(POINT, 4326) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_units_location_gist ON partner_units USING GIST (location);

-- 5. Benefícios & Convênios (com janelas temporais RF-06)
CREATE TABLE IF NOT EXISTS benefits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id             UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  partner_id          UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  title               VARCHAR(140) NOT NULL,
  discount_label      VARCHAR(32) NOT NULL,
  rules               TEXT NOT NULL,
  valid_from_hour     SMALLINT NOT NULL DEFAULT 0,
  valid_to_hour       SMALLINT NOT NULL DEFAULT 23,
  is_vip              BOOLEAN NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_benefits_club_active ON benefits(club_id, is_active);

-- 6. Favoritos do Usuário (RF-11)
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  benefit_id          UUID NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, benefit_id)
);
