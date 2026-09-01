import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { resolve } from 'path';
import { existsSync } from 'fs';
import * as XLSX from 'xlsx';
import { cargarConfig } from './motor/dag.js';
import { cargarTodosDatos } from './datos/cargador.js';
import { conectarDB, ejecutarMigraciones, cerrarDB } from './db/conexion.js';
import * as db from './db/consultas.js';
import { configurarSockets, recuperarSesionesDB } from './sockets/sala.js';
import { DISCURSO_DIRECTOR, DISCURSO_ADRIANA } from './voz/guiones.js';
import { validarTerminosProhibidos } from './voz/anthropic.js';
import {
  hashContrasena, verificarContrasena,
  crearSesionAuth, verificarAuth, invalidarAuth,
  parsearCookies, NOMBRE_COOKIE,
  type InfoAuth,
} from './auth.js';

async function main(): Promise<void> {
  console.log('Cargando configuracion y datos...');
  const config = cargarConfig();
  const datos = cargarTodosDatos();
  console.log(`  ${datos.solicitudes.length} solicitudes, ${datos.comentarios.length} comentarios cargados`);

  const terminosProhibidos = config.voz?.terminos_prohibidos ?? [];
  const directorLimpio = validarTerminosProhibidos(DISCURSO_DIRECTOR, terminosProhibidos);
  if (!directorLimpio) {
    console.error('✗ El guion fijo del director contiene términos prohibidos. Revisar src/servidor/voz/guiones/director.txt');
    process.exit(1);
  }
  console.log('  Guion fijo del director validado contra términos prohibidos ✓');

  const app = express();
  app.use(express.json());

  const httpServer = createServer(app);
  const io = new SocketServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  let dbConectada = false;

  app.get('/api/salud', async (_req, res) => {
    const variablesFaltantes = verificarVariables();
    res.json({
      servidor: 'activo',
      baseDatos: dbConectada ? 'conectada' : 'desconectada',
      variablesFaltantes,
      solicitudesCargadas: datos.solicitudes.length,
      comentariosCargados: datos.comentarios.length,
    });
  });

  app.get('/api/descargar/solicitudes', (_req, res) => {
    const filas = datos.solicitudes.map(s => ({
      'Application #': s.id,
      'Customer #': s.clienteId,
      'Age': s.edad,
      'Marital Status': s.estadoCivil,
      'Gender': s.genero,
      'State': s.estado,
      'Branch #': s.sucursal,
      'Years as customer': s.aniosCliente,
      'Credit Bureau Score': s.scoreBuro,
      'ETFBank Score': s.scoreETF,
      'Date of first data input': s.fechaPrimerCaptura,
      'Date of last data input': s.fechaUltimaCaptura,
      '# of tries': s.intentos,
      'Date documents sent': s.fechaEnvioDocumentos,
      'Date documents Received at CrOP': s.fechaRecepcionCrOP,
      'Credit Bureau result': s.resultadoBuro,
      'Credit Bureau run date': s.fechaBuro,
      'ETFBank Score result': s.resultadoScoreETF,
      'ETFB Score Date': s.fechaScoreETF,
      'Date Plastic Sent': s.fechaPlastico,
      'Last Status': s.ultimoEstatus,
      'Credit Line Granted': s.lineaCredito,
      'Comments': s.comentariosRaw,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filas);
    XLSX.utils.book_append_sheet(wb, ws, 'MX CAMPUS');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="R2_ETF_Bank_Data.xlsx"');
    res.send(buf);
  });

  function cookieOpts() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    };
  }

  async function extraerAuth(req: express.Request): Promise<InfoAuth | null> {
    const cookies = parsearCookies(req.headers.cookie);
    const token = cookies[NOMBRE_COOKIE];
    if (!token) return null;
    return verificarAuth(token, dbConectada);
  }

  // --- Auth routes ---

  app.post('/api/auth/superadmin', async (req, res) => {
    const { clave } = req.body ?? {};
    const claveReal = process.env.CLAVE_SUPERADMIN || process.env.CLAVE_PROFESOR;
    if (!claveReal || clave !== claveReal) {
      res.status(401).json({ error: 'Clave incorrecta' });
      return;
    }
    const info: InfoAuth = { tipo: 'superadmin', profesorId: null, correo: null, nombre: 'Superadmin' };
    const token = await crearSesionAuth(info, dbConectada);
    res.cookie(NOMBRE_COOKIE, token, cookieOpts());
    res.json({ ok: true, tipo: 'superadmin', nombre: 'Superadmin' });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { correo, contrasena } = req.body ?? {};
    if (!correo || !contrasena) {
      res.status(400).json({ error: 'Correo y contrasena requeridos' });
      return;
    }
    if (!dbConectada) {
      res.status(503).json({ error: 'Base de datos no disponible' });
      return;
    }
    const profesor = await db.obtenerProfesorPorCorreo(correo);
    if (!profesor || !profesor.activo) {
      res.status(401).json({ error: 'Credenciales incorrectas' });
      return;
    }
    if (!verificarContrasena(contrasena, profesor.hash_contrasena)) {
      res.status(401).json({ error: 'Credenciales incorrectas' });
      return;
    }
    await db.actualizarUltimoAcceso(profesor.id);
    const info: InfoAuth = {
      tipo: 'profesor',
      profesorId: profesor.id,
      correo: profesor.correo,
      nombre: profesor.nombre,
    };
    const token = await crearSesionAuth(info, dbConectada);
    res.cookie(NOMBRE_COOKIE, token, cookieOpts());
    res.json({
      ok: true,
      tipo: 'profesor',
      nombre: profesor.nombre,
      correo: profesor.correo,
      debeCambiar: profesor.debe_cambiar_contrasena,
    });
  });

  app.post('/api/auth/logout', async (req, res) => {
    const cookies = parsearCookies(req.headers.cookie);
    const token = cookies[NOMBRE_COOKIE];
    if (token) await invalidarAuth(token, dbConectada);
    res.clearCookie(NOMBRE_COOKIE, { path: '/' });
    res.json({ ok: true });
  });

  app.get('/api/auth/yo', async (req, res) => {
    const auth = await extraerAuth(req);
    if (!auth) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    res.json({ tipo: auth.tipo, nombre: auth.nombre, correo: auth.correo });
  });

  // --- Admin routes (superadmin only) ---

  app.get('/api/admin/profesores', async (req, res) => {
    const auth = await extraerAuth(req);
    if (!auth || auth.tipo !== 'superadmin') {
      res.status(403).json({ error: 'Solo superadmin' });
      return;
    }
    if (!dbConectada) {
      res.status(503).json({ error: 'Base de datos no disponible' });
      return;
    }
    const profesores = await db.listarProfesores();
    res.json({ profesores });
  });

  app.post('/api/admin/profesores', async (req, res) => {
    const auth = await extraerAuth(req);
    if (!auth || auth.tipo !== 'superadmin') {
      res.status(403).json({ error: 'Solo superadmin' });
      return;
    }
    if (!dbConectada) {
      res.status(503).json({ error: 'Base de datos no disponible' });
      return;
    }
    const { correo, nombre, contrasena } = req.body ?? {};
    if (!correo || !nombre || !contrasena) {
      res.status(400).json({ error: 'Correo, nombre y contrasena requeridos' });
      return;
    }
    if (contrasena.length < 8) {
      res.status(400).json({ error: 'Contrasena minima de 8 caracteres' });
      return;
    }
    try {
      const hash = hashContrasena(contrasena);
      const profesor = await db.crearProfesor(correo, hash, nombre);
      res.json({ ok: true, profesor: { id: profesor.id, correo: profesor.correo, nombre: profesor.nombre } });
    } catch (err: any) {
      if (err.code === '23505') {
        res.status(409).json({ error: 'Ya existe un profesor con ese correo' });
        return;
      }
      throw err;
    }
  });

  app.put('/api/admin/profesores/:id', async (req, res) => {
    const auth = await extraerAuth(req);
    if (!auth || auth.tipo !== 'superadmin') {
      res.status(403).json({ error: 'Solo superadmin' });
      return;
    }
    if (!dbConectada) {
      res.status(503).json({ error: 'Base de datos no disponible' });
      return;
    }
    const id = parseInt(req.params.id, 10);
    const { nombre, activo, contrasena } = req.body ?? {};
    const datos: { nombre?: string; activo?: boolean; hashContrasena?: string; debe_cambiar_contrasena?: boolean } = {};
    if (nombre !== undefined) datos.nombre = nombre;
    if (activo !== undefined) datos.activo = activo;
    if (contrasena) {
      if (contrasena.length < 8) {
        res.status(400).json({ error: 'Contrasena minima de 8 caracteres' });
        return;
      }
      datos.hashContrasena = hashContrasena(contrasena);
      datos.debe_cambiar_contrasena = true;
    }
    await db.actualizarProfesor(id, datos);
    res.json({ ok: true });
  });

  // --- Professor session management ---

  app.post('/api/profesor/cambiar-contrasena', async (req, res) => {
    const auth = await extraerAuth(req);
    if (!auth || auth.tipo !== 'profesor' || !auth.profesorId) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }
    if (!dbConectada) {
      res.status(503).json({ error: 'Base de datos no disponible' });
      return;
    }
    const { actual, nueva } = req.body ?? {};
    if (!actual || !nueva) {
      res.status(400).json({ error: 'Contrasena actual y nueva requeridas' });
      return;
    }
    if (nueva.length < 8) {
      res.status(400).json({ error: 'Contrasena minima de 8 caracteres' });
      return;
    }
    const profesor = await db.obtenerProfesorPorId(auth.profesorId);
    if (!profesor) {
      res.status(404).json({ error: 'Profesor no encontrado' });
      return;
    }
    if (!verificarContrasena(actual, profesor.hash_contrasena)) {
      res.status(401).json({ error: 'Contrasena actual incorrecta' });
      return;
    }
    await db.actualizarProfesor(auth.profesorId, {
      hashContrasena: hashContrasena(nueva),
      debe_cambiar_contrasena: false,
    });
    res.json({ ok: true });
  });

  app.get('/api/profesor/sesiones', async (req, res) => {
    const auth = await extraerAuth(req);
    if (!auth || (auth.tipo !== 'profesor' && auth.tipo !== 'superadmin')) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }
    if (!dbConectada || !auth.profesorId) {
      res.json({ sesiones: [] });
      return;
    }
    const sesiones = await db.obtenerSesionesProfesor(auth.profesorId);
    res.json({
      sesiones: sesiones.map(s => ({
        id: s.id,
        codigoSala: s.codigo_sala,
        estado: s.estado ?? 'abierta',
        fase: s.fase_actual,
        creada: s.creada_en,
      })),
    });
  });

  // --- Participant template ---

  app.get('/api/plantilla/participantes', (_req, res) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([
      { 'Correo': 'alumno@ejemplo.com', 'Nombre': 'Nombre Apellido', 'Equipo': 'Equipo 1' },
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Participantes');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_participantes.xlsx"');
    res.send(buf);
  });

  app.post('/api/sesion/:codigo/cargar-participantes', async (req, res) => {
    const auth = await extraerAuth(req);
    if (!auth || (auth.tipo !== 'profesor' && auth.tipo !== 'superadmin')) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }
    const { archivo } = req.body ?? {};
    if (!archivo) {
      res.status(400).json({ error: 'Archivo requerido (base64)' });
      return;
    }
    const buf = Buffer.from(archivo, 'base64');
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) {
      res.status(400).json({ error: 'Archivo vacio' });
      return;
    }
    const filas = XLSX.utils.sheet_to_json<{ Correo?: string; Nombre?: string; Equipo?: string }>(ws);
    const errores: string[] = [];
    const emailsVistos = new Set<string>();
    const equiposMap = new Map<string, string[]>();

    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i];
      const correo = fila.Correo?.trim().toLowerCase();
      const equipo = fila.Equipo?.trim() || 'Equipo 1';
      if (!correo || !correo.includes('@')) {
        errores.push(`Fila ${i + 2}: correo invalido`);
        continue;
      }
      if (emailsVistos.has(correo)) {
        errores.push(`Fila ${i + 2}: correo duplicado ${correo}`);
        continue;
      }
      emailsVistos.add(correo);
      if (!equiposMap.has(equipo)) equiposMap.set(equipo, []);
      equiposMap.get(equipo)!.push(correo);
    }

    if (errores.length > 0) {
      res.status(400).json({ error: 'Errores en el archivo', errores });
      return;
    }
    const equipos = Array.from(equiposMap.entries()).map(([nombre, emails]) => ({ nombre, emails }));
    res.json({ ok: true, equipos, totalParticipantes: emailsVistos.size });
  });

  app.get('/api/descargar/comentarios', (_req, res) => {
    const filas = datos.comentarios.map(c => ({
      'ID': c.id,
      'Solicitud #': c.solicitudId,
      'Estado': c.estado,
      'Sucursal #': c.sucursal,
      'Intentos': c.intentos,
      'Canal de captación': c.canalCaptacion,
      'Fecha del comentario': c.fechaComentario,
      'Categoría primaria': c.categoriaPrimaria,
      'Categoría secundaria': c.categoriaSecundaria,
      'Comentario del cliente': c.comentario,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filas);
    XLSX.utils.book_append_sheet(wb, ws, 'Comentarios');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="R2_ETF_Bank_Comentarios.xlsx"');
    res.send(buf);
  });

  const distCliente = resolve('dist/cliente');
  if (existsSync(distCliente)) {
    app.use(express.static(distCliente));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(resolve(distCliente, 'index.html'));
    });
  }

  const PORT = parseInt(process.env.PORT || '3000', 10);
  const HOST = '0.0.0.0';

  await new Promise<void>((res) => httpServer.listen(PORT, HOST, res));
  console.log(`  Servidor escuchando en puerto ${PORT} (healthcheck listo)`);

  if (process.env.DATABASE_URL) {
    console.log('Conectando a base de datos...');
    dbConectada = await conectarDB();
    if (dbConectada) {
      await ejecutarMigraciones();
      console.log('  Base de datos lista ✓');
    } else {
      console.warn('  ⚠ No se pudo conectar a Postgres. Estado solo en memoria.');
    }
  } else {
    console.warn('⚠ DATABASE_URL no configurada. Estado solo en memoria.');
  }

  configurarSockets(io, config, datos, dbConectada);

  if (dbConectada) {
    const n = await recuperarSesionesDB(io, config);
    if (n > 0) console.log(`  ${n} sesion(es) recuperada(s) de Postgres`);
  }

  const faltantes = verificarVariables();
  const modeloPensar = process.env.ANTHROPIC_MODEL_PENSAR || 'claude-sonnet-5';
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║   SIMULADOR DE ANALISIS CAUSAL — ETF Bank                  ║`);
  console.log(`║   Servidor escuchando en puerto ${String(PORT).padEnd(29)}║`);
  console.log(`║   Base de datos: ${(dbConectada ? 'conectada' : 'solo memoria').padEnd(40)}║`);
  console.log(`║   IA consejo:  ${modeloPensar.padEnd(42)}║`);
  console.log(`║   Acto 1:      texto fijo + Deepgram en vivo${' '.padEnd(14)}║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);

  if (faltantes.length > 0) {
    console.warn(`\n⚠ Variables faltantes (funcionalidad reducida):`);
    for (const v of faltantes) {
      console.warn(`  - ${v}`);
    }
  }

  process.on('SIGTERM', async () => {
    console.log('\nCerrando servidor...');
    await cerrarDB();
    httpServer.close();
    process.exit(0);
  });
}

function verificarVariables(): string[] {
  const requeridas = ['DATABASE_URL', 'ANTHROPIC_API_KEY', 'DEEPGRAM_API_KEY', 'CLAVE_SUPERADMIN'];
  return requeridas.filter(v => {
    if (v === 'CLAVE_SUPERADMIN') return !process.env.CLAVE_SUPERADMIN && !process.env.CLAVE_PROFESOR;
    return !process.env[v];
  });
}

main().catch(err => {
  console.error('Error al iniciar servidor:', err);
  process.exit(1);
});
