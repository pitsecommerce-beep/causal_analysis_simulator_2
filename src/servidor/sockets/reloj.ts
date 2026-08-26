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
}

export function crearReloj(): RelojSesion {
  return {
    iniciado: false,
    pausado: false,
    segundoActual: 0,
    faseActual: 'espera',
    extensiones: {},
    intervalo: null,
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
  reloj.faseActual = obtenerFaseActual(0, config.fases, reloj.extensiones);

  reloj.intervalo = setInterval(() => {
    if (reloj.pausado) return;

    reloj.segundoActual += 1;
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

export function pausarReloj(reloj: RelojSesion): boolean {
  reloj.pausado = !reloj.pausado;
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
