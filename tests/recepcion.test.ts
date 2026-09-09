import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const CONFIG = JSON.parse(
  readFileSync(join(__dirname, '../config/simulador.json'), 'utf-8'),
);

describe('Recepcion - slides del carrusel', () => {
  const src = readFileSync(
    join(__dirname, '../src/cliente/recepcion/ComoJugar.tsx'),
    'utf-8',
  );

  it('tiene exactamente 7 slides', () => {
    const matches = src.match(/titulo:\s*'/g);
    expect(matches?.length).toBe(7);
  });

  it('cada titulo tiene como maximo 4 palabras', () => {
    const titulos = [...src.matchAll(/titulo:\s*'([^']+)'/g)].map(m => m[1]);
    for (const t of titulos) {
      const palabras = t.trim().split(/\s+/).length;
      expect(palabras, `"${t}" tiene ${palabras} palabras`).toBeLessThanOrEqual(4);
    }
  });

  it('ningun texto de slide pasa de 18 palabras', () => {
    const lineas = [...src.matchAll(/lineas:\s*\[([\s\S]*?)\]/g)]
      .flatMap(m => [...m[1].matchAll(/'([^']+)'/g)].map(l => l[1]));

    for (const t of lineas) {
      const palabras = t.trim().split(/\s+/).length;
      expect(palabras, `"${t}" tiene ${palabras} palabras`).toBeLessThanOrEqual(18);
    }
  });

  it('menciona datos que existen en config', () => {
    expect(src).toContain('12 créditos');
    expect(CONFIG.equipo.creditos_indagacion).toBe(12);

    expect(src).toContain('100 unidades');
    expect(CONFIG.equipo.presupuesto).toBe(100);

    expect(src).toContain('50 minutos');
    const durTotal = Object.values(CONFIG.fases).reduce(
      (s: number, f: any) => s + f.duracion, 0,
    );
    expect(durTotal).toBe(50);

    expect(src).toContain('3 trimestres');
  });
});

describe('Recepcion - flujo de pantallas', () => {
  const appSrc = readFileSync(
    join(__dirname, '../src/cliente/App.tsx'),
    'utf-8',
  );

  it('tipo Pantalla incluye recepcion y roles', () => {
    expect(appSrc).toContain("'recepcion'");
    expect(appSrc).toContain("'roles'");
  });

  it('onUnido dirige a recepcion en fases tempranas', () => {
    expect(appSrc).toContain("setPantalla('recepcion')");
  });

  it('reconexion salta a juego', () => {
    const reconectarBlock = appSrc.slice(
      appSrc.indexOf('equipo:reconectar'),
      appSrc.indexOf('equipo:reconectar') + 2000,
    );
    expect(reconectarBlock).toContain("setPantalla('juego')");
    expect(reconectarBlock).not.toContain("setPantalla('recepcion')");
  });
});

describe('Recepcion - persistencia tutorial', () => {
  const recSrc = readFileSync(
    join(__dirname, '../src/cliente/recepcion/Recepcion.tsx'),
    'utf-8',
  );

  it('usa etfbank_tutorial_visto en localStorage', () => {
    expect(recSrc).toContain('etfbank_tutorial_visto');
  });
});

describe('JuegoApp - boton de ayuda', () => {
  const juegoSrc = readFileSync(
    join(__dirname, '../src/cliente/juego/JuegoApp.tsx'),
    'utf-8',
  );

  it('importa ComoJugar', () => {
    expect(juegoSrc).toContain('ComoJugar');
  });

  it('tiene boton con titulo Como jugar', () => {
    expect(juegoSrc).toContain('Cómo jugar');
  });
});
