ALTER TABLE miembros ADD COLUMN IF NOT EXISTS codigo_personal VARCHAR(6);

CREATE UNIQUE INDEX IF NOT EXISTS idx_miembros_codigo_equipo
  ON miembros(equipo_id, codigo_personal)
  WHERE codigo_personal IS NOT NULL;
