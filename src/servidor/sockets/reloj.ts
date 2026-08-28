import type { Server as SocketServer } from 'socket.io';
import type { ConfigSimulador } from '../motor/tipos.js';

const ORDEN_FASES = [
  'sala_juntas', 'voz_cliente', 'transicion',
  'trimestre_1', 'trimestre_2', 'trimestre_3', 'consejo',
] as const;

export type NombreFase = typeof ORDEN_FASES[number] | 'espera' | 'finalizado';

export interface FaseCalculada {
  nombre: string;
  inicioMin: number;
  finMin: number;
}

export interface RelojSesion {
  iniciado: boolean;
  pausado: boolean;
  segundoActual: number;
  faseActual: NombreFase;
  extensiones: Record<string, number>;
  intervalo: ReturnType<typeof setInterval> | null;
  iniciadoEn: Date | null;
  pausadoEn: Date | null;
  tiempoPausadoTotalMs: number;
}

export function crearReloj(): RelojSesion {
  return {
    iniciado: false,
    pausado: false,
    segundoActual: 0,
    faseActual: 'espera',
    extensiones: {},
    intervalo: null,
    iniciadoEn: null,
    pausadoEn: null,
    tiempoPausadoTotalMs: 0,
  };
}

export function calcularFases(
  fasesConfig: Record<string, { inicio: number; duracion: number }>,
  extensiones: Record<string, number>,
): FaseCalculada[] {
  let acumulado = 0;
  return ORDEN_FASES.map(nombre => {
    const config = fasesConfig[nombre];
    if (!config) return { nombre, inicioMin: acumulado, finMin: acumulado };
    const duracion = config.duracion + (extensiones[nombre] ?? 0);
    const fase = { nombre, inicioMin: acumulado, finMin: acumulado + duracion };
    acumulado += duracion;
    return fase;
  });
}

export function obtenerFaseActual(
  minutoActual: number,
  fasesConfig: Record<string, { inicio: number; duracion: number }>,
  extensiones: Record<string, number>,
): NombreFase {
  const fases = calcularFases(fasesConfig, extensiones);
  for (const fase of fases) {
    if (minutoActual < fase.finMin) return fase.nombre as NombreFase;
  }
  return 'finalizado';
}

export function iniciarReloj(
  reloj: RelojSesion,
  codigoSala: string,
  io: SocketServer,
  config: ConfigSimulador,
  onCambioFase: (faseAnterior: NombreFase, faseNueva: NombreFase) => void,
): void {
  if (reloj.intervalo) clearInterval(reloj.intervalo);

  reloj.iniciado = true;
  reloj.pausado = false;
  if (!reloj.iniciadoEn) {
    reloj.iniciadoEn = new Date();
    reloj.tiempoPausadoTotalMs = 0;
  }
  reloj.faseActual = obtenerFaseActual(reloj.segundoActual / 60, config.fases, reloj.extensiones);

  reloj.intervalo = setInterval(() => {
    if (reloj.pausado) return;

    reloj.segundoActual = recalcularSegundos(reloj);
    const minutoActual = reloj.segundoActual / 60;
    const nuevaFase = obtenerFaseActual(minutoActual, config.fases, reloj.extensiones);

    if (nuevaFase !== reloj.faseActual) {
      const anterior = reloj.faseActual;
      reloj.faseActual = nuevaFase;
      onCambioFase(anterior, nuevaFase);
      io.to(`sala:${codigoSala}`).emit('reloj:fase_cambio', {
        faseAnterior: anterior,
        faseNueva: nuevaFase,
        minuto: minutoActual,
      });
    }

    io.to(`sala:${codigoSala}`).emit('reloj:tick', {
      segundoActual: reloj.segundoActual,
      minuto: minutoActual,
      fase: reloj.faseActual,
      fases: calcularFases(config.fases, reloj.extensiones),
    });
  }, 1000);
}

export function recalcularSegundos(reloj: RelojSesion): number {
  if (!reloj.iniciadoEn) return reloj.segundoActual;
  const ahora = reloj.pausado && reloj.pausadoEn ? reloj.pausadoEn.getTime() : Date.now();
  const transcurrido = ahora - reloj.iniciadoEn.getTime() - reloj.tiempoPausadoTotalMs;
  return Math.max(0, Math.floor(transcurrido / 1000));
}

export function reconstruirRelojDesdeDB(datos: {
  reloj_iniciado: boolean;
  reloj_pausado: boolean;
  segundo_actual: number;
  fase_actual: string;
  extensiones: Record<string, number>;
  reloj_iniciado_en: string | null;
  reloj_pausado_en: string | null;
  tiempo_pausado_total_ms: number;
}): RelojSesion {
  const reloj = crearReloj();
  reloj.iniciado = datos.reloj_iniciado;
  reloj.pausado = datos.reloj_pausado;
  reloj.extensiones = datos.extensiones ?? {};
  reloj.faseActual = (datos.fase_actual as NombreFase) ?? 'espera';

  if (datos.reloj_iniciado_en) {
    reloj.iniciadoEn = new Date(datos.reloj_iniciado_en);
    reloj.tiempoPausadoTotalMs = datos.tiempo_pausado_total_ms ?? 0;
    reloj.pausadoEn = datos.reloj_pausado_en ? new Date(datos.reloj_pausado_en) : null;
    reloj.segundoActual = recalcularSegundos(reloj);
  } else {
    reloj.segundoActual = datos.segundo_actual ?? 0;
  }

  return reloj;
}

export function pausarReloj(reloj: RelojSesion): boolean {
  if (!reloj.pausado) {
    reloj.pausado = true;
    reloj.pausadoEn = new Date();
  } else {
    if (reloj.pausadoEn) {
      reloj.tiempoPausadoTotalMs += Date.now() - reloj.pausadoEn.getTime();
    }
    reloj.pausado = false;
    reloj.pausadoEn = null;
  }
  return reloj.pausado;
}

export function extenderFase(
  reloj: RelojSesion,
  fase: string,
  minutosExtra: number,
): void {
  reloj.extensiones[fase] = (reloj.extensiones[fase] ?? 0) + minutosExtra;
}

export function detenerReloj(reloj: RelojSesion): void {
  if (reloj.intervalo) {
    clearInterval(reloj.intervalo);
    reloj.intervalo = null;
  }
}

export function obtenerEstadoReloj(reloj: RelojSesion, config: ConfigSimulador) {
  return {
    iniciado: reloj.iniciado,
    pausado: reloj.pausado,
    segundoActual: reloj.segundoActual,
    minuto: reloj.segundoActual / 60,
    fase: reloj.faseActual,
    fases: calcularFases(config.fases, reloj.extensiones),
    extensiones: reloj.extensiones,
  };
}
