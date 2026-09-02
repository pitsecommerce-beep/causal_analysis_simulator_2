import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SONIDOS_PATH = path.join(__dirname, '..', 'src', 'cliente', 'juego', 'useSonidos.ts');

describe('useSonidos — definición de efectos', () => {
  const src = fs.readFileSync(SONIDOS_PATH, 'utf8');

  const IDS_REQUERIDOS = [
    'laptop-abrir',
    'laptop-cerrar',
    'publicar',
    'peticion',
    'autorizar',
    'fase-cambio',
  ];

  it('define los 6 sonidos requeridos en el tipo SonidoId', () => {
    for (const id of IDS_REQUERIDOS) {
      expect(src, `SonidoId debe incluir '${id}'`).toContain(`'${id}'`);
    }
  });

  it('cada sonido tiene una entrada en el objeto SONIDOS', () => {
    for (const id of IDS_REQUERIDOS) {
      const re = new RegExp(`['"]${id}['"]\\s*:`);
      expect(re.test(src), `SONIDOS debe tener '${id}'`).toBe(true);
    }
  });

  it('usa generarTono para sintetizar sonidos (no archivos externos)', () => {
    expect(src).toContain('generarTono');
    expect(src).toContain('OscillatorType');
    expect(src).not.toContain('.mp3');
    expect(src).not.toContain('.wav');
    expect(src).not.toContain('.ogg');
  });

  it('exporta reproducir y silenciar', () => {
    expect(src).toContain('reproducir');
    expect(src).toContain('silenciar');
  });

  it('volumen base es bajo (< 0.2)', () => {
    const volMatch = src.match(/VOLUMEN\s*=\s*([\d.]+)/);
    expect(volMatch).not.toBeNull();
    const vol = parseFloat(volMatch![1]);
    expect(vol).toBeLessThan(0.2);
    expect(vol).toBeGreaterThan(0);
  });
});
