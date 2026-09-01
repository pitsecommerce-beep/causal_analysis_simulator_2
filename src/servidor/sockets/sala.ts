import type { Server as SocketServer, Socket } from 'socket.io';
import type { ConfigSimulador, EstadoMotor, RolEquipo, MiembroEquipo } from '../motor/tipos.js';
import type { DatosCargados, Solicitud, ComentarioCliente } from '../datos/tipos.js';
import { crearEstadoInicial, avanzarTrimestre } from '../motor/dag.js';
import { aplicarIntervencion, listarIntervencionesDisponibles } from '../motor/intervenciones.js';
import { calcularPuntuacion } from '../puntuacion/reglas.js';
import {
  crearReloj, iniciarReloj, pausarReloj, extenderFase, detenerReloj,
  obtenerEstadoReloj, reconstruirRelojDesdeDB,
  type RelojSesion, type NombreFase,
} from './reloj.js';
import * as db from '../db/consultas.js';
import { precalentarEscena, estadoEscena, obtenerEscena, limpiarCache } from '../voz/escena.js';
import { generarPreguntasConsejo, type PreguntaConsejo } from '../voz/anthropic.js';
import { verificarAuth, parsearCookies, NOMBRE_COOKIE, type InfoAuth } from '../auth.js';

const ROLES_VALIDOS: RolEquipo[] = ['patrocinador', 'lider', 'analista', 'voz_cliente'];

interface PropuestaEnMemoria {
  id: string;
  intervencionId: number;
  intervencionNombre: string;
  costo: number;
  justificacion: string;
  propuestoPor: string;
  rolPropuesto: RolEquipo;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  respuesta?: string;
  timestamp: string;
  sucursales?: number[];
}

interface SolicitudAccionEnMemoria {
  id: string;
  de: string;
  rolDe: RolEquipo;
  para: RolEquipo;
  tipo: 'consulta' | 'testimonios' | 'diagnostico' | 'general';
  mensaje: string;
  estado: 'pendiente' | 'completada' | 'descartada';
  timestamp: string;
}

interface EquipoActivo {
  dbId: number | null;
  nombre: string;
  estadoMotor: EstadoMotor;
  miembros: MiembroEquipo[];
  evidencias: Array<{ comentarioId: string; hipotesis: string; registradoPor: string }>;
  consultasRealizadas: Set<string>;
  resultado: import('../motor/tipos.js').ResultadoPuntuacion | null;
  preguntasConsejo: PreguntaConsejo[] | null;
  codigosPersonales: Map<string, string>;
  socketsActivos: Map<string, string>;
  propuestas: PropuestaEnMemoria[];
  solicitudesAccion: SolicitudAccionEnMemoria[];
}

interface AsignacionMemoria {
  nombreEquipo: string;
  email: string;
}

interface SesionActiva {
  dbId: number | null;
  codigoSala: string;
  reloj: RelojSesion;
  equipos: Map<string, EquipoActivo>;
  asignaciones: AsignacionMemoria[];
}

const sesiones = new Map<string, SesionActiva>();
let dbDisponible = false;

const CHARS_SIN_AMBIGUOS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generarCodigoSala(): string {
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += CHARS_SIN_AMBIGUOS[Math.floor(Math.random() * CHARS_SIN_AMBIGUOS.length)];
  }
  return codigo;
}

function generarCodigoPersonal(sesion: SesionActiva): string {
  const usados = new Set<string>();
  for (const eq of sesion.equipos.values()) {
    for (const c of eq.codigosPersonales.values()) usados.add(c);
  }
  let codigo: string;
  do {
    codigo = '';
    for (let i = 0; i < 6; i++) {
      codigo += CHARS_SIN_AMBIGUOS[Math.floor(Math.random() * CHARS_SIN_AMBIGUOS.length)];
    }
  } while (usados.has(codigo));
  return codigo;
}

function obtenerAuthSocket(socket: Socket): InfoAuth | null {
  return (socket as any).__auth ?? null;
}

function esProfesorOAdmin(auth: InfoAuth | null): boolean {
  return auth !== null && (auth.tipo === 'profesor' || auth.tipo === 'superadmin');
}

const FASES_TRIMESTRE: Record<string, number> = {
  trimestre_2: 1,
  trimestre_3: 2,
  consejo: 3,
};

function fechaISO(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

function prepararDatosCliente(solicitudes: Solicitud[]): unknown[] {
  return solicitudes.map(s => ({
    id: s.id,
    clienteId: s.clienteId,
    edad: s.edad,
    estadoCivil: s.estadoCivil,
    genero: s.genero,
    estado: s.estado,
    sucursal: s.sucursal,
    aniosCliente: s.aniosCliente,
    scoreBuro: s.scoreBuro,
    scoreETF: s.scoreETF,
    intentos: s.intentos,
    fechaPrimerCaptura: s.fechaPrimerCaptura.toISOString(),
    fechaUltimaCaptura: s.fechaUltimaCaptura.toISOString(),
    fechaEnvioDocumentos: fechaISO(s.fechaEnvioDocumentos),
    fechaRecepcionCrOP: fechaISO(s.fechaRecepcionCrOP),
    resultadoBuro: s.resultadoBuro,
    fechaBuro: fechaISO(s.fechaBuro),
    resultadoScoreETF: s.resultadoScoreETF,
    fechaScoreETF: fechaISO(s.fechaScoreETF),
    fechaPlastico: fechaISO(s.fechaPlastico),
    ultimoEstatus: s.ultimoEstatus,
    lineaCredito: s.lineaCredito,
    comentariosRaw: s.comentariosRaw,
  }));
}

function prepararComentariosClientes(comentarios: ComentarioCliente[]): unknown[] {
  return comentarios.map(c => ({
    id: c.id,
    solicitudId: c.solicitudId,
    estado: c.estado,
    sucursal: c.sucursal,
    intentos: c.intentos,
    canal: c.canalCaptacion,
    fecha: c.fechaComentario,
    categoriaPrimaria: c.categoriaPrimaria,
    categoriaSecundaria: c.categoriaSecundaria,
    comentario: c.comentario,
  }));
}

export function configurarSockets(
  io: SocketServer,
  config: ConfigSimulador,
  datos: DatosCargados,
  conDB: boolean,
): void {
  dbDisponible = conDB;

  function tomarSocketActivo(
    equipo: EquipoActivo,
    participante: string,
    nuevoSocket: Socket,
    codigoSala: string,
  ) {
    const anteriorId = equipo.socketsActivos.get(participante);
    if (anteriorId && anteriorId !== nuevoSocket.id) {
      const anterior = io.sockets.sockets.get(anteriorId);
      if (anterior) {
        anterior.emit('sesion:tomada', {
          mensaje: 'Tu sesion fue abierta en otro dispositivo.',
        });
        anterior.leave(`sala:${codigoSala}`);
        anterior.leave(`equipo:${codigoSala}:${equipo.nombre}`);
      }
    }
    equipo.socketsActivos.set(participante, nuevoSocket.id);
  }

  io.on('connection', async (socket: Socket) => {
    const cookies = parsearCookies(socket.handshake.headers.cookie);
    const authToken = cookies[NOMBRE_COOKIE];
    if (authToken) {
      const auth = await verificarAuth(authToken, dbDisponible);
      if (auth) (socket as any).__auth = auth;
    }

    socket.on('profesor:crear_sesion', async (_payload, ack) => {
      const auth = obtenerAuthSocket(socket);
      if (!esProfesorOAdmin(auth)) {
        return ack?.({ error: 'No autorizado — inicia sesion primero' });
      }
      const codigo = generarCodigoSala();
      const sesion: SesionActiva = {
        dbId: null,
        codigoSala: codigo,
        reloj: crearReloj(),
        equipos: new Map(),
        asignaciones: [],
      };
      if (dbDisponible) {
        try {
          const row = await db.crearSesion(codigo, undefined, auth?.profesorId);
          sesion.dbId = row.id;
        } catch (_) { /* sin persistencia */ }
      }
      sesiones.set(codigo, sesion);
      socket.join(`sala:${codigo}`);
      socket.join(`profesor:${codigo}`);

      precalentarEscena(codigo, datos, config).then(() => {
        io.to(`profesor:${codigo}`).emit('escena:estado', {
          estado: estadoEscena(codigo),
        });
      }).catch(() => {});

      ack?.({ codigoSala: codigo });
    });

    socket.on('profesor:unirse_sala', (payload, ack) => {
      if (!esProfesorOAdmin(obtenerAuthSocket(socket))) {
        return ack?.({ error: 'No autorizado' });
      }
      const sesion = sesiones.get(payload?.codigoSala);
      if (!sesion) return ack?.({ error: 'Sesion no encontrada' });
      socket.join(`sala:${sesion.codigoSala}`);
      socket.join(`profesor:${sesion.codigoSala}`);
      ack?.({ ok: true, codigoSala: sesion.codigoSala });
    });

    socket.on('profesor:iniciar_reloj', (payload, ack) => {
      if (!esProfesorOAdmin(obtenerAuthSocket(socket))) {
        return ack?.({ error: 'No autorizado' });
      }
      const sesion = sesiones.get(payload?.codigoSala);
      if (!sesion) return ack?.({ error: 'Sesión no encontrada' });
      if (sesion.reloj.iniciado) return ack?.({ error: 'Reloj ya iniciado' });

      iniciarReloj(sesion.reloj, sesion.codigoSala, io, config, (anterior, nueva) => {
        manejarCambioFase(sesion, anterior, nueva, io, config);
      });
      persistirReloj(sesion);
      ack?.({ ok: true, reloj: obtenerEstadoReloj(sesion.reloj, config) });
    });

    socket.on('profesor:pausar_reloj', (payload, ack) => {
      if (!esProfesorOAdmin(obtenerAuthSocket(socket))) {
        return ack?.({ error: 'No autorizado' });
      }
      const sesion = sesiones.get(payload?.codigoSala);
      if (!sesion) return ack?.({ error: 'Sesión no encontrada' });

      const pausado = pausarReloj(sesion.reloj);
      io.to(`sala:${sesion.codigoSala}`).emit('reloj:pausado', { pausado });
      persistirReloj(sesion);
      ack?.({ ok: true, pausado });
    });

    socket.on('profesor:extender_fase', (payload, ack) => {
      if (!esProfesorOAdmin(obtenerAuthSocket(socket))) {
        return ack?.({ error: 'No autorizado' });
      }
      const sesion = sesiones.get(payload?.codigoSala);
      if (!sesion) return ack?.({ error: 'Sesión no encontrada' });

      const fase = payload?.fase ?? sesion.reloj.faseActual;
      const minutos = parseInt(payload?.minutos, 10) || 2;
      extenderFase(sesion.reloj, fase, minutos);
      persistirReloj(sesion);
      ack?.({ ok: true, reloj: obtenerEstadoReloj(sesion.reloj, config) });
    });

    socket.on('profesor:estado', (payload, ack) => {
      if (!esProfesorOAdmin(obtenerAuthSocket(socket))) {
        return ack?.({ error: 'No autorizado' });
      }
      const sesion = sesiones.get(payload?.codigoSala);
      if (!sesion) return ack?.({ error: 'Sesión no encontrada' });

      const equipos = Array.from(sesion.equipos.values()).map(e => ({
        nombre: e.nombre,
        trimestre: e.estadoMotor.trimestre,
        presupuesto: e.estadoMotor.presupuesto,
        creditos: e.estadoMotor.creditosIndagacion,
        intervenciones: e.estadoMotor.intervenciones.length,
        kpis: e.estadoMotor.kpis,
      }));

      ack?.({
        codigoSala: sesion.codigoSala,
        reloj: obtenerEstadoReloj(sesion.reloj, config),
        equipos,
      });
    });

    socket.on('profesor:tablero', (payload, ack) => {
      if (!esProfesorOAdmin(obtenerAuthSocket(socket))) {
        return ack?.({ error: 'No autorizado' });
      }
      const sesion = sesiones.get(payload?.codigoSala);
      if (!sesion) return ack?.({ error: 'Sesión no encontrada' });

      const equipos = Array.from(sesion.equipos.values()).map(e => ({
        nombre: e.nombre,
        trimestre: e.estadoMotor.trimestre,
        presupuesto: e.estadoMotor.presupuesto,
        creditos: e.estadoMotor.creditosIndagacion,
        intervenciones: e.estadoMotor.intervenciones.map(i => i.nombre),
        kpis: e.estadoMotor.kpis,
        historialKPIs: e.estadoMotor.historialKPIs,
        resultado: e.resultado,
        miembros: e.miembros,
      }));

      ack?.({
        reloj: obtenerEstadoReloj(sesion.reloj, config),
        equipos,
        escena: estadoEscena(sesion.codigoSala),
      });
    });

    socket.on('profesor:revelar_dag', (payload, ack) => {
      if (!esProfesorOAdmin(obtenerAuthSocket(socket))) {
        return ack?.({ error: 'No autorizado' });
      }
      const sesion = sesiones.get(payload?.codigoSala);
      if (!sesion) return ack?.({ error: 'Sesión no encontrada' });

      if (sesion.reloj.faseActual !== 'consejo' && sesion.reloj.faseActual !== 'finalizado') {
        return ack?.({ error: 'El DAG solo se revela en la fase de consejo' });
      }

      io.to(`sala:${sesion.codigoSala}`).emit('sesion:dag_revelado', {
        verdadOculta: datos.verdadOculta,
      });
      ack?.({ ok: true });
    });

    socket.on('profesor:configurar_equipos', async (payload, ack) => {
      if (!esProfesorOAdmin(obtenerAuthSocket(socket))) {
        return ack?.({ error: 'No autorizado' });
      }
      const sesion = sesiones.get(payload?.codigoSala);
      if (!sesion) return ack?.({ error: 'Sesión no encontrada' });

      const equipos = payload?.equipos as { nombre: string; emails: string[] }[] | undefined;
      if (!equipos || !Array.isArray(equipos) || equipos.length === 0) {
        return ack?.({ error: 'Se requiere al menos un equipo con emails' });
      }

      for (const eq of equipos) {
        if (!eq.nombre?.trim()) return ack?.({ error: 'Cada equipo necesita un nombre' });
        if (!eq.emails || !Array.isArray(eq.emails) || eq.emails.length === 0) {
          return ack?.({ error: `El equipo "${eq.nombre}" necesita al menos un email` });
        }
      }

      const todosEmails = equipos.flatMap(e => e.emails.map(em => em.toLowerCase().trim()));
      const setEmails = new Set(todosEmails);
      if (setEmails.size !== todosEmails.length) {
        return ack?.({ error: 'Hay emails duplicados entre equipos' });
      }

      sesion.asignaciones = equipos.flatMap(eq =>
        eq.emails.map(email => ({ nombreEquipo: eq.nombre.trim(), email: email.toLowerCase().trim() }))
      );

      for (const eq of equipos) {
        const nombre = eq.nombre.trim();
        if (!sesion.equipos.has(nombre)) {
          const estadoMotor = crearEstadoInicial(config);
          const equipo: EquipoActivo = {
            dbId: null, nombre, estadoMotor, miembros: [], evidencias: [],
            consultasRealizadas: new Set(), resultado: null, preguntasConsejo: null, codigosPersonales: new Map(), socketsActivos: new Map(), propuestas: [], solicitudesAccion: [],
          };
          if (dbDisponible && sesion.dbId) {
            try {
              const row = await db.crearEquipo(sesion.dbId, nombre, estadoMotor);
              equipo.dbId = row.id;
            } catch (_) { /* sin persistencia */ }
          }
          sesion.equipos.set(nombre, equipo);
        }
      }

      if (dbDisponible && sesion.dbId) {
        try {
          await db.guardarAsignaciones(sesion.dbId, equipos.map(eq => ({
            nombre: eq.nombre.trim(),
            emails: eq.emails.map(e => e.toLowerCase().trim()),
          })));
        } catch (_) { /* sin persistencia */ }
      }

      io.to(`profesor:${sesion.codigoSala}`).emit('sesion:equipos_configurados', {
        equipos: equipos.map(eq => ({
          nombre: eq.nombre.trim(),
          emails: eq.emails.map(e => e.toLowerCase().trim()),
        })),
      });

      ack?.({ ok: true, totalEquipos: equipos.length, totalParticipantes: todosEmails.length });
    });

    socket.on('profesor:obtener_asignaciones', (payload, ack) => {
      if (!esProfesorOAdmin(obtenerAuthSocket(socket))) {
        return ack?.({ error: 'No autorizado' });
      }
      const sesion = sesiones.get(payload?.codigoSala);
      if (!sesion) return ack?.({ error: 'Sesión no encontrada' });

      const equiposMap = new Map<string, string[]>();
      for (const a of sesion.asignaciones) {
        const lista = equiposMap.get(a.nombreEquipo) ?? [];
        lista.push(a.email);
        equiposMap.set(a.nombreEquipo, lista);
      }

      const equipos = Array.from(equiposMap.entries()).map(([nombre, emails]) => ({ nombre, emails }));
      ack?.({ equipos });
    });

    socket.on('equipo:unirse', async (payload, ack) => {
      const codigo = payload?.codigoSala?.toUpperCase();
      const email = payload?.email?.toLowerCase()?.trim();
      const nombreDirecto = payload?.nombre?.trim();

      if (!codigo) return ack?.({ error: 'Código de sala requerido' });

      const sesion = sesiones.get(codigo);
      if (!sesion) return ack?.({ error: 'Sesión no encontrada' });

      let nombreEquipo: string;

      if (sesion.asignaciones.length > 0) {
        if (!email) return ack?.({ error: 'Ingresa tu correo electrónico' });
        const asignacion = sesion.asignaciones.find(a => a.email === email);
        if (!asignacion) {
          return ack?.({ error: 'Tu correo no está registrado en esta sesión. Contacta al profesor.' });
        }
        nombreEquipo = asignacion.nombreEquipo;
      } else {
        if (!nombreDirecto) return ack?.({ error: 'Código de sala y nombre de equipo requeridos' });
        nombreEquipo = nombreDirecto;
      }

      let equipo = sesion.equipos.get(nombreEquipo);
      if (!equipo) {
        const estadoMotor = crearEstadoInicial(config);
        equipo = { dbId: null, nombre: nombreEquipo, estadoMotor, miembros: [], evidencias: [], consultasRealizadas: new Set(), resultado: null, preguntasConsejo: null, codigosPersonales: new Map(), socketsActivos: new Map(), propuestas: [], solicitudesAccion: [] };
        if (dbDisponible && sesion.dbId) {
          try {
            const row = await db.crearEquipo(sesion.dbId, nombreEquipo, estadoMotor);
            equipo.dbId = row.id;
          } catch (_) { /* sin persistencia */ }
        }
        sesion.equipos.set(nombreEquipo, equipo);
        io.to(`profesor:${codigo}`).emit('sesion:equipo_unido', { nombre: nombreEquipo });
      }

      socket.join(`sala:${codigo}`);
      socket.join(`equipo:${codigo}:${nombreEquipo}`);
      (socket as any).__equipo = { codigoSala: codigo, nombre: nombreEquipo, email };

      io.to(`profesor:${codigo}`).emit('sesion:participante_conectado', {
        equipo: nombreEquipo,
        email: email ?? '',
      });

      ack?.({
        estadoMotor: equipo.estadoMotor,
        reloj: obtenerEstadoReloj(sesion.reloj, config),
        intervencionesCatalogo: listarIntervencionesDisponibles(equipo.estadoMotor, config),
        solicitudes: prepararDatosCliente(datos.solicitudes),
        comentariosClientes: prepararComentariosClientes(datos.comentarios),
        tamanoEquipo: config.equipo.tamano,
        nombreEquipo,
        miembros: equipo.miembros,
        evidencias: equipo.evidencias,
        resultado: equipo.resultado,
        preguntasConsejo: equipo.preguntasConsejo,
        propuestas: equipo.propuestas,
        solicitudesAccion: equipo.solicitudesAccion,
      });
    });

    socket.on('equipo:asignar_roles', async (payload, ack) => {
      const info = (socket as any).__equipo;
      if (!info) return ack?.({ error: 'No estás en un equipo' });

      const sesion = sesiones.get(info.codigoSala);
      const equipo = sesion?.equipos.get(info.nombre);
      if (!sesion || !equipo) return ack?.({ error: 'Equipo no encontrado' });

      const miembros = payload?.miembros as MiembroEquipo[] | undefined;
      if (!miembros || !Array.isArray(miembros) || miembros.length === 0) {
        return ack?.({ error: 'Se requieren miembros con roles' });
      }

      for (const m of miembros) {
        if (!m.nombre?.trim()) return ack?.({ error: 'Cada participante necesita un nombre' });
        if (!ROLES_VALIDOS.includes(m.rol)) return ack?.({ error: `Rol no válido: ${m.rol}` });
      }

      const tamano = config.equipo.tamano;
      const rolesReq = rolesRequeridos(tamano);
      const rolesAsignados = miembros.map(m => m.rol);
      for (const req of rolesReq) {
        if (!rolesAsignados.includes(req)) {
          return ack?.({ error: `Falta el rol obligatorio: ${req}` });
        }
      }

      const unicosExceptoAnalista = rolesAsignados.filter(r => r !== 'analista');
      const setUnicosExceptoAnalista = new Set(unicosExceptoAnalista);
      if (setUnicosExceptoAnalista.size !== unicosExceptoAnalista.length) {
        return ack?.({ error: 'Solo el rol de Analista puede repetirse' });
      }

      equipo.miembros = miembros.map(m => ({ nombre: m.nombre.trim(), rol: m.rol }));

      if (dbDisponible && equipo.dbId) {
        try {
          await db.guardarMiembros(equipo.dbId, equipo.miembros);
        } catch (_) { /* sin persistencia */ }
      }

      io.to(`equipo:${info.codigoSala}:${info.nombre}`).emit('equipo:roles_asignados', {
        miembros: equipo.miembros,
      });

      ack?.({ ok: true, miembros: equipo.miembros });
    });

    socket.on('equipo:elegir_rol', async (payload, ack) => {
      const info = (socket as any).__equipo;
      if (!info) return ack?.({ error: 'No estás en un equipo' });

      const sesion = sesiones.get(info.codigoSala);
      const equipo = sesion?.equipos.get(info.nombre);
      if (!sesion || !equipo) return ack?.({ error: 'Equipo no encontrado' });

      const rol = payload?.rol as RolEquipo;
      const participante = payload?.participante?.trim() as string;
      if (!rol || !participante) return ack?.({ error: 'Rol y nombre de participante requeridos' });
      if (!ROLES_VALIDOS.includes(rol)) return ack?.({ error: `Rol no válido: ${rol}` });

      (socket as any).__equipo.participante = participante;
      (socket as any).__equipo.rol = rol;

      tomarSocketActivo(equipo, participante, socket, info.codigoSala);

      const yaExiste = equipo.miembros.some(m => m.nombre === participante);
      if (!yaExiste) {
        equipo.miembros.push({ nombre: participante, rol });
      } else {
        const idx = equipo.miembros.findIndex(m => m.nombre === participante);
        if (idx >= 0) equipo.miembros[idx].rol = rol;
      }

      let codigoPersonal = equipo.codigosPersonales.get(participante);
      if (!codigoPersonal) {
        codigoPersonal = generarCodigoPersonal(sesion);
        equipo.codigosPersonales.set(participante, codigoPersonal);
      }

      if (dbDisponible && equipo.dbId) {
        try {
          await db.guardarMiembroConEmail(equipo.dbId, info.email ?? '', participante, rol);
          await db.guardarCodigoPersonal(equipo.dbId, participante, codigoPersonal);
          await db.actualizarConexionMiembro(equipo.dbId, participante, socket.id);
        } catch (_) { /* sin persistencia */ }
      }

      io.to(`equipo:${info.codigoSala}:${info.nombre}`).emit('equipo:miembro_sentado', {
        nombre: participante,
        rol,
        miembros: equipo.miembros,
      });

      ack?.({ ok: true, miembros: equipo.miembros, codigoPersonal });
    });

    socket.on('equipo:reconectar', (payload, ack) => {
      const codigo = payload?.codigoSala?.toUpperCase();
      const codigoPersonal = payload?.codigoPersonal?.toUpperCase();

      if (!codigo || !codigoPersonal) {
        return ack?.({ error: 'Código de sala y código personal requeridos' });
      }

      const sesion = sesiones.get(codigo);
      if (!sesion) return ack?.({ error: 'Sesión no encontrada' });

      let equipoEncontrado: EquipoActivo | null = null;
      let nombreEncontrado = '';
      let rolEncontrado: RolEquipo | null = null;

      for (const equipo of sesion.equipos.values()) {
        for (const [nombre, cod] of equipo.codigosPersonales.entries()) {
          if (cod === codigoPersonal) {
            equipoEncontrado = equipo;
            nombreEncontrado = nombre;
            const miembro = equipo.miembros.find(m => m.nombre === nombre);
            rolEncontrado = miembro?.rol ?? null;
            break;
          }
        }
        if (equipoEncontrado) break;
      }

      if (!equipoEncontrado || !rolEncontrado) {
        return ack?.({ error: 'Código personal no encontrado en esta sesión' });
      }

      tomarSocketActivo(equipoEncontrado, nombreEncontrado, socket, codigo);

      socket.join(`sala:${codigo}`);
      socket.join(`equipo:${codigo}:${equipoEncontrado.nombre}`);
      (socket as any).__equipo = {
        codigoSala: codigo,
        nombre: equipoEncontrado.nombre,
        participante: nombreEncontrado,
        rol: rolEncontrado,
      };

      if (dbDisponible && equipoEncontrado.dbId) {
        db.actualizarConexionMiembro(equipoEncontrado.dbId, nombreEncontrado, socket.id).catch(() => {});
      }

      socket.to(`equipo:${codigo}:${equipoEncontrado.nombre}`).emit('equipo:presencia', {
        participante: nombreEncontrado,
        estado: 'idle',
      });

      io.to(`profesor:${codigo}`).emit('sesion:participante_reconectado', {
        equipo: equipoEncontrado.nombre,
        participante: nombreEncontrado,
      });

      ack?.({
        estadoMotor: equipoEncontrado.estadoMotor,
        reloj: obtenerEstadoReloj(sesion.reloj, config),
        intervencionesCatalogo: listarIntervencionesDisponibles(equipoEncontrado.estadoMotor, config),
        solicitudes: prepararDatosCliente(datos.solicitudes),
        comentariosClientes: prepararComentariosClientes(datos.comentarios),
        tamanoEquipo: config.equipo.tamano,
        nombreEquipo: equipoEncontrado.nombre,
        miembros: equipoEncontrado.miembros,
        evidencias: equipoEncontrado.evidencias,
        resultado: equipoEncontrado.resultado,
        preguntasConsejo: equipoEncontrado.preguntasConsejo,
        miNombre: nombreEncontrado,
        miRol: rolEncontrado,
        codigoPersonal,
        propuestas: equipoEncontrado.propuestas,
        solicitudesAccion: equipoEncontrado.solicitudesAccion,
      });
    });

    socket.on('equipo:intervenir', async (payload, ack) => {
      const info = (socket as any).__equipo;
      if (!info) return ack?.({ error: 'No estás en un equipo' });

      const sesion = sesiones.get(info.codigoSala);
      const equipo = sesion?.equipos.get(info.nombre);
      if (!sesion || !equipo) return ack?.({ error: 'Equipo no encontrado' });

      if (equipo.miembros.length > 0 && info.rol !== 'patrocinador') {
        return ack?.({ error: 'Solo el Patrocinador del proceso puede autorizar intervenciones' });
      }

      const id = parseInt(payload?.intervencionId, 10);
      if (isNaN(id)) return ack?.({ error: 'ID de intervención no válido' });

      const sucursales = payload?.sucursales as number[] | undefined;
      const resultado = aplicarIntervencion(equipo.estadoMotor, id, config, sucursales);

      if (resultado.exito) {
        persistirEquipo(sesion, equipo);
        io.to(`equipo:${info.codigoSala}:${info.nombre}`).emit('sesion:estado', {
          estadoMotor: equipo.estadoMotor,
          intervencionesCatalogo: listarIntervencionesDisponibles(equipo.estadoMotor, config),
        });
        io.to(`profesor:${info.codigoSala}`).emit('sesion:equipo_intervencion', {
          equipo: info.nombre,
          intervencionId: id,
          intervencionNombre: config.intervenciones.find(i => i.id === id)?.nombre,
        });
      }

      ack?.(resultado);
    });

    socket.on('equipo:proponer_intervencion', async (payload, ack) => {
      const info = (socket as any).__equipo;
      if (!info?.participante) return ack?.({ error: 'No estás en un equipo' });

      const sesion = sesiones.get(info.codigoSala);
      const equipo = sesion?.equipos.get(info.nombre);
      if (!sesion || !equipo) return ack?.({ error: 'Equipo no encontrado' });

      const intervencionId = parseInt(payload?.intervencionId, 10);
      if (isNaN(intervencionId)) return ack?.({ error: 'ID de intervención no válido' });

      const justificacion = (payload?.justificacion ?? '').trim();
      if (!justificacion) return ack?.({ error: 'Escribe una justificación para la propuesta' });

      const cfgInterv = config.intervenciones.find(i => i.id === intervencionId);
      if (!cfgInterv) return ack?.({ error: 'Intervención no encontrada' });

      const yaAplicada = equipo.estadoMotor.intervenciones.some(i => i.id === intervencionId);
      if (yaAplicada) return ack?.({ error: 'Esta intervención ya fue aplicada' });

      if (cfgInterv.costo > equipo.estadoMotor.presupuesto) {
        return ack?.({ error: `Presupuesto insuficiente (necesitas ${cfgInterv.costo}, tienes ${equipo.estadoMotor.presupuesto})` });
      }

      const yaPendiente = equipo.propuestas.some(p => p.intervencionId === intervencionId && p.estado === 'pendiente');
      if (yaPendiente) return ack?.({ error: 'Ya hay una propuesta pendiente para esta intervención' });

      const propuesta: PropuestaEnMemoria = {
        id: `prop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        intervencionId,
        intervencionNombre: cfgInterv.nombre,
        costo: cfgInterv.costo,
        justificacion,
        propuestoPor: info.participante,
        rolPropuesto: info.rol,
        estado: 'pendiente',
        timestamp: new Date().toISOString(),
        sucursales: payload?.sucursales as number[] | undefined,
      };

      equipo.propuestas.push(propuesta);

      io.to(`equipo:${info.codigoSala}:${info.nombre}`).emit('equipo:propuesta_nueva', propuesta);
      io.to(`profesor:${info.codigoSala}`).emit('sesion:equipo_propuesta', {
        equipo: info.nombre,
        propuesta,
      });

      ack?.({ ok: true, propuesta });
    });

    socket.on('equipo:responder_propuesta', async (payload, ack) => {
      const info = (socket as any).__equipo;
      if (!info?.participante) return ack?.({ error: 'No estás en un equipo' });

      const sesion = sesiones.get(info.codigoSala);
      const equipo = sesion?.equipos.get(info.nombre);
      if (!sesion || !equipo) return ack?.({ error: 'Equipo no encontrado' });

      if (equipo.miembros.length > 0 && info.rol !== 'patrocinador') {
        return ack?.({ error: 'Solo el Patrocinador puede aprobar o rechazar propuestas' });
      }

      const propuestaId = payload?.propuestaId;
      const decision: 'aprobada' | 'rechazada' = payload?.decision;
      const respuesta = (payload?.respuesta ?? '').trim();

      if (!propuestaId) return ack?.({ error: 'ID de propuesta requerido' });
      if (decision !== 'aprobada' && decision !== 'rechazada') {
        return ack?.({ error: 'Decisión debe ser "aprobada" o "rechazada"' });
      }

      const propuesta = equipo.propuestas.find(p => p.id === propuestaId);
      if (!propuesta) return ack?.({ error: 'Propuesta no encontrada' });
      if (propuesta.estado !== 'pendiente') return ack?.({ error: 'Esta propuesta ya fue resuelta' });

      propuesta.estado = decision;
      propuesta.respuesta = respuesta || undefined;

      if (decision === 'aprobada') {
        const resultado = aplicarIntervencion(
          equipo.estadoMotor, propuesta.intervencionId, config, propuesta.sucursales,
        );
        if (!resultado.exito) {
          propuesta.estado = 'pendiente';
          propuesta.respuesta = undefined;
          return ack?.({ error: resultado.mensaje });
        }
        persistirEquipo(sesion, equipo);

        io.to(`equipo:${info.codigoSala}:${info.nombre}`).emit('sesion:estado', {
          estadoMotor: equipo.estadoMotor,
          intervencionesCatalogo: listarIntervencionesDisponibles(equipo.estadoMotor, config),
        });
        io.to(`profesor:${info.codigoSala}`).emit('sesion:equipo_intervencion', {
          equipo: info.nombre,
          intervencionId: propuesta.intervencionId,
          intervencionNombre: propuesta.intervencionNombre,
        });
      }

      io.to(`equipo:${info.codigoSala}:${info.nombre}`).emit('equipo:propuesta_resuelta', {
        propuestaId,
        estado: decision,
        respuesta: propuesta.respuesta,
        resueltoPor: info.participante,
      });

      ack?.({ ok: true, estado: decision });
    });

    socket.on('equipo:solicitar_accion', async (payload, ack) => {
      const info = (socket as any).__equipo;
      if (!info?.participante) return ack?.({ error: 'No estás en un equipo' });

      const sesion = sesiones.get(info.codigoSala);
      const equipo = sesion?.equipos.get(info.nombre);
      if (!sesion || !equipo) return ack?.({ error: 'Equipo no encontrado' });

      const para = payload?.para as RolEquipo;
      if (!ROLES_VALIDOS.includes(para)) return ack?.({ error: 'Rol destinatario no válido' });
      if (para === info.rol) return ack?.({ error: 'No puedes solicitar una acción a tu propio rol' });

      const tipo = payload?.tipo ?? 'general';
      const mensaje = (payload?.mensaje ?? '').trim();
      if (!mensaje) return ack?.({ error: 'Escribe un mensaje para la solicitud' });

      const solicitud: SolicitudAccionEnMemoria = {
        id: `sol_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        de: info.participante,
        rolDe: info.rol,
        para,
        tipo,
        mensaje,
        estado: 'pendiente',
        timestamp: new Date().toISOString(),
      };

      equipo.solicitudesAccion.push(solicitud);

      io.to(`equipo:${info.codigoSala}:${info.nombre}`).emit('equipo:solicitud_nueva', solicitud);

      ack?.({ ok: true, solicitud });
    });

    socket.on('equipo:resolver_solicitud', async (payload, ack) => {
      const info = (socket as any).__equipo;
      if (!info?.participante) return ack?.({ error: 'No estás en un equipo' });

      const sesion = sesiones.get(info.codigoSala);
      const equipo = sesion?.equipos.get(info.nombre);
      if (!sesion || !equipo) return ack?.({ error: 'Equipo no encontrado' });

      const solicitudId = payload?.solicitudId;
      const accion: 'completada' | 'descartada' = payload?.accion;
      if (!solicitudId) return ack?.({ error: 'ID de solicitud requerido' });
      if (accion !== 'completada' && accion !== 'descartada') {
        return ack?.({ error: 'Acción debe ser "completada" o "descartada"' });
      }

      const solicitud = equipo.solicitudesAccion.find(s => s.id === solicitudId);
      if (!solicitud) return ack?.({ error: 'Solicitud no encontrada' });
      if (solicitud.estado !== 'pendiente') return ack?.({ error: 'Esta solicitud ya fue resuelta' });

      solicitud.estado = accion;

      io.to(`equipo:${info.codigoSala}:${info.nombre}`).emit('equipo:solicitud_resuelta', {
        solicitudId,
        estado: accion,
        resueltoPor: info.participante,
      });

      ack?.({ ok: true });
    });

    socket.on('equipo:consulta', async (payload, ack) => {
      const info = (socket as any).__equipo;
      if (!info) return ack?.({ error: 'No estás en un equipo' });

      const sesion = sesiones.get(info.codigoSala);
      const equipo = sesion?.equipos.get(info.nombre);
      if (!sesion || !equipo) return ack?.({ error: 'Equipo no encontrado' });

      if (equipo.miembros.length > 0 && info.rol !== 'analista') {
        return ack?.({ error: 'Solo el Analista de datos puede ejecutar consultas' });
      }

      const tipo = payload?.tipo as string;
      const hipotesis = payload?.hipotesis?.trim() as string;
      const parametros = payload?.parametros as Record<string, unknown> | null;

      if (!hipotesis) return ack?.({ error: 'La hipótesis es obligatoria' });

      const costos = config.costos_consulta as Record<string, number>;
      const costo = costos[tipo];
      if (costo === undefined) return ack?.({ error: `Tipo de consulta no válido: ${tipo}` });

      if (equipo.estadoMotor.creditosIndagacion < costo) {
        return ack?.({ error: 'Créditos de indagación insuficientes' });
      }

      equipo.estadoMotor.creditosIndagacion -= costo;
      equipo.consultasRealizadas.add(tipo);

      if (dbDisponible && equipo.dbId) {
        try {
          await db.registrarConsulta(equipo.dbId, tipo, hipotesis, parametros, equipo.estadoMotor.trimestre);
        } catch (_) { /* sin persistencia */ }
      }

      persistirEquipo(sesion, equipo);

      io.to(`equipo:${info.codigoSala}:${info.nombre}`).emit('sesion:estado', {
        estadoMotor: equipo.estadoMotor,
      });

      ack?.({ ok: true, creditosRestantes: equipo.estadoMotor.creditosIndagacion });
    });

    socket.on('equipo:marcar_evidencia', async (payload, ack) => {
      const info = (socket as any).__equipo;
      if (!info) return ack?.({ error: 'No estás en un equipo' });

      const sesion = sesiones.get(info.codigoSala);
      const equipo = sesion?.equipos.get(info.nombre);
      if (!sesion || !equipo) return ack?.({ error: 'Equipo no encontrado' });

      const tamano = config.equipo.tamano;
      const puedeMarcar = info.rol === 'voz_cliente' || (tamano <= 3 && info.rol === 'lider');
      if (equipo.miembros.length > 0 && !puedeMarcar) {
        return ack?.({ error: 'Solo la Voz del cliente puede marcar evidencia' });
      }

      const comentarioId = payload?.comentarioId as string;
      const hipotesis = payload?.hipotesis?.trim() as string;
      if (!comentarioId || !hipotesis) {
        return ack?.({ error: 'Se requiere comentarioId e hipótesis' });
      }

      const registradoPor = info.participante ?? 'desconocido';

      equipo.evidencias.push({ comentarioId, hipotesis, registradoPor });

      if (dbDisponible && equipo.dbId) {
        try {
          await db.registrarEvidencia(equipo.dbId, comentarioId, hipotesis, registradoPor);
        } catch (_) { /* sin persistencia */ }
      }

      if (dbDisponible && equipo.dbId) {
        try {
          await db.registrarConsulta(equipo.dbId, 'evidencia', hipotesis,
            { comentarioId, registradoPor }, equipo.estadoMotor.trimestre);
        } catch (_) { /* sin persistencia */ }
      }

      io.to(`equipo:${info.codigoSala}:${info.nombre}`).emit('equipo:evidencia_marcada', {
        comentarioId,
        hipotesis,
        registradoPor,
        totalEvidencias: equipo.evidencias.length,
      });

      ack?.({ ok: true, totalEvidencias: equipo.evidencias.length });
    });

    socket.on('equipo:diagnostico', async (payload, ack) => {
      const info = (socket as any).__equipo;
      if (!info) return ack?.({ error: 'No estás en un equipo' });

      const sesion = sesiones.get(info.codigoSala);
      const equipo = sesion?.equipos.get(info.nombre);
      if (!sesion || !equipo) return ack?.({ error: 'Equipo no encontrado' });

      if (equipo.miembros.length > 0 && info.rol !== 'lider') {
        return ack?.({ error: 'Solo el Líder de mejora puede enviar el diagnóstico' });
      }

      const diagnostico = payload?.diagnostico;
      if (!diagnostico) return ack?.({ error: 'Diagnóstico es requerido' });

      const rigor = {
        paretoEstratificacion: equipo.consultasRealizadas.has('segmentar'),
        dispersionInterpretacion: equipo.consultasRealizadas.has('correlacionar'),
        embudoEtapas: equipo.consultasRealizadas.has('embudo'),
        hipotesisEscrita: equipo.consultasRealizadas.size > 0,
        cruzoComentariosBase: equipo.evidencias.length > 0,
      };

      const minuto = sesion.reloj.segundoActual / 60;
      diagnostico.minutoDeclaracion = Math.round(minuto);

      let estado = equipo.estadoMotor;
      while (estado.trimestre < 3) {
        estado = avanzarTrimestre(estado, config);
      }
      equipo.estadoMotor = estado;

      const resultado = calcularPuntuacion(estado, diagnostico, rigor, config);
      equipo.resultado = resultado;

      if (dbDisponible && equipo.dbId) {
        try {
          await db.guardarDiagnostico(equipo.dbId, diagnostico, rigor, resultado, minuto);
          await db.actualizarEstadoMotor(equipo.dbId, estado);
        } catch (_) { /* sin persistencia */ }
      }

      const diagnosticoTexto = [
        diagnostico.ventanaCapturaEsCuello ? 'La ventana de captura es el cuello de botella del proceso.' : null,
        diagnostico.reprocesoEsMecanismo ? 'El reproceso por errores de captura es el mecanismo principal.' : null,
        diagnostico.fugaPlastico ? 'Hay fuga de plásticos aprobados que nunca se envían.' : null,
        diagnostico.trabajoPerdidoBuro ? 'Se pierde trabajo en casos que el buró rechazará.' : null,
        diagnostico.concentracionSinMasa ? 'La concentración en pocas sucursales no tiene masa real.' : null,
        ...(diagnostico.causasEspurias || []).map((c: string) => `Causa identificada: ${c}`),
      ].filter(Boolean).join('\n');

      const intervencionesTexto = estado.intervenciones
        .map(i => `- ${i.nombre} (T${i.trimestre})`)
        .join('\n') || 'Ninguna intervención aplicada.';

      generarPreguntasConsejo(diagnosticoTexto, intervencionesTexto, 15000)
        .then(({ preguntas }) => {
          equipo.preguntasConsejo = preguntas;
          io.to(`equipo:${info.codigoSala}:${info.nombre}`).emit('consejo:preguntas', { preguntas });
        })
        .catch(() => {});

      io.to(`profesor:${info.codigoSala}`).emit('sesion:equipo_diagnostico', {
        equipo: info.nombre,
        resultado,
      });

      ack?.({ resultado, estadoMotor: estado });
    });

    socket.on('escena:solicitar', (payload, ack) => {
      const codigo = payload?.codigoSala;
      if (!codigo || !sesiones.has(codigo)) {
        return ack?.({ error: 'Sesión no encontrada' });
      }
      const estado = estadoEscena(codigo);
      if (estado !== 'lista' && estado !== 'error') {
        return ack?.({ estado, escena: null });
      }
      const escena = obtenerEscena(codigo);
      if (!escena) return ack?.({ estado, escena: null });

      ack?.({
        estado,
        escena: {
          director: {
            nombre: escena.director.nombre,
            texto: escena.director.texto,
            fuenteTexto: escena.director.fuenteTexto,
            tieneAudio: escena.director.audio.length > 0,
          },
          clientes: escena.clientes.map(c => ({
            nombre: c.nombre,
            genero: c.genero,
            estado: c.estado,
            sucursal: c.sucursal,
            intentos: c.intentos,
            texto: c.texto,
            fuenteTexto: c.fuenteTexto,
            tieneAudio: c.audio.length > 0,
          })),
          adriana: {
            nombre: escena.adriana.nombre,
            texto: escena.adriana.texto,
            fuenteTexto: escena.adriana.fuenteTexto,
            tieneAudio: escena.adriana.audio.length > 0,
          },
        },
      });
    });

    socket.on('escena:audio', (payload, ack) => {
      const codigo = payload?.codigoSala;
      const rol = payload?.rol as string;
      const indice = payload?.indice as number | undefined;

      if (!codigo || !sesiones.has(codigo)) {
        return ack?.({ error: 'Sesión no encontrada' });
      }
      const escena = obtenerEscena(codigo);
      if (!escena) return ack?.({ error: 'Escena no lista' });

      let pieza;
      if (rol === 'director') {
        pieza = escena.director;
      } else if (rol === 'adriana') {
        pieza = escena.adriana;
      } else if (rol === 'cliente' && typeof indice === 'number') {
        pieza = escena.clientes[indice];
      }

      if (!pieza || pieza.audio.length === 0) {
        return ack?.({ error: 'Audio no disponible' });
      }

      ack?.({ audio: pieza.audio.toString('base64'), formato: 'mp3' });
    });

    socket.on('escena:estado_generacion', (payload, ack) => {
      const codigo = payload?.codigoSala;
      if (!codigo) return ack?.({ error: 'Código requerido' });
      ack?.({ estado: estadoEscena(codigo) });
    });

    // Presence broadcasting — 200ms throttle per socket
    let ultimaPresencia = 0;
    socket.on('equipo:presencia', (payload) => {
      const ahora = Date.now();
      if (ahora - ultimaPresencia < 200) return;
      ultimaPresencia = ahora;

      const info = (socket as any).__equipo;
      if (!info?.participante) return;

      const estado = typeof payload?.estado === 'string' ? payload.estado : 'idle';
      const validos = ['idle', 'tecleando', 'consultando', 'decidiendo', 'esperando'];
      if (!validos.includes(estado)) return;

      socket.to(`equipo:${info.codigoSala}:${info.nombre}`).emit('equipo:presencia', {
        participante: info.participante,
        estado,
      });
    });

    socket.on('disconnect', () => {
      const info = (socket as any).__equipo;
      if (info?.participante) {
        const sesion = sesiones.get(info.codigoSala);
        const equipo = sesion?.equipos.get(info.nombre);
        if (equipo && equipo.socketsActivos.get(info.participante) === socket.id) {
          equipo.socketsActivos.delete(info.participante);
        }
        socket.to(`equipo:${info.codigoSala}:${info.nombre}`).emit('equipo:presencia', {
          participante: info.participante,
          estado: 'desconectado',
        });
      }
    });
  });
}

function manejarCambioFase(
  sesion: SesionActiva,
  _anterior: NombreFase,
  nueva: NombreFase,
  io: SocketServer,
  config: ConfigSimulador,
): void {
  const trimestreObjetivo = FASES_TRIMESTRE[nueva];
  if (trimestreObjetivo === undefined) return;

  for (const equipo of sesion.equipos.values()) {
    while (equipo.estadoMotor.trimestre < trimestreObjetivo) {
      equipo.estadoMotor = avanzarTrimestre(equipo.estadoMotor, config);
    }
    persistirEquipo(sesion, equipo);

    io.to(`equipo:${sesion.codigoSala}:${equipo.nombre}`).emit('sesion:trimestre_avanzado', {
      trimestre: equipo.estadoMotor.trimestre,
      estadoMotor: equipo.estadoMotor,
      intervencionesCatalogo: listarIntervencionesDisponibles(equipo.estadoMotor, config),
    });
  }
}

async function persistirReloj(sesion: SesionActiva): Promise<void> {
  if (!dbDisponible || !sesion.dbId) return;
  try {
    await db.actualizarRelojSesion(sesion.dbId, {
      fase_actual: sesion.reloj.faseActual,
      reloj_iniciado: sesion.reloj.iniciado,
      reloj_pausado: sesion.reloj.pausado,
      segundo_actual: sesion.reloj.segundoActual,
      extensiones: sesion.reloj.extensiones,
      reloj_iniciado_en: sesion.reloj.iniciadoEn?.toISOString() ?? null,
      reloj_pausado_en: sesion.reloj.pausadoEn?.toISOString() ?? null,
      tiempo_pausado_total_ms: sesion.reloj.tiempoPausadoTotalMs,
    });
  } catch (_) { /* silently continue */ }
}

async function persistirEquipo(sesion: SesionActiva, equipo: EquipoActivo): Promise<void> {
  if (!dbDisponible || !equipo.dbId) return;
  try {
    await db.actualizarEstadoMotor(equipo.dbId, equipo.estadoMotor);
  } catch (_) { /* silently continue */ }
}

function rolesRequeridos(tamano: number): RolEquipo[] {
  if (tamano <= 3) return ['patrocinador', 'lider', 'analista'];
  return ['patrocinador', 'lider', 'analista', 'voz_cliente'];
}

export async function recuperarSesionesDB(
  io: SocketServer,
  config: ConfigSimulador,
): Promise<number> {
  if (!dbDisponible) return 0;
  let recuperadas = 0;
  try {
    const sesionesDB = await db.obtenerSesionesActivas();
    for (const sDB of sesionesDB) {
      if (sesiones.has(sDB.codigo_sala)) continue;

      const reloj = reconstruirRelojDesdeDB({
        reloj_iniciado: sDB.reloj_iniciado,
        reloj_pausado: sDB.reloj_pausado,
        segundo_actual: sDB.segundo_actual,
        fase_actual: sDB.fase_actual,
        extensiones: sDB.extensiones ?? {},
        reloj_iniciado_en: sDB.reloj_iniciado_en,
        reloj_pausado_en: sDB.reloj_pausado_en,
        tiempo_pausado_total_ms: sDB.tiempo_pausado_total_ms ?? 0,
      });

      const sesion: SesionActiva = {
        dbId: sDB.id,
        codigoSala: sDB.codigo_sala,
        reloj,
        equipos: new Map(),
        asignaciones: [],
      };

      const equiposDB = await db.obtenerEquiposSesion(sDB.id);
      for (const eDB of equiposDB) {
        const miembros = await db.obtenerMiembros(eDB.id);
        const equipo: EquipoActivo = {
          dbId: eDB.id,
          nombre: eDB.nombre,
          estadoMotor: eDB.estado_motor,
          miembros,
          evidencias: [],
          consultasRealizadas: new Set(),
          resultado: null,
          preguntasConsejo: null,
          codigosPersonales: new Map(), socketsActivos: new Map(), propuestas: [], solicitudesAccion: [],
        };
        sesion.equipos.set(eDB.nombre, equipo);
      }

      const asignacionesDB = await db.obtenerAsignaciones(sDB.id);
      sesion.asignaciones = asignacionesDB.map(a => ({
        nombreEquipo: a.nombre_equipo,
        email: a.email,
      }));

      sesiones.set(sDB.codigo_sala, sesion);

      if (reloj.iniciado && reloj.faseActual !== 'finalizado') {
        iniciarReloj(reloj, sDB.codigo_sala, io, config, (anterior, nueva) => {
          manejarCambioFase(sesion, anterior, nueva, io, config);
        });
      }

      recuperadas++;
      console.log(`  Sesion recuperada: ${sDB.codigo_sala} (fase: ${reloj.faseActual}, segundo: ${reloj.segundoActual})`);
    }
  } catch (err) {
    console.warn('  Error recuperando sesiones:', (err as Error).message);
  }
  return recuperadas;
}
