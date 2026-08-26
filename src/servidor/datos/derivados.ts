import type { Solicitud } from './tipos.js';

export function media(valores: number[]): number {
  if (valores.length === 0) return 0;
  return valores.reduce((s, v) => s + v, 0) / valores.length;
}

export function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const sorted = [...valores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function desviacion(valores: number[]): number {
  if (valores.length === 0) return 0;
  const m = media(valores);
  const varianza = valores.reduce((s, v) => s + (v - m) ** 2, 0) / valores.length;
  return Math.sqrt(varianza);
}

export function correlacionPearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0 || n !== y.length) return 0;

  const mx = media(x);
  const my = media(y);

  let numerador = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    numerador += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : numerador / den;
}

export interface EstadisticasCarga {
  filas: number;
  sucursales: number;
  estados: number;
  mesesDistintos: number;
  erroresTotales: number;
  erroresCaptura: number;
  documentosIncompletos: number;
  documentosIlegibles: number;
  casosConError: number;
  intentosMedia: number;
  intentosDesviacion: number;
  ventanaCapturaMedia: number;
  ventanaCapturaMediana: number;
  correlacionIntentosCapturaR: number;
  buroCorrido: number;
  buroAceptado: number;
  scoreAceptado: number;
  plasticoEnviado: number;
  atorados: number;
  diasPerdidosRechazadosBuro: number;
  top3SucursalesPorErrores: number[];
  pctErroresTop3: number;
}

export function calcularEstadisticas(solicitudes: Solicitud[]): EstadisticasCarga {
  const sucursales = new Set(solicitudes.map(s => s.sucursal));
  const estados = new Set(solicitudes.map(s => s.estado));
  const meses = new Set(solicitudes.map(s => s.mes));

  const erroresCaptura = solicitudes.reduce((s, r) => s + r.erroresCaptura, 0);
  const documentosIncompletos = solicitudes.reduce((s, r) => s + r.incompletos, 0);
  const documentosIlegibles = solicitudes.reduce((s, r) => s + r.ilegibles, 0);
  const erroresTotales = erroresCaptura + documentosIncompletos + documentosIlegibles;
  const casosConError = solicitudes.filter(r => r.erroresCaptura + r.incompletos + r.ilegibles >= 1).length;

  const intentos = solicitudes.map(s => s.intentos);
  const ventanas = solicitudes.map(s => s.ventanaCaptura);

  const buroCorrido = solicitudes.filter(s => s.resultadoBuro !== null && s.resultadoBuro !== '').length;
  const buroAceptado = solicitudes.filter(s => s.resultadoBuro?.toLowerCase() === 'accepted').length;
  const scoreAceptado = solicitudes.filter(s => s.resultadoScoreETF?.toLowerCase() === 'accepted').length;
  const plasticoEnviado = solicitudes.filter(s => s.fechaPlastico !== null).length;
  const atorados = scoreAceptado - plasticoEnviado;

  const rechazadosBuro = solicitudes.filter(s => s.resultadoBuro?.toLowerCase() === 'rejected');
  const diasPerdidosRechazadosBuro = rechazadosBuro.reduce((s, r) => s + r.ventanaCaptura, 0);

  const erroresPorSucursal = new Map<number, number>();
  for (const s of solicitudes) {
    const errStd = s.erroresCaptura + s.incompletos + s.ilegibles;
    erroresPorSucursal.set(s.sucursal, (erroresPorSucursal.get(s.sucursal) ?? 0) + errStd);
  }
  const rankingSucursales = [...erroresPorSucursal.entries()]
    .sort((a, b) => b[1] - a[1]);
  const top3 = rankingSucursales.slice(0, 3).map(([suc]) => suc);
  const erroresTop3 = rankingSucursales.slice(0, 3).reduce((s, [, e]) => s + e, 0);
  const pctTop3 = erroresTotales > 0
    ? Math.round((erroresTop3 / erroresTotales) * 1000) / 10
    : 0;

  return {
    filas: solicitudes.length,
    sucursales: sucursales.size,
    estados: estados.size,
    mesesDistintos: meses.size,
    erroresTotales,
    erroresCaptura,
    documentosIncompletos,
    documentosIlegibles,
    casosConError,
    intentosMedia: Math.round(media(intentos) * 100) / 100,
    intentosDesviacion: Math.round(desviacion(intentos) * 100) / 100,
    ventanaCapturaMedia: Math.round(media(ventanas) * 10) / 10,
    ventanaCapturaMediana: mediana(ventanas),
    correlacionIntentosCapturaR: Math.round(correlacionPearson(intentos, ventanas) * 1000) / 1000,
    buroCorrido,
    buroAceptado,
    scoreAceptado,
    plasticoEnviado,
    atorados,
    diasPerdidosRechazadosBuro,
    top3SucursalesPorErrores: top3,
    pctErroresTop3: pctTop3,
  };
}
