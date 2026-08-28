import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { RGBA } from './paleta.js';

export function crearPNG(ancho: number, alto: number): PNG {
  return new PNG({ width: ancho, height: alto, filterType: -1 });
}

export function ponerPixel(png: PNG, x: number, y: number, color: RGBA): void {
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx] = color[0];
  png.data[idx + 1] = color[1];
  png.data[idx + 2] = color[2];
  png.data[idx + 3] = color[3];
}

export function llenarRect(
  png: PNG, x: number, y: number, w: number, h: number, color: RGBA,
): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      ponerPixel(png, x + dx, y + dy, color);
    }
  }
}

export function dibujarMapa(
  png: PNG,
  mapa: string[][],
  resuelve: (clave: string) => RGBA,
  offX = 0,
  offY = 0,
): void {
  for (let y = 0; y < mapa.length; y++) {
    for (let x = 0; x < mapa[y].length; x++) {
      const c = resuelve(mapa[y][x]);
      if (c[3] > 0) ponerPixel(png, offX + x, offY + y, c);
    }
  }
}

export function guardarPNG(png: PNG, ruta: string): void {
  mkdirSync(dirname(ruta), { recursive: true });
  const buffer = PNG.sync.write(png);
  writeFileSync(ruta, buffer);
}

export function pegarPNG(dest: PNG, src: PNG, offX: number, offY: number): void {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const si = (src.width * y + x) << 2;
      const a = src.data[si + 3];
      if (a === 0) continue;
      ponerPixel(dest, offX + x, offY + y, [
        src.data[si], src.data[si + 1], src.data[si + 2], a,
      ]);
    }
  }
}
