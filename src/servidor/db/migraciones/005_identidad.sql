-- Migration 005: Email-based identity and timestamp-based clock

-- Store clock start/pause as real timestamps instead of just a second counter
ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS reloj_iniciado_en TIMESTAMPTZ;
ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS reloj_pausado_en TIMESTAMPTZ;
ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS tiempo_pausado_total_ms BIGINT NOT NULL DEFAULT 0;

-- Participant identity: email is the canonical identifier
ALTER TABLE miembros ADD COLUMN IF NOT EXISTS ultimo_socket VARCHAR(40);
ALTER TABLE miembros ADD COLUMN IF NOT EXISTS ultima_conexion TIMESTAMPTZ;

-- Unique constraint: one role per team per email (prevents duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_miembros_email_equipo
  ON miembros(equipo_id, email)
  WHERE email IS NOT NULL AND email != '';
