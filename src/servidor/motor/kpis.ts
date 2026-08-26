import type { KPIs, IntervencionAplicada, EventoActivo, ConfigSimulador, Penalizacion } from './tipos.js';

export function crearKPIsBase(config: ConfigSimulador): KPIs {
  return {
    ventanaCapturaMediana: 11,
    ventanaCapturaMedia: 18.9,
    quejas: 100,
    quejasVisibles: 100,
    conversion: 100,
    atorados: 142,
    atoradosPct: 16,
    trabajoPerdidoDias: 6758,
    erroresCaptura: 659,
    incompletos: 472,
    ilegibles: 187,
    erroresTotales: 1318,
    backofficeMediana: 15,
    costoOperativo: 100,
  };
}

export function calcularKPIs(
  base: KPIs,
  intervenciones: IntervencionAplicada[],
  eventosActivos: EventoActivo[],
  trimestre: number,
  config: ConfigSimulador,
): { kpis: KPIs; penalizaciones: Penalizacion[] } {
  const kpis = { ...base };
  const penalizaciones: Penalizacion[] = [];

  let multCaptura = 1;
  let multIncompletos = 1;
  let multIlegibles = 1;
  let multBackoffice = 1;
  let multQuejas = 1;
  let multConversion = 1;
  let reduccionCicloAparente = 0;
  let multTrabajoPerdido = 1;
  let atoradosPctNuevo: number | null = null;
  let costoExtra = 0;
  let bonoActivo = false;

  for (const interv of intervenciones) {
    if (!interv.activa) continue;
    const cfgInterv = config.intervenciones.find(i => i.id === interv.id);
    if (!cfgInterv) continue;

    const trimestreEfecto = interv.trimestre + cfgInterv.retraso_trimestres;
    if (trimestre < trimestreEfecto) continue;

    const efectos = cfgInterv.efectos;

    if (efectos.incompletos_mult !== undefined) {
      multIncompletos *= efectos.incompletos_mult;
    }
    if (efectos.ilegibles_mult !== undefined) {
      multIlegibles *= efectos.ilegibles_mult;
    }
    if (efectos.error_captura_mult_sucursales !== undefined) {
      const sucsFoco = interv.sucursalesNombradas ?? [];
      const sucursalesRealesConErrorAlto = [110, 676, 728];
      const aciertos = sucsFoco.filter(s => sucursalesRealesConErrorAlto.includes(s));
      const pctEfecto = aciertos.length / sucursalesRealesConErrorAlto.length;
      const mult = 1 - (1 - efectos.error_captura_mult_sucursales) * pctEfecto;
      multCaptura *= mult;

      let reversionEvento = false;
      for (const ev of eventosActivos) {
        if (ev.id === 'renuncia_gerente') {
          reversionEvento = true;
        }
      }
      if (reversionEvento) {
        const reversion = 0.40;
        multCaptura = multCaptura / mult * (mult + (1 - mult) * reversion);
      }
    }
    if (efectos.error_captura_mult_todas !== undefined) {
      multCaptura *= efectos.error_captura_mult_todas;
    }
    if (efectos.trabajo_perdido_mult !== undefined) {
      multTrabajoPerdido *= efectos.trabajo_perdido_mult;
    }
    if (efectos.atorados_pct !== undefined) {
      atoradosPctNuevo = efectos.atorados_pct;
    }
    if (efectos.quejas_mult !== undefined) {
      multQuejas *= efectos.quejas_mult;
    }
    if (efectos.backoffice_mult !== undefined) {
      multBackoffice *= efectos.backoffice_mult;
    }
    if (efectos.ciclo_dias_reduccion_aparente !== undefined) {
      reduccionCicloAparente += efectos.ciclo_dias_reduccion_aparente;
    }
    if (efectos.conversion_mult !== undefined) {
      multConversion *= efectos.conversion_mult;
    }
    if (efectos.captura_mult !== undefined) {
      multCaptura *= efectos.captura_mult;
    }
    if (efectos.costo_mult !== undefined) {
      kpis.costoOperativo *= efectos.costo_mult;
    }

    if (cfgInterv.efecto_secundario === 'costo_fijo_permanente') {
      costoExtra += 10;
    }

    if (cfgInterv.efecto_perverso && trimestre >= cfgInterv.efecto_perverso.trimestre_activacion) {
      bonoActivo = true;
      multCaptura *= cfgInterv.efecto_perverso.errores_mult;
      multQuejas *= cfgInterv.efecto_perverso.quejas_mult;
      penalizaciones.push({
        tipo: 'incentivo_perverso',
        descripcion: `El bono por velocidad disparó errores (+${Math.round((cfgInterv.efecto_perverso.errores_mult - 1) * 100)}%) y quejas (+${Math.round((cfgInterv.efecto_perverso.quejas_mult - 1) * 100)}%)`,
        puntos: config.puntuacion.penalizaciones.incentivo_perverso,
      });
    }
  }

  for (const ev of eventosActivos) {
    const cfgEv = config.eventos.find(e => e.id === ev.id);
    if (!cfgEv) continue;

    if (cfgEv.efecto.backoffice_dias_extra) {
      kpis.backofficeMediana += cfgEv.efecto.backoffice_dias_extra;
    }
    if (cfgEv.efecto.volumen_mult) {
      multCaptura *= 1 + (cfgEv.efecto.volumen_mult - 1) * 0.3;
      multIncompletos *= 1 + (cfgEv.efecto.volumen_mult - 1) * 0.2;
    }
    if (cfgEv.efecto.quejas_visibles_mult) {
      kpis.quejasVisibles = base.quejasVisibles * cfgEv.efecto.quejas_visibles_mult;
    }
    if (cfgEv.efecto.ilegibles_extra_pct) {
      multIlegibles *= 1 + cfgEv.efecto.ilegibles_extra_pct;
    }
    if (cfgEv.efecto.capacidad_crop_reduccion) {
      kpis.backofficeMediana += cfgEv.efecto.capacidad_crop_reduccion;
    }
    if (cfgEv.efecto.abandono_extra_pct && kpis.ventanaCapturaMediana > (cfgEv.efecto.umbral_ciclo_dias ?? 20)) {
      multConversion *= 1 - cfgEv.efecto.abandono_extra_pct;
    }
  }

  kpis.erroresCaptura = Math.round(base.erroresCaptura * multCaptura);
  kpis.incompletos = Math.round(base.incompletos * multIncompletos);
  kpis.ilegibles = Math.round(base.ilegibles * multIlegibles);
  kpis.erroresTotales = kpis.erroresCaptura + kpis.incompletos + kpis.ilegibles;

  const reduccionErrores = 1 - kpis.erroresTotales / base.erroresTotales;
  const impactoCapturaMediana = base.ventanaCapturaMediana * (1 - reduccionErrores * 0.65);
  kpis.ventanaCapturaMediana = Math.max(3, Math.round(impactoCapturaMediana * 10) / 10 - reduccionCicloAparente);
  kpis.ventanaCapturaMedia = Math.max(4, base.ventanaCapturaMedia * (kpis.ventanaCapturaMediana / base.ventanaCapturaMediana));

  kpis.backofficeMediana = Math.round(kpis.backofficeMediana * multBackoffice * 10) / 10;
  kpis.quejas = Math.round(base.quejas * multQuejas);
  kpis.quejasVisibles = Math.round(kpis.quejasVisibles * multQuejas);
  kpis.conversion = Math.round(base.conversion * multConversion * 10) / 10;
  kpis.trabajoPerdidoDias = Math.round(base.trabajoPerdidoDias * multTrabajoPerdido);
  kpis.costoOperativo = Math.round((base.costoOperativo + costoExtra) * 10) / 10;

  if (atoradosPctNuevo !== null) {
    kpis.atoradosPct = atoradosPctNuevo * 100;
    kpis.atorados = Math.round(base.atorados * (atoradosPctNuevo / 0.16));
  }

  if (multConversion < 1) {
    penalizaciones.push({
      tipo: 'metrica_costa_negocio',
      descripcion: `Conversión cayó a ${kpis.conversion}% del base`,
      puntos: config.puntuacion.penalizaciones.metrica_costa_negocio,
    });
  }

  const kpisClave = [
    { nombre: 'ventana captura', actual: kpis.ventanaCapturaMediana, base: base.ventanaCapturaMediana, mejorSiMenor: true },
    { nombre: 'quejas', actual: kpis.quejas, base: base.quejas, mejorSiMenor: true },
    { nombre: 'errores', actual: kpis.erroresTotales, base: base.erroresTotales, mejorSiMenor: true },
  ];
  for (const kpi of kpisClave) {
    const empeora = kpi.mejorSiMenor ? kpi.actual > kpi.base * 1.05 : kpi.actual < kpi.base * 0.95;
    if (empeora) {
      const pctCambio = Math.round(((kpi.actual - kpi.base) / kpi.base) * 100);
      penalizaciones.push({
        tipo: 'intervencion_empeora_kpi',
        descripcion: `${kpi.nombre} empeoró ${pctCambio > 0 ? '+' : ''}${pctCambio}%`,
        puntos: Math.max(
          config.puntuacion.penalizaciones.intervencion_empeora_kpi_max,
          config.puntuacion.penalizaciones.intervencion_empeora_kpi_min * (Math.abs(pctCambio) / 10),
        ),
      });
    }
  }

  return { kpis, penalizaciones };
}
