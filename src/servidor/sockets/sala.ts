import type { Server as SocketServer, Socket } from 'socket.io';
import type { ConfigSimulador, EstadoMotor } from '../motor/tipos.js';
import type { DatosCargados, Solicitud } from '../datos/tipos.js';
import { crearEstadoInicial, avanzarTrimestre } from '../motor/dag.js';
import { aplicarIntervencion, listarIntervencionesDisponibles } from '../motor/intervenciones.js';
import { calcularPuntuacion } from '../puntuacion/reglas.js';
import {
  crearReloj, iniciarReloj, pausarReloj, extenderFase, detenerReloj,
  obtenerEstadoReloj,
  type RelojSesion, type NombreFase,
} from './reloj.js';
import * as db from '../db/consultas.js';
import { precalentarEscena, estadoEscena, obtenerEscena, limpiarCache } from '../voz/escena.js';

interface EquipoActivo {
  dbId: number | null;
  nombre: string;
  estadoMotor: EstadoMotor;
}

interface SesionActiva {
  dbId: number | null;
  codigoSala: string;
  reloj: RelojSesion;
  equipos: Map<string, EquipoActivo>;
}

const sesiones = new Map<string, SesionActiva>();
let dbDisponible = false;

function generarCodigoSala(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += chars[Math.floor(Math.random() * chars.length)];
  }
  return codigo;
}

function validarClaveProfesor(clave: string): boolean {
  const claveReal = process.env.CLAVE_PROFESOR;
  if (!claveReal) return false;
  return clave === claveReal;
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
    ventanaCaptura: s.ventanaCaptura,
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
    erroresCaptura: s.erroresCaptura,
    incompletos: s.incompletos,
    ilegibles: s.ilegibles,
    mes: s.mes,
  }));
}

export function configurarSockets(
  io: SocketServer,
  config: ConfigSimulador,
  datos: DatosCargados,
  conDB: boolean,
): void {
  dbDisponible = conDB;

  io.on('connection', (socket: Socket) => {
    socket.on('profesor:crear_sesion', async (payload, ack) => {
      if (!validarClaveProfesor(payload?.clave)) {
        return ack?.({ error: 'Clave de profesor incorrecta' });
      }
      const codigo = generarCodigoSala();
      const sesion: SesionActiva = {
        dbId: null,
        codigoSala: codigo,
        reloj: crearReloj(),
        equipos: new Map(),
      };
      if (dbDisponible) {
        try {
          const row = await db.crearSesion(codigo);
          sesion.dbId = row.id;
        } catch (_) { /* sin persistencia */ }
      }
      sesiones.set(codigo, sesion);
      socket.join(`sala:${codigo}`);
      socket.join(`profesor:${codigo}`);

      precalentarEscena(codigo, datos).then(() => {
        io.to(`profesor:${codigo}`).emit('escena:estado', {
          estado: estadoEscena(codigo),
        });
      }).catch(() => {});

      ack?.({ codigoSala: codigo });
    });

    socket.on('profesor:iniciar_reloj', (payload, ack) => {
      if (!validarClaveProfesor(payload?.clave)) {
        return ack?.({ error: 'Clave de profesor incorrecta' });
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
      if (!validarClaveProfesor(payload?.clave)) {
        return ack?.({ error: 'Clave de profesor incorrecta' });
      }
      const sesion = sesiones.get(payload?.codigoSala);
      if (!sesion) return ack?.({ error: 'Sesión no encontrada' });

      const pausado = pausarReloj(sesion.reloj);
      io.to(`sala:${sesion.codigoSala}`).emit('reloj:pausado', { pausado });
      persistirReloj(sesion);
      ack?.({ ok: true, pausado });
    });

    socket.on('profesor:extender_fase', (payload, ack) => {
      if (!validarClaveProfesor(payload?.clave)) {
        return ack?.({ error: 'Clave de profesor incorrecta' });
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
      if (!validarClaveProfesor(payload?.clave)) {
        return ack?.({ error: 'Clave de profesor incorrecta' });
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

    socket.on('equipo:unirse', async (payload, ack) => {
      const codigo = payload?.codigoSala?.toUpperCase();
      const nombre = payload?.nombre?.trim();
      if (!codigo || !nombre) return ack?.({ error: 'Código de sala y nombre requeridos' });

      const sesion = sesiones.get(codigo);
      if (!sesion) return ack?.({ error: 'Sesión no encontrada' });

      let equipo = sesion.equipos.get(nombre);
      if (!equipo) {
        const estadoMotor = crearEstadoInicial(config);
        equipo = { dbId: null, nombre, estadoMotor };
        if (dbDisponible && sesion.dbId) {
          try {
            const row = await db.crearEquipo(sesion.dbId, nombre, estadoMotor);
            equipo.dbId = row.id;
          } catch (_) { /* sin persistencia */ }
        }
        sesion.equipos.set(nombre, equipo);
        io.to(`profesor:${codigo}`).emit('sesion:equipo_unido', { nombre });
      }

      socket.join(`sala:${codigo}`);
      socket.join(`equipo:${codigo}:${nombre}`);
      (socket as any).__equipo = { codigoSala: codigo, nombre };

      ack?.({
        estadoMotor: equipo.estadoMotor,
        reloj: obtenerEstadoReloj(sesion.reloj, config),
        intervencionesCatalogo: listarIntervencionesDisponibles(equipo.estadoMotor, config),
        solicitudes: prepararDatosCliente(datos.solicitudes),
      });
    });

    socket.on('equipo:intervenir', async (payload, ack) => {
      const info = (socket as any).__equipo;
      if (!info) return ack?.({ error: 'No estás en un equipo' });

      const sesion = sesiones.get(info.codigoSala);
      const equipo = sesion?.equipos.get(info.nombre);
      if (!sesion || !equipo) return ack?.({ error: 'Equipo no encontrado' });

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

    socket.on('equipo:consulta', async (payload, ack) => {
      const info = (socket as any).__equipo;
      if (!info) return ack?.({ error: 'No estás en un equipo' });

      const sesion = sesiones.get(info.codigoSala);
      const equipo = sesion?.equipos.get(info.nombre);
      if (!sesion || !equipo) return ack?.({ error: 'Equipo no encontrado' });

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

    socket.on('equipo:diagnostico', async (payload, ack) => {
      const info = (socket as any).__equipo;
      if (!info) return ack?.({ error: 'No estás en un equipo' });

      const sesion = sesiones.get(info.codigoSala);
      const equipo = sesion?.equipos.get(info.nombre);
      if (!sesion || !equipo) return ack?.({ error: 'Equipo no encontrado' });

      const diagnostico = payload?.diagnostico;
      const rigor = payload?.rigor;
      if (!diagnostico || !rigor) return ack?.({ error: 'Diagnóstico y rigor son requeridos' });

      const minuto = sesion.reloj.segundoActual / 60;
      diagnostico.minutoDeclaracion = Math.round(minuto);

      let estado = equipo.estadoMotor;
      while (estado.trimestre < 3) {
        estado = avanzarTrimestre(estado, config);
      }
      equipo.estadoMotor = estado;

      const resultado = calcularPuntuacion(estado, diagnostico, rigor, config);

      if (dbDisponible && equipo.dbId) {
        try {
          await db.guardarDiagnostico(equipo.dbId, diagnostico, rigor, resultado, minuto);
          await db.actualizarEstadoMotor(equipo.dbId, estado);
        } catch (_) { /* sin persistencia */ }
      }

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
            texto: c.texto,
            fuenteTexto: c.fuenteTexto,
            tieneAudio: c.audio.length > 0,
          })),
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

    socket.on('disconnect', () => {
      // Socket.IO handles room cleanup automatically
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
    });
  } catch (_) { /* silently continue */ }
}

async function persistirEquipo(sesion: SesionActiva, equipo: EquipoActivo): Promise<void> {
  if (!dbDisponible || !equipo.dbId) return;
  try {
    await db.actualizarEstadoMotor(equipo.dbId, equipo.estadoMotor);
  } catch (_) { /* silently continue */ }
}
