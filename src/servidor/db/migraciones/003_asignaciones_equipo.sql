CREATE TABLE asignaciones_equipo (
  id SERIAL PRIMARY KEY,
  sesion_id INTEGER NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
  nombre_equipo VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sesion_id, email)
);

CREATE INDEX idx_asignaciones_sesion_email ON asignaciones_equipo(sesion_id, email);
CREATE INDEX idx_asignaciones_sesion_equipo ON asignaciones_equipo(sesion_id, nombre_equipo);

ALTER TABLE miembros ADD COLUMN email VARCHAR(255);
