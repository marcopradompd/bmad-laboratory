-- ============================================================================
-- uGet — Migration 004 (Módulo 4: Carteirinha uGet Pass & Micro-pesquisa)
-- ============================================================================

CREATE TABLE IF NOT EXISTS uget_pass_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  benefit_id UUID NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  pass_code_hash VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(16) NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED', 'VALIDATED', 'EXPIRED')),
  expires_at TIMESTAMPTZ NOT NULL,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pass_redemptions_user
  ON uget_pass_redemptions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS post_visit_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redemption_id UUID UNIQUE REFERENCES uget_pass_redemptions(id) ON DELETE SET NULL,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  benefit_id UUID NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  discount_honored BOOLEAN NOT NULL DEFAULT TRUE,
  saved_estimate_brl NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (saved_estimate_brl >= 0),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surveys_partner
  ON post_visit_surveys (partner_id, created_at DESC);
