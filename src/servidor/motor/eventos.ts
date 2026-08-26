import type { ConfigSimulador, EventoActivo } from './tipos.js';

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sortearEventos(
  semilla: number,
  trimestre: number,
  config: ConfigSimulador,
): EventoActivo[] {
  const rng = mulberry32(semilla + trimestre * 1000);
  const catalogo = [...config.eventos];

  const seleccionados: EventoActivo[] = [];
  const numEventos = 1;

  for (let i = 0; i < numEventos && catalogo.length > 0; i++) {
    const idx = Math.floor(rng() * catalogo.length);
    const evento = catalogo.splice(idx, 1)[0];
    seleccionados.push({
      id: evento.id,
      nombre: evento.nombre,
      trimestre,
      trimestresFaltantes: evento.duracion_trimestres,
    });
  }

  return seleccionados;
}

export function actualizarEventos(eventosActivos: EventoActivo[]): EventoActivo[] {
  return eventosActivos
    .map(e => ({ ...e, trimestresFaltantes: e.trimestresFaltantes - 1 }))
    .filter(e => e.trimestresFaltantes > 0);
}
