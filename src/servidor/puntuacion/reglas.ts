import type { DiagnosticoEquipo, RigorMetodo, EstadoMotor, ConfigSimulador, ResultadoPuntuacion, Final, IntervencionAplicada } from '../motor/tipos.js';

export function evaluarDiagnostico(
  diagnostico: DiagnosticoEquipo,
  config: ConfigSimulador,
): { puntos: number; desglose: Record<string, number> } {
  const p = config.puntuacion.diagnostico;
  const desglose: Record<string, number> = {};
  let puntos = 0;

  if (diagnostico.ventanaCapturaEsCuello) {
    desglose['ventana_captura_cuello'] = p.ventana_captura_cuello;
    puntos += p.ventana_captura_cuello;
  }
  if (diagnostico.reprocesoEsMecanismo) {
    desglose['reproceso_mecanismo'] = p.reproceso_mecanismo;
    puntos += p.reproceso_mecanismo;
  }
  if (diagnostico.fugaPlastico) {
    desglose['fuga_plastico'] = p.fuga_plastico;
    puntos += p.fuga_plastico;
  }
  if (diagnostico.trabajoPerdidoBuro) {
    desglose['trabajo_perdido_buro'] = p.trabajo_perdido_buro;
    puntos += p.trabajo_perdido_buro;
  }
  for (const _causa of diagnostico.causasEspurias) {
    desglose['causa_espuria'] = (desglose['causa_espuria'] ?? 0) + p.penalizacion_causa_espuria;
    puntos += p.penalizacion_causa_espuria;
  }
  if (diagnostico.concentracionSinMasa) {
    desglose['concentracion_sin_masa'] = p.penalizacion_concentracion_sin_masa;
    puntos += p.penalizacion_concentracion_sin_masa;
  }

  return { puntos: Math.max(0, puntos), desglose };
}

export function evaluarRigor(
  rigor: RigorMetodo,
  config: ConfigSimulador,
): { puntos: number; desglose: Record<string, number> } {
  const p = config.puntuacion.rigor;
  const desglose: Record<string, number> = {};
  let puntos = 0;

  if (rigor.paretoEstratificacion) {
    desglose['pareto_estratificacion'] = p.pareto_estratificacion;
    puntos += p.pareto_estratificacion;
  }
  if (rigor.dispersionInterpretacion) {
    desglose['dispersion_interpretacion'] = p.dispersion_interpretacion;
    puntos += p.dispersion_interpretacion;
  }
  if (rigor.embudoEtapas) {
    desglose['embudo_etapas'] = p.embudo_etapas;
    puntos += p.embudo_etapas;
  }
  if (rigor.hipotesisEscrita) {
    desglose['hipotesis_escrita'] = p.hipotesis_escrita;
    puntos += p.hipotesis_escrita;
  }
  if (rigor.cruzoComentariosBase) {
    desglose['cruzo_comentarios_base'] = p.cruzo_comentarios_base;
    puntos += p.cruzo_comentarios_base;
  }

  return { puntos, desglose };
}

export function evaluarImpacto(
  estado: EstadoMotor,
  config: ConfigSimulador,
): { puntos: number; desglose: Record<string, number> } {
  const p = config.puntuacion.impacto;
  const desglose: Record<string, number> = {};
  let puntos = 0;

  const base = estado.kpisBase;
  const final = estado.kpis;

  const reduccionCiclo = (base.ventanaCapturaMediana - final.ventanaCapturaMediana) / base.ventanaCapturaMediana;
  const ptsCiclo = Math.max(0, Math.round(p.reduccion_ciclo_mediano * Math.min(1, reduccionCiclo / 0.25)));
  desglose['reduccion_ciclo_mediano'] = ptsCiclo;
  puntos += ptsCiclo;

  const reduccionQuejas = (base.quejas - final.quejas) / base.quejas;
  const ptsQuejas = Math.max(0, Math.round(p.reduccion_quejas * Math.min(1, Math.max(0, reduccionQuejas) / 0.35)));
  desglose['reduccion_quejas'] = ptsQuejas;
  puntos += ptsQuejas;

  if (final.conversion >= 95) {
    desglose['conversion_preservada'] = p.conversion_preservada;
    puntos += p.conversion_preservada;
  } else if (final.conversion >= 80) {
    const fraccion = (final.conversion - 80) / 15;
    const ptsConv = Math.round(p.conversion_preservada * fraccion);
    desglose['conversion_preservada'] = ptsConv;
    puntos += ptsConv;
  }

  const presupuestoRestante = estado.presupuesto / config.equipo.presupuesto;
  const ptsPres = Math.round(p.presupuesto_no_gastado * presupuestoRestante);
  desglose['presupuesto_no_gastado'] = ptsPres;
  puntos += ptsPres;

  return { puntos: Math.max(0, puntos), desglose };
}

export function evaluarVelocidad(
  minutoDiagnostico: number,
  config: ConfigSimulador,
): number {
  const v = config.puntuacion.velocidad;
  if (minutoDiagnostico <= v.minuto_inicio) return v.max_puntos;
  if (minutoDiagnostico >= v.minuto_fin) return v.puntos_minimo;

  const fraccion = (v.minuto_fin - minutoDiagnostico) / (v.minuto_fin - v.minuto_inicio);
  return Math.round(v.puntos_minimo + (v.max_puntos - v.puntos_minimo) * fraccion);
}

export function evaluarEficiencia(
  creditosRestantes: number,
  config: ConfigSimulador,
): number {
  const max = config.puntuacion.eficiencia.max_puntos;
  const total = config.equipo.creditos_indagacion;
  return Math.round(max * (creditosRestantes / total));
}

function determinarFinal(
  total: number,
  intervenciones: IntervencionAplicada[],
  kpis: { conversion: number },
  penalizaciones: { tipo: string }[],
  config: ConfigSimulador,
): Final {
  const ids = new Set(intervenciones.map(i => i.id));

  const tienePerverso = penalizaciones.some(p => p.tipo === 'incentivo_perverso');
  if (tienePerverso && ids.has(9)) return 'E';

  const tieneMetricaTraicionera = ids.has(8) && kpis.conversion < 80;
  if (tieneMetricaTraicionera) return 'D';

  const intervenoSobreTrampas = intervenciones.some(i => {
    const cfg = config.intervenciones.find(c => c.id === i.id);
    return cfg && Object.keys(cfg.efectos).length === 0 && cfg.costo > 0;
  });
  if (intervenoSobreTrampas && total < 500) return 'H';

  if (intervenciones.length === 0) return 'G';

  if (total >= 900) return 'A';
  if (total >= 700) return 'B';
  if (total >= 450 && ids.has(6)) return 'C';

  if (ids.has(3) || ids.has(10)) return 'F';

  if (total >= 450) return 'B';
  if (total >= 300) return 'C';
  if (total >= 150) return 'F';
  return 'G';
}

export function calcularPuntuacion(
  estado: EstadoMotor,
  diagnostico: DiagnosticoEquipo,
  rigor: RigorMetodo,
  config: ConfigSimulador,
): ResultadoPuntuacion {
  const diagResult = evaluarDiagnostico(diagnostico, config);
  const rigorResult = evaluarRigor(rigor, config);
  const impactoResult = evaluarImpacto(estado, config);
  const velocidadPts = evaluarVelocidad(diagnostico.minutoDeclaracion, config);
  const eficienciaPts = evaluarEficiencia(estado.creditosIndagacion, config);

  let penalizacionesPts = 0;
  for (const p of estado.penalizaciones) {
    penalizacionesPts += p.puntos;
  }

  const sinCap = diagResult.puntos + rigorResult.puntos + impactoResult.puntos + velocidadPts + eficienciaPts + penalizacionesPts;
  const total = Math.max(0, Math.min(1000, sinCap));

  const final = determinarFinal(total, estado.intervenciones, estado.kpis, estado.penalizaciones, config);

  return {
    diagnostico: diagResult.puntos,
    rigor: rigorResult.puntos,
    impacto: impactoResult.puntos,
    velocidad: velocidadPts,
    eficiencia: eficienciaPts,
    penalizaciones: penalizacionesPts,
    total,
    final,
    desglose: {
      ...diagResult.desglose,
      ...rigorResult.desglose,
      ...impactoResult.desglose,
      velocidad: velocidadPts,
      eficiencia: eficienciaPts,
      penalizaciones_total: penalizacionesPts,
    },
  };
}
