import { obtenerPool } from './conexion.js';
import type { EstadoMotor, DiagnosticoEquipo, RigorMetodo, ResultadoPuntuacion, RolEquipo, MiembroEquipo } from '../motor/tipos.js';

export interface AsignacionEquipoDB {
  id: number;
  sesion_id: number;
  nombre_equipo: string;
  email: string;
}

export interface SesionDB {
  id: number;
  codigo_sala: string;
  semilla: number;
  fase_actual: string;
  reloj_iniciado: boolean;
  reloj_pausado: boolean;
  segundo_actual: number;
  extensiones: Record<string, number>;
  reloj_iniciado_en: string | null;
  reloj_pausado_en: string | null;
  tiempo_pausado_total_ms: number;
  profesor_id: number | null;
  estado: string;
  creada_en: string;
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

export async function crearSesion(codigoSala: string, semilla: number = 20260825, profesorId?: number | null): Promise<SesionDB> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    `INSERT INTO sesiones (codigo_sala, semilla, profesor_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [codigoSala, semilla, profesorId ?? null],
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

export async function obtenerSesionesActivas(): Promise<SesionDB[]> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    `SELECT * FROM sesiones
     WHERE reloj_iniciado = true
       AND fase_actual NOT IN ('finalizado')
     ORDER BY id DESC
     LIMIT 50`,
  );
  return rows;
}

export async function actualizarRelojSesion(
  sesionId: number,
  datos: {
    fase_actual?: string;
    reloj_iniciado?: boolean;
    reloj_pausado?: boolean;
    segundo_actual?: number;
    extensiones?: Record<string, number>;
    reloj_iniciado_en?: string | null;
    reloj_pausado_en?: string | null;
    tiempo_pausado_total_ms?: number;
  },
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
  const nombres = miembros.map(m => m.nombre);
  if (nombres.length > 0) {
    await pool.query(
      'DELETE FROM miembros WHERE equipo_id = $1 AND nombre_participante != ALL($2::text[])',
      [equipoId, nombres],
    );
  } else {
    await pool.query('DELETE FROM miembros WHERE equipo_id = $1', [equipoId]);
  }
  for (const m of miembros) {
    await pool.query(
      `INSERT INTO miembros (equipo_id, nombre_participante, rol)
       VALUES ($1, $2, $3)
       ON CONFLICT (equipo_id, nombre_participante) DO UPDATE SET rol = $3`,
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

export async function guardarAsignaciones(
  sesionId: number,
  equipos: { nombre: string; emails: string[] }[],
): Promise<void> {
  const pool = obtenerPool();
  await pool.query('DELETE FROM asignaciones_equipo WHERE sesion_id = $1', [sesionId]);
  for (const eq of equipos) {
    for (const email of eq.emails) {
      await pool.query(
        `INSERT INTO asignaciones_equipo (sesion_id, nombre_equipo, email)
         VALUES ($1, $2, $3)
         ON CONFLICT (sesion_id, email) DO UPDATE SET nombre_equipo = $2`,
        [sesionId, eq.nombre, email.toLowerCase().trim()],
      );
    }
  }
}

export async function obtenerAsignaciones(sesionId: number): Promise<AsignacionEquipoDB[]> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    'SELECT * FROM asignaciones_equipo WHERE sesion_id = $1 ORDER BY nombre_equipo, email',
    [sesionId],
  );
  return rows;
}

export async function buscarAsignacionPorEmail(sesionId: number, email: string): Promise<AsignacionEquipoDB | null> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    'SELECT * FROM asignaciones_equipo WHERE sesion_id = $1 AND email = $2',
    [sesionId, email.toLowerCase().trim()],
  );
  return rows[0] ?? null;
}

export async function guardarMiembroConEmail(
  equipoId: number,
  email: string,
  nombre: string,
  rol: RolEquipo,
): Promise<void> {
  const pool = obtenerPool();
  await pool.query(
    `INSERT INTO miembros (equipo_id, nombre_participante, rol, email)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (equipo_id, nombre_participante) DO UPDATE SET rol = $3, email = $4`,
    [equipoId, nombre, rol, email.toLowerCase().trim()],
  );
}

export async function guardarCodigoPersonal(
  equipoId: number,
  nombreParticipante: string,
  codigoPersonal: string,
): Promise<void> {
  const pool = obtenerPool();
  await pool.query(
    `UPDATE miembros SET codigo_personal = $1
     WHERE equipo_id = $2 AND nombre_participante = $3`,
    [codigoPersonal, equipoId, nombreParticipante],
  );
}

export async function actualizarConexionMiembro(
  equipoId: number,
  nombreParticipante: string,
  socketId: string,
): Promise<void> {
  const pool = obtenerPool();
  await pool.query(
    `UPDATE miembros SET ultimo_socket = $1, ultima_conexion = NOW()
     WHERE equipo_id = $2 AND nombre_participante = $3`,
    [socketId, equipoId, nombreParticipante],
  );
}

export async function buscarPorCodigoPersonal(
  sesionId: number,
  codigoPersonal: string,
): Promise<{ equipoNombre: string; equipoId: number; nombre: string; rol: RolEquipo } | null> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    `SELECT m.nombre_participante AS nombre, m.rol, e.nombre AS equipo_nombre, e.id AS equipo_id
     FROM miembros m
     JOIN equipos e ON e.id = m.equipo_id
     WHERE e.sesion_id = $1 AND m.codigo_personal = $2`,
    [sesionId, codigoPersonal],
  );
  if (rows.length === 0) return null;
  return {
    equipoNombre: rows[0].equipo_nombre,
    equipoId: rows[0].equipo_id,
    nombre: rows[0].nombre,
    rol: rows[0].rol as RolEquipo,
  };
}

// --- Professor CRUD ---

export interface ProfesorDB {
  id: number;
  correo: string;
  hash_contrasena: string;
  nombre: string;
  activo: boolean;
  debe_cambiar_contrasena: boolean;
  creado_en: string;
  ultimo_acceso: string | null;
}

export async function crearProfesor(
  correo: string,
  hashContrasena: string,
  nombre: string,
): Promise<ProfesorDB> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    `INSERT INTO profesores (correo, hash_contrasena, nombre)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [correo.toLowerCase().trim(), hashContrasena, nombre.trim()],
  );
  return rows[0];
}

export async function obtenerProfesorPorCorreo(correo: string): Promise<ProfesorDB | null> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    'SELECT * FROM profesores WHERE correo = $1',
    [correo.toLowerCase().trim()],
  );
  return rows[0] ?? null;
}

export async function obtenerProfesorPorId(id: number): Promise<ProfesorDB | null> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    'SELECT * FROM profesores WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}

export async function listarProfesores(): Promise<Omit<ProfesorDB, 'hash_contrasena'>[]> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    'SELECT id, correo, nombre, activo, debe_cambiar_contrasena, creado_en, ultimo_acceso FROM profesores ORDER BY nombre',
  );
  return rows;
}

export async function actualizarProfesor(
  id: number,
  datos: { nombre?: string; activo?: boolean; hashContrasena?: string; debe_cambiar_contrasena?: boolean },
): Promise<void> {
  const pool = obtenerPool();
  const campos: string[] = [];
  const valores: unknown[] = [];
  let idx = 1;

  if (datos.nombre !== undefined) { campos.push(`nombre = $${idx++}`); valores.push(datos.nombre); }
  if (datos.activo !== undefined) { campos.push(`activo = $${idx++}`); valores.push(datos.activo); }
  if (datos.hashContrasena !== undefined) { campos.push(`hash_contrasena = $${idx++}`); valores.push(datos.hashContrasena); }
  if (datos.debe_cambiar_contrasena !== undefined) { campos.push(`debe_cambiar_contrasena = $${idx++}`); valores.push(datos.debe_cambiar_contrasena); }

  if (campos.length === 0) return;
  valores.push(id);
  await pool.query(`UPDATE profesores SET ${campos.join(', ')} WHERE id = $${idx}`, valores);
}

export async function actualizarUltimoAcceso(profesorId: number): Promise<void> {
  const pool = obtenerPool();
  await pool.query('UPDATE profesores SET ultimo_acceso = NOW() WHERE id = $1', [profesorId]);
}

export async function obtenerSesionesProfesor(profesorId: number): Promise<SesionDB[]> {
  const pool = obtenerPool();
  const { rows } = await pool.query(
    `SELECT * FROM sesiones WHERE profesor_id = $1 AND estado != 'archivada' ORDER BY creada_en DESC`,
    [profesorId],
  );
  return rows;
}

// --- end professor CRUD ---

export async function obtenerEquipoCompletoPorEmail(
  sesionId: number,
  email: string,
): Promise<{ equipo: EquipoDB; miembros: MiembroEquipo[] } | null> {
  const pool = obtenerPool();
  const { rows: asig } = await pool.query(
    'SELECT nombre_equipo FROM asignaciones_equipo WHERE sesion_id = $1 AND email = $2',
    [sesionId, email.toLowerCase().trim()],
  );
  if (asig.length === 0) return null;

  const nombreEquipo = asig[0].nombre_equipo;
  const { rows: eqs } = await pool.query(
    'SELECT * FROM equipos WHERE sesion_id = $1 AND nombre = $2',
    [sesionId, nombreEquipo],
  );
  if (eqs.length === 0) return null;

  const equipo = eqs[0];
  const miembros = await obtenerMiembros(equipo.id);
  return { equipo, miembros };
}
