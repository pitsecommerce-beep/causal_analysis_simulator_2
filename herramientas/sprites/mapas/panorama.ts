// Panorama background: 3072×1024 px boardroom
// Built procedurally from bands: ceiling, wall, windows, floor
import { PALETA, type RGBA } from '../paleta.js';
import { crearPNG, llenarRect, ponerPixel } from '../png-util.js';
import type { PNG } from 'pngjs';

export const ANCHO_PANORAMA = 3072;
export const ALTO_PANORAMA = 1024;

function mezclar(a: RGBA, b: RGBA, t: number): RGBA {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    255,
  ];
}

export function generarPanorama(): PNG {
  const png = crearPNG(ANCHO_PANORAMA, ALTO_PANORAMA);

  const techo = PALETA['L2'];
  const pared = PALETA['N0'];
  const paredOscura = PALETA['L3'];
  const zocalo = PALETA['G8'];
  const piso = PALETA['D2'];
  const pisoClaro = PALETA['D1'];
  const ventanaCielo = PALETA['N2'];
  const ventanaLuz = PALETA['N1'];
  const ventanaMarco = PALETA['M3'];
  const mesaSup = PALETA['G8'];
  const mesaFrente = PALETA['G6'];
  const mesaBorde = PALETA['G4'];

  // Bands (y ranges)
  const TECHO_FIN = 80;
  const PARED_INICIO = TECHO_FIN;
  const VENTANA_INICIO = 120;
  const VENTANA_FIN = 400;
  const ZOCALO_INICIO = 420;
  const ZOCALO_FIN = 440;
  const MESA_INICIO = 540;
  const MESA_FIN = 620;
  const PISO_INICIO = MESA_FIN;

  // Fill ceiling
  llenarRect(png, 0, 0, ANCHO_PANORAMA, TECHO_FIN, techo);

  // Fill wall
  for (let y = PARED_INICIO; y < ZOCALO_FIN; y++) {
    const t = (y - PARED_INICIO) / (ZOCALO_FIN - PARED_INICIO);
    const color = mezclar(pared, paredOscura, t);
    for (let x = 0; x < ANCHO_PANORAMA; x++) {
      ponerPixel(png, x, y, color);
    }
  }

  // Zócalo (baseboard)
  llenarRect(png, 0, ZOCALO_INICIO, ANCHO_PANORAMA, ZOCALO_FIN - ZOCALO_INICIO, zocalo);

  // Floor gradient
  for (let y = ZOCALO_FIN; y < ALTO_PANORAMA; y++) {
    const t = (y - ZOCALO_FIN) / (ALTO_PANORAMA - ZOCALO_FIN);
    const color = mezclar(pisoClaro, piso, t * 0.5);
    for (let x = 0; x < ANCHO_PANORAMA; x++) {
      ponerPixel(png, x, y, color);
    }
  }

  // Mesa (table) — horizontal band across the middle
  llenarRect(png, 0, MESA_INICIO, ANCHO_PANORAMA, 20, mesaSup);
  llenarRect(png, 0, MESA_INICIO + 20, ANCHO_PANORAMA, MESA_FIN - MESA_INICIO - 30, mesaFrente);
  llenarRect(png, 0, MESA_FIN - 10, ANCHO_PANORAMA, 10, mesaBorde);

  // Windows — three tall windows evenly spaced
  const ventanas = [
    { x: 400, ancho: 320 },
    { x: 1376, ancho: 320 },
    { x: 2352, ancho: 320 },
  ];

  for (const v of ventanas) {
    // Frame
    llenarRect(png, v.x - 8, VENTANA_INICIO - 8, v.ancho + 16, VENTANA_FIN - VENTANA_INICIO + 16, ventanaMarco);

    // Window pane — gradient sky
    for (let y = VENTANA_INICIO; y < VENTANA_FIN; y++) {
      const t = (y - VENTANA_INICIO) / (VENTANA_FIN - VENTANA_INICIO);
      const color = mezclar(ventanaLuz, ventanaCielo, t);
      for (let x = v.x; x < v.x + v.ancho; x++) {
        ponerPixel(png, x, y, color);
      }
    }

    // Window dividers (cross bars)
    const midX = v.x + Math.floor(v.ancho / 2);
    const midY = VENTANA_INICIO + Math.floor((VENTANA_FIN - VENTANA_INICIO) / 2);
    llenarRect(png, midX - 2, VENTANA_INICIO, 4, VENTANA_FIN - VENTANA_INICIO, ventanaMarco);
    llenarRect(png, v.x, midY - 2, v.ancho, 4, ventanaMarco);
  }

  // Afternoon light glow near windows
  for (const v of ventanas) {
    for (let dy = 0; dy < 60; dy++) {
      const alpha = Math.max(0, 30 - dy);
      const y = VENTANA_FIN + dy;
      if (y >= ALTO_PANORAMA) break;
      for (let dx = -20; dx < v.ancho + 20; dx++) {
        const x = v.x + dx;
        if (x < 0 || x >= ANCHO_PANORAMA) continue;
        const idx = (png.width * y + x) << 2;
        // Lighten existing pixel
        png.data[idx] = Math.min(255, png.data[idx] + alpha);
        png.data[idx + 1] = Math.min(255, png.data[idx + 1] + alpha);
        png.data[idx + 2] = Math.min(255, png.data[idx + 2] + Math.floor(alpha * 0.7));
      }
    }
  }

  // Wall panels between windows — subtle vertical lines
  for (let x = 0; x < ANCHO_PANORAMA; x += 128) {
    for (let y = PARED_INICIO; y < ZOCALO_INICIO; y++) {
      const idx = (png.width * y + x) << 2;
      png.data[idx] = Math.max(0, png.data[idx] - 8);
      png.data[idx + 1] = Math.max(0, png.data[idx + 1] - 8);
      png.data[idx + 2] = Math.max(0, png.data[idx + 2] - 8);
    }
  }

  return png;
}
