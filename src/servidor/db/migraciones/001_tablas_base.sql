CREATE TABLE sesiones (
  id SERIAL PRIMARY KEY,
  codigo_sala VARCHAR(8) NOT NULL UNIQUE,
  semilla INTEGER NOT NULL DEFAULT 20260825,
  fase_actual VARCHAR(30) NOT NULL DEFAULT 'espera',
  reloj_iniciado BOOLEAN NOT NULL DEFAULT FALSE,
  reloj_pausado BOOLEAN NOT NULL DEFAULT FALSE,
  segundo_actual REAL NOT NULL DEFAULT 0,
  extensiones JSONB NOT NULL DEFAULT '{}',
  creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE equipos (
  id SERIAL PRIMARY KEY,
  sesion_id INTEGER NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  estado_motor JSONB NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sesion_id, nombre)
);

CREATE TABLE bitacora (
  id SERIAL PRIMARY KEY,
  equipo_id INTEGER NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL,
  hipotesis TEXT NOT NULL,
  parametros JSONB,
  trimestre INTEGER NOT NULL,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE diagnosticos (
  id SERIAL PRIMARY KEY,
  equipo_id INTEGER NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  diagnostico JSONB NOT NULL,
  rigor JSONB NOT NULL,
  resultado JSONB,
  minuto_declaracion REAL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
