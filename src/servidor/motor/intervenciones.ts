import type { ConfigSimulador, IntervencionAplicada, EstadoMotor } from './tipos.js';

export function aplicarIntervencion(
  estado: EstadoMotor,
  intervencionId: number,
  config: ConfigSimulador,
  sucursalesNombradas?: number[],
): { exito: boolean; mensaje: string } {
  const cfgInterv = config.intervenciones.find(i => i.id === intervencionId);
  if (!cfgInterv) {
    return { exito: false, mensaje: 'Intervención no encontrada' };
  }

  if (cfgInterv.costo > estado.presupuesto) {
    return { exito: false, mensaje: `Presupuesto insuficiente (necesitas ${cfgInterv.costo}, tienes ${estado.presupuesto})` };
  }

  if (cfgInterv.requiere_sucursales && (!sucursalesNombradas || sucursalesNombradas.length === 0)) {
    return { exito: false, mensaje: 'Esta intervención requiere nombrar sucursales' };
  }

  const yaAplicada = estado.intervenciones.some(i => i.id === intervencionId);
  if (yaAplicada) {
    return { exito: false, mensaje: 'Esta intervención ya fue aplicada' };
  }

  estado.presupuesto -= cfgInterv.costo;

  estado.intervenciones.push({
    id: intervencionId,
    nombre: cfgInterv.nombre,
    trimestre: estado.trimestre,
    sucursalesNombradas,
    activa: true,
  });

  let mensaje = `Intervención "${cfgInterv.nombre}" aplicada en el trimestre ${estado.trimestre}.`;
  if (cfgInterv.retraso_trimestres > 0) {
    mensaje += ` Surte efecto en ${cfgInterv.retraso_trimestres} trimestre(s).`;
  } else {
    mensaje += ' Efecto inmediato.';
  }

  return { exito: true, mensaje };
}

export function listarIntervencionesDisponibles(
  estado: EstadoMotor,
  config: ConfigSimulador,
): Array<{ id: number; nombre: string; costo: number; disponible: boolean; razon?: string }> {
  return config.intervenciones.map(cfgInterv => {
    const yaAplicada = estado.intervenciones.some(i => i.id === cfgInterv.id);
    const sinPresupuesto = cfgInterv.costo > estado.presupuesto;

    let disponible = true;
    let razon: string | undefined;

    if (yaAplicada) {
      disponible = false;
      razon = 'Ya aplicada';
    } else if (sinPresupuesto) {
      disponible = false;
      razon = `Costo ${cfgInterv.costo} > presupuesto ${estado.presupuesto}`;
    }

    return {
      id: cfgInterv.id,
      nombre: cfgInterv.nombre,
      costo: cfgInterv.costo,
      disponible,
      razon,
    };
  });
}
