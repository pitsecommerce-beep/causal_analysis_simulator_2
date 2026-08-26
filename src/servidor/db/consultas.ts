import { obtenerPool } from './conexion.js';
import type { EstadoMotor, DiagnosticoEquipo, RigorMetodo, ResultadoPuntuacion, RolEquipo, MiembroEquipo } from '../motor/tipos.js';

export interface SesionDB {
  id: number;
  codigo_sala: string;
  semilla: number;
  fase_actual: string;
  reloj_iniciado: boolean;
  reloj_pausado: boolean;
  segundo_actual: number;
  extensiones: Record<string, number>;
}

export interface EquipoDB {
  id: number;
  sesion_id: number;
  nombre: string;
  estado_motor: EstadoMotor;
}

export interface EntradaBitacora {
  id: number;
  equipo_id: number;
  tipo: string;
  hipotesis: string;
  parametros: Record<string, unknown> | null;
  trimestre: number;
  creada_en: string;
}

export async function crearSesion(codigoSala: string, semilla: number = 20260825): Promise<SesionDB> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    `INSERT INTO sesiones (codigo_sala, semilla)
     VALUES ($1, $2)
     RETURNING *`,
    [codigoSala, semilla],
  );
  return rows[0];
}

export async function obtenerSesion(codigoSala: string): Promise<SesionDB | null> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    'SELECT * FROM sesiones WHERE codigo_sala = $1',
    [codigoSala],
  );
  return rows[0] ?? null;
}

export async function actualizarRelojSesion(
  sesionId: number,
  datos: { fase_actual?: string; reloj_iniciado?: boolean; reloj_pausado?: boolean; segundo_actual?: number; extensiones?: Record<string, number> },
): Promise<void> {
  const pool = obtenerPool();
  const campos: string[] = [];
  const valores: unknown[] = [];
  let idx = 1;

  for (const [campo, valor] of Object.entries(datos)) {
    campos.push(`${campo} = $${idx}`);
    valores.push(campo === 'extensiones' ? JSON.stringify(valor) : valor);
    idx++;
  }

  if (campos.length === 0) return;
  valores.push(sesionId);
  await pool.query(
    `UPDATE sesiones SET ${campos.join(', ')} WHERE id = $${idx}`,
    valores,
  );
}

export async function crearEquipo(sesionId: number, nombre: string, estadoMotor: EstadoMotor): Promise<EquipoDB> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    `INSERT INTO equipos (sesion_id, nombre, estado_motor)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [sesionId, nombre, JSON.stringify(estadoMotor)],
  );
  return rows[0];
}

export async function obtenerEquipo(sesionId: number, nombre: string): Promise<EquipoDB | null> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    'SELECT * FROM equipos WHERE sesion_id = $1 AND nombre = $2',
    [sesionId, nombre],
  );
  return rows[0] ?? null;
}

export async function obtenerEquiposSesion(sesionId: number): Promise<EquipoDB[]> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    'SELECT * FROM equipos WHERE sesion_id = $1 ORDER BY nombre',
    [sesionId],
  );
  return rows;
}

export async function actualizarEstadoMotor(equipoId: number, estado: EstadoMotor): Promise<void> {
  const pool = obtenerPool();
  await pool.query(
    'UPDATE equipos SET estado_motor = $1 WHERE id = $2',
    [JSON.stringify(estado), equipoId],
  );
}

export async function registrarConsulta(
  equipoId: number,
  tipo: string,
  hipotesis: string,
  parametros: Record<string, unknown> | null,
  trimestre: number,
): Promise<void> {
  const pool = obtenerPool();
  await pool.query(
    `INSERT INTO bitacora (equipo_id, tipo, hipotesis, parametros, trimestre)
     VALUES ($1, $2, $3, $4, $5)`,
    [equipoId, tipo, hipotesis, parametros ? JSON.stringify(parametros) : null, trimestre],
  );
}

export async function obtenerBitacora(equipoId: number): Promise<EntradaBitacora[]> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    'SELECT * FROM bitacora WHERE equipo_id = $1 ORDER BY creada_en',
    [equipoId],
  );
  return rows;
}

export async function guardarDiagnostico(
  equipoId: number,
  diagnostico: DiagnosticoEquipo,
  rigor: RigorMetodo,
  resultado: ResultadoPuntuacion,
  minutoDeclaracion: number,
): Promise<void> {
  const pool = obtenerPool();
  await pool.query(
    `INSERT INTO diagnosticos (equipo_id, diagnostico, rigor, resultado, minuto_declaracion)
     VALUES ($1, $2, $3, $4, $5)`,
    [equipoId, JSON.stringify(diagnostico), JSON.stringify(rigor), JSON.stringify(resultado), minutoDeclaracion],
  );
}

export async function obtenerDiagnosticos(sesionId: number): Promise<Array<{ equipo_nombre: string; resultado: ResultadoPuntuacion; minuto_declaracion: number }>> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    `SELECT e.nombre AS equipo_nombre, d.resultado, d.minuto_declaracion
     FROM diagnosticos d
     JOIN equipos e ON e.id = d.equipo_id
     WHERE e.sesion_id = $1
     ORDER BY (d.resultado->>'total')::int DESC`,
    [sesionId],
  );
  return rows;
}

export async function guardarMiembros(
  equipoId: number,
  miembros: MiembroEquipo[],
): Promise<void> {
  const pool = obtenerPool();
  await pool.query('DELETE FROM miembros WHERE equipo_id = $1', [equipoId]);
  for (const m of miembros) {
    await pool.query(
      `INSERT INTO miembros (equipo_id, nombre_participante, rol)
       VALUES ($1, $2, $3)`,
      [equipoId, m.nombre, m.rol],
    );
  }
}

export async function obtenerMiembros(equipoId: number): Promise<MiembroEquipo[]> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    'SELECT nombre_participante AS nombre, rol FROM miembros WHERE equipo_id = $1',
    [equipoId],
  );
  return rows;
}

export async function registrarEvidencia(
  equipoId: number,
  comentarioId: string,
  hipotesis: string,
  registradoPor: string,
): Promise<void> {
  const pool = obtenerPool();
  await pool.query(
    `INSERT INTO evidencias (equipo_id, comentario_id, hipotesis, registrado_por)
     VALUES ($1, $2, $3, $4)`,
    [equipoId, comentarioId, hipotesis, registradoPor],
  );
}

export async function contarEvidencias(equipoId: number): Promise<number> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM evidencias WHERE equipo_id = $1',
    [equipoId],
  );
  return rows[0]?.total ?? 0;
}
