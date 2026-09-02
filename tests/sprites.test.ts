import { describe, it, expect } from 'vitest';
import {
  generarTodosCompaneros,
  VARIANTES_COMPANERO,
  ANCHO_SPRITE,
  ALTO_SPRITE,
} from '../herramientas/sprites/mapas/persona.js';
import { generarObjetos } from '../herramientas/sprites/mapas/objetos.js';
import { colorPorClave, PALETA } from '../herramientas/sprites/paleta.js';

describe('Sprite de compañeros', () => {
  const sprites = generarTodosCompaneros();

  it('genera exactamente 64 sprites (8 variantes × 8 estados)', () => {
    expect(sprites.length).toBe(64);
  });

  it('tiene 8 variantes definidas', () => {
    expect(VARIANTES_COMPANERO.length).toBe(8);
  });

  it('4 variantes femeninas y 4 masculinas', () => {
    const fem = VARIANTES_COMPANERO.filter(v => v.genero === 'F');
    const masc = VARIANTES_COMPANERO.filter(v => v.genero === 'M');
    expect(fem.length).toBe(4);
    expect(masc.length).toBe(4);
  });

  it('cada variante tiene sufijo de 3 letras', () => {
    const sufijos = VARIANTES_COMPANERO.map(v => v.sufijo);
    for (const s of sufijos) {
      expect(s).toMatch(/^[fmc]{3}$/);
    }
    expect(new Set(sufijos).size).toBe(8);
  });

  it('cada sprite tiene 8 estados distintos', () => {
    const estados = [
      'idle', 'tecleando', 'consultando', 'decidiendo',
      'esperando', 'desconectado', 'publicando', 'proponiendo',
    ];
    for (const v of VARIANTES_COMPANERO) {
      for (const e of estados) {
        const found = sprites.find(s => s.nombre === `companero-${v.sufijo}-${e}`);
        expect(found, `companero-${v.sufijo}-${e}`).toBeDefined();
      }
    }
  });

  it('los nombres no se repiten', () => {
    const nombres = sprites.map(s => s.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it('cada mapa tiene dimensiones correctas (24 col × 40 filas)', () => {
    for (const s of sprites) {
      expect(s.mapa.length, `${s.nombre} filas`).toBe(40);
      for (const row of s.mapa) {
        expect(row.length, `${s.nombre} columnas`).toBe(24);
      }
    }
  });

  it('escala es 4 para todos', () => {
    for (const s of sprites) {
      expect(s.escala).toBe(4);
    }
  });

  it('ANCHO/ALTO_SPRITE coinciden con 24×4 y 40×4', () => {
    expect(ANCHO_SPRITE).toBe(96);
    expect(ALTO_SPRITE).toBe(160);
  });

  it('el estado desconectado es genérico (sin rasgos personales)', () => {
    const desc = sprites.filter(s => s.estado === 'desconectado');
    expect(desc.length).toBe(8);
    const mapas = desc.map(s => JSON.stringify(s.mapa));
    const unicos = new Set(mapas);
    expect(unicos.size).toBe(1);
  });
});

describe('Sprite de objetos', () => {
  const objetos = generarObjetos();

  it('genera al menos 7 objetos', () => {
    expect(objetos.length).toBeGreaterThanOrEqual(7);
  });

  it('incluye laptop-cerrada, laptop-media, laptop-abierta y pizarron', () => {
    const nombres = objetos.map(o => o.nombre);
    expect(nombres).toContain('laptop-cerrada');
    expect(nombres).toContain('laptop-media');
    expect(nombres).toContain('laptop-abierta');
    expect(nombres).toContain('pizarron');
  });

  it('laptop-cerrada tiene logo pear (claves PR/PL)', () => {
    const lc = objetos.find(o => o.nombre === 'laptop-cerrada')!;
    const flat = lc.mapa.flat();
    expect(flat).toContain('PR');
    expect(flat).toContain('PL');
  });

  it('las dimensiones de los mapas corresponden a anchoMini×altoMini', () => {
    for (const o of objetos) {
      expect(o.mapa.length, `${o.nombre} filas`).toBe(o.altoMini);
      for (const row of o.mapa) {
        expect(row.length, `${o.nombre} columnas`).toBe(o.anchoMini);
      }
    }
  });
});

describe('Paleta', () => {
  it('contiene tonos de piel S1-S6', () => {
    for (const k of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']) {
      expect(PALETA[k], k).toBeDefined();
      expect(PALETA[k][3]).toBe(255);
    }
  });

  it('contiene tonos de pelo H1, H2', () => {
    expect(PALETA['H1']).toBeDefined();
    expect(PALETA['H2']).toBeDefined();
  });

  it('contiene claves de pear logo PR, PL', () => {
    expect(PALETA['PR']).toBeDefined();
    expect(PALETA['PL']).toBeDefined();
  });

  it('colorPorClave devuelve transparente para clave desconocida', () => {
    const c = colorPorClave('XX');
    expect(c[3]).toBe(0);
  });

  it('colorPorClave devuelve el color correcto para WH', () => {
    const c = colorPorClave('WH');
    expect(c).toEqual([0xFF, 0xFF, 0xFF, 255]);
  });
});
