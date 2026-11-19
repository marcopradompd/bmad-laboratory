-- ============================================================================
-- surfeAgent — Schema SQL da Coleção Global Compartilhada: surf_spots
-- Compatível com PostgreSQL / Supabase (com suporte a busca fuzzy e Haversine)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS public.surf_spots (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  aliases           TEXT[] NOT NULL DEFAULT '{}',
  region            TEXT NOT NULL,
  state             TEXT NOT NULL DEFAULT '',
  lat               DOUBLE PRECISION NOT NULL,
  lon               DOUBLE PRECISION NOT NULL,

  -- Metadados técnicos oceanográficos (aprendidos e enriquecidos pela IA)
  bottom_type       TEXT NOT NULL DEFAULT 'sand'
                      CHECK (bottom_type IN ('sand', 'reef', 'point')),
  best_tide         TEXT NOT NULL DEFAULT 'MID'
                      CHECK (best_tide IN ('LOW', 'MID', 'HIGH', 'ALL')),
  ideal_swell_dir   INTEGER[] NOT NULL DEFAULT ARRAY[110, 180],   -- [minDeg, maxDeg]
  offshore_wind_dir INTEGER[] NOT NULL DEFAULT ARRAY[270, 340],   -- [minDeg, maxDeg]
  beach_face_deg    INTEGER NOT NULL DEFAULT 135,
  skill_level_fit   TEXT[] NOT NULL DEFAULT ARRAY['iniciante', 'intermediario', 'avancado'],
  local_notes       TEXT NOT NULL DEFAULT '',

  -- Telemetria colaborativa e aprendizado contínuo
  last_enriched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_count      INTEGER NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para deduplicação semântica (nome + aliases) e popularidade
CREATE INDEX IF NOT EXISTS idx_surf_spots_name_trgm
  ON public.surf_spots USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_surf_spots_aliases
  ON public.surf_spots USING GIN (aliases);

CREATE INDEX IF NOT EXISTS idx_surf_spots_search_count
  ON public.surf_spots (search_count DESC);

-- Função auxiliar de distância Haversine em km (para consulta dos 4 picos mais próximos)
CREATE OR REPLACE FUNCTION public.haversine_km(
  lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION LANGUAGE SQL IMMUTABLE AS $$
  SELECT 6371 * 2 * ASIN(SQRT(
    POWER(SIN(RADIANS(lat2 - lat1) / 2), 2) +
    COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
    POWER(SIN(RADIANS(lon2 - lon1) / 2), 2)
  ));
$$;
