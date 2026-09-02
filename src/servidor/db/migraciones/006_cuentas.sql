-- Migration 006: Authentication — professor accounts, session tokens, session states

CREATE TABLE IF NOT EXISTS profesores (
  id SERIAL PRIMARY KEY,
  correo VARCHAR(255) NOT NULL UNIQUE,
  hash_contrasena TEXT NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  debe_cambiar_contrasena BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_acceso TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tokens_sesion (
  id SERIAL PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  tipo VARCHAR(20) NOT NULL,
  profesor_id INTEGER REFERENCES profesores(id) ON DELETE CASCADE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_en TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tokens_sesion_token ON tokens_sesion(token);

ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS profesor_id INTEGER REFERENCES profesores(id);
ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'abierta';

ALTER TABLE sesiones ALTER COLUMN codigo_sala TYPE VARCHAR(12);

ALTER TABLE sesiones DROP CONSTRAINT IF EXISTS sesiones_codigo_sala_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sesiones_codigo_sala_activa
  ON sesiones(codigo_sala)
  WHERE estado NOT IN ('archivada');
