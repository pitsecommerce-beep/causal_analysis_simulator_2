CREATE TABLE miembros (
  id SERIAL PRIMARY KEY,
  equipo_id INTEGER NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  nombre_participante VARCHAR(100) NOT NULL,
  rol VARCHAR(30) NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(equipo_id, nombre_participante)
);

CREATE TABLE evidencias (
  id SERIAL PRIMARY KEY,
  equipo_id INTEGER NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  comentario_id VARCHAR(20) NOT NULL,
  hipotesis TEXT NOT NULL,
  registrado_por VARCHAR(100) NOT NULL,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
