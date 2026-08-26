import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { ConfigSimulador, EstadoMotor, KPIs } from './tipos.js';
import { crearKPIsBase, calcularKPIs } from './kpis.js';
import { sortearEventos, actualizarEventos } from './eventos.js';

export function cargarConfig(ruta: string = 'config/simulador.json'): ConfigSimulador {
  const raw = readFileSync(resolve(ruta), 'utf-8');
  return JSON.parse(raw) as ConfigSimulador;
}

export function crearEstadoInicial(config: ConfigSimulador, semilla: number = 20260825): EstadoMotor {
  const kpisBase = crearKPIsBase(config);
  return {
    trimestre: 0,
    kpis: { ...kpisBase },
    kpisBase,
    presupuesto: config.equipo.presupuesto,
    creditosIndagacion: config.equipo.creditos_indagacion,
    intervenciones: [],
    eventosActivos: [],
    historialKPIs: [{ ...kpisBase }],
    penalizaciones: [],
  };
}

export function avanzarTrimestre(estado: EstadoMotor, config: ConfigSimulador, semilla: number = 20260825): EstadoMotor {
  const nuevoTrimestre = estado.trimestre + 1;

  const nuevosEventos = sortearEventos(semilla, nuevoTrimestre, config);
  const eventosVigentes = actualizarEventos(estado.eventosActivos);
  const todosEventos = [...eventosVigentes, ...nuevosEventos];

  const { kpis, penalizaciones } = calcularKPIs(
    estado.kpisBase,
    estado.intervenciones,
    todosEventos,
    nuevoTrimestre,
    config,
  );

  return {
    ...estado,
    trimestre: nuevoTrimestre,
    kpis,
    eventosActivos: todosEventos,
    historialKPIs: [...estado.historialKPIs, { ...kpis }],
    penalizaciones,
  };
}
