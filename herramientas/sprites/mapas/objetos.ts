const ESCALA = 4;

function fila(s: string, S: Record<string, string>): string[] {
  return s.split('').map(c => S[c] ?? '__');
}

interface SpriteObjeto {
  nombre: string;
  mapa: string[][];
  escala: number;
  anchoMini: number;
  altoMini: number;
}

export function generarObjetos(): SpriteObjeto[] {
  const sprites: SpriteObjeto[] = [];

  // Laptop closed — with pear logo on lid (16×8 mini → 64×32)
  {
    const S: Record<string, string> = {
      '.': '__', F: 'D2', E: 'D3', L: 'M2', H: 'N5',
      P: 'PR', V: 'PL',
    };
    const mapa = [
      fila('..FFFFFFFFFFFF..', S),
      fila('.FFFFFFFFFFFFFF.', S),
      fila('FFFFFFVPFFFFFFFF', S),
      fila('FFFFFPPPPFFFFFFF', S),
      fila('FFFFFFPPFFFFFFFF', S),
      fila('EEEEEEEEEEEEEEEE', S),
      fila('..LLLLLLLLLLLL..', S),
      fila('................', S),
    ];
    sprites.push({ nombre: 'laptop-cerrada', mapa, escala: ESCALA, anchoMini: 16, altoMini: 8 });
  }

  // Laptop half-open — transitional frame (16×10 mini → 64×40)
  {
    const S: Record<string, string> = {
      '.': '__', F: 'D2', E: 'D3', L: 'M2', K: 'M1',
      B: 'N6', S: 'N3', P: 'PR', V: 'PL',
    };
    const mapa = [
      fila('..FFFFFFFFFFFF..', S),
      fila('.FFFFFFFVPFFFFF.', S),
      fila('FFFFFFFPPPPFFFFF', S),
      fila('FFFFFFFFPPFFFFFF', S),
      fila('FFFFFFFFFFFFFFFF', S),
      fila('EEEEEEEEEEEEEEEE', S),
      fila('EEEEEEEEEEEEEEEE', S),
      fila('EKKKKKKKKKKKKKKE', S),
      fila('EKKKKKKKKKKKKKKE', S),
      fila('EEEEEEEEEEEEEEEE', S),
    ];
    sprites.push({ nombre: 'laptop-media', mapa, escala: ESCALA, anchoMini: 16, altoMini: 10 });
  }

  // Laptop open — screen glow + pear logo visible on back of lid (16×12 mini → 64×48)
  {
    const S: Record<string, string> = {
      '.': '__', F: 'D2', E: 'D3', S: 'N3', B: 'N6',
      L: 'M2', K: 'M1', W: 'WH', P: 'PR', V: 'PL',
    };
    const mapa = [
      fila('.FFFFFFFFFFFFFF.', S),
      fila('FBBBBBBBBBBBBBBF', S),
      fila('FBBBBVPBBBBBBBBF', S),
      fila('FBBSSPPPPSSSSBBF', S),
      fila('FBBSSSSPPSSSSBBF', S),
      fila('FBBSSSSSSSSSSBBF', S),
      fila('FBBBBBBBBBBBBBBF', S),
      fila('FFFFFFFFFFFFFFFF', S),
      fila('EEEEEEEEEEEEEEEE', S),
      fila('EKKKKKKKKKKKKKKE', S),
      fila('EKKKKKKKKKKKKKKE', S),
      fila('EEEEEEEEEEEEEEEE', S),
    ];
    sprites.push({ nombre: 'laptop-abierta', mapa, escala: ESCALA, anchoMini: 16, altoMini: 12 });
  }

  // Empty chair (12×16 mini → 48×64)
  {
    const S: Record<string, string> = {
      '.': '__', C: 'D1', B: 'D2', L: 'M3',
    };
    const mapa = [
      fila('..CCCCCCCC..', S),
      fila('.CCCCCCCCCC.', S),
      fila('.CCCCCCCCCC.', S),
      fila('.CCBBBBBBCC.', S),
      fila('.CCBBBBBBCC.', S),
      fila('.CCBBBBBBCC.', S),
      fila('.CCBBBBBBCC.', S),
      fila('.CCBBBBBBCC.', S),
      fila('..CCCCCCCC..', S),
      fila('..CCCCCCCC..', S),
      fila('..CC....CC..', S),
      fila('..CC....CC..', S),
      fila('.CCC....CCC.', S),
      fila('.CCC....CCC.', S),
      fila('............', S),
      fila('............', S),
    ];
    sprites.push({ nombre: 'silla-vacia', mapa, escala: ESCALA, anchoMini: 12, altoMini: 16 });
  }

  // Coffee cup (6×8 mini → 24×32)
  {
    const S: Record<string, string> = {
      '.': '__', W: 'WH', L: 'L2', G: 'M2', D: 'D1',
    };
    const mapa = [
      fila('......', S),
      fila('.WWWW.', S),
      fila('WWWWWW', S),
      fila('WWLLWW', S),
      fila('WWLLWW', S),
      fila('WWWWWW', S),
      fila('.GGGG.', S),
      fila('.DDDD.', S),
    ];
    sprites.push({ nombre: 'taza', mapa, escala: ESCALA, anchoMini: 6, altoMini: 8 });
  }

  // Folder (10×6 mini → 40×24)
  {
    const S: Record<string, string> = {
      '.': '__', F: 'G6', D: 'G8', L: 'G4', W: 'WH',
    };
    const mapa = [
      fila('..FFFF....', S),
      fila('FFFFFFFFFF', S),
      fila('FWWWWWWWWF', S),
      fila('FWWWWWWWWF', S),
      fila('FWWWWWWWWF', S),
      fila('FFFFFFFFFF', S),
    ];
    sprites.push({ nombre: 'carpeta', mapa, escala: ESCALA, anchoMini: 10, altoMini: 6 });
  }

  // Phone (4×8 mini → 16×32)
  {
    const S: Record<string, string> = {
      '.': '__', F: 'D3', S: 'N6', B: 'BK',
    };
    const mapa = [
      fila('FFFF', S),
      fila('FBBF', S),
      fila('FSSF', S),
      fila('FSSF', S),
      fila('FSSF', S),
      fila('FSSF', S),
      fila('FBBF', S),
      fila('FFFF', S),
    ];
    sprites.push({ nombre: 'telefono', mapa, escala: ESCALA, anchoMini: 4, altoMini: 8 });
  }

  // Whiteboard (24×16 mini → 96×64)
  {
    const S: Record<string, string> = {
      '.': '__', F: 'M1', W: 'WH', L: 'L1', B: 'N5', G: 'N6',
    };
    const mapa = [
      fila('FFFFFFFFFFFFFFFFFFFFFFFF', S),
      fila('FWWWWWWWWWWWWWWWWWWWWWWF', S),
      fila('FWWWWWWWWWWWWWWWWWWWWWWF', S),
      fila('FWWBBBBBWWWWWWWWWWWWWWWF', S),
      fila('FWWWWWWWWWWWWWWWWWWWWWWF', S),
      fila('FWWWBBBBBBBWWWWWWWWWWWWF', S),
      fila('FWWWWWWWWWWWWWWWWWWWWWWF', S),
      fila('FWWWWWWWWWWWWWWWWWWWWWWF', S),
      fila('FWWBBBWWWWWWWBBBWWWWWWWF', S),
      fila('FWWWWWWWWWWWWWWWWWWWWWWF', S),
      fila('FWWWWWWWWWWWWWWWWWWWWWWF', S),
      fila('FWWWWBBBBBBBBBWWWWWWWWWF', S),
      fila('FWWWWWWWWWWWWWWWWWWWWWWF', S),
      fila('FFFFFFFFFFFFFFFFFFFFFFFF', S),
      fila('..........FF............', S),
      fila('..........FF............', S),
    ];
    sprites.push({ nombre: 'pizarron', mapa, escala: ESCALA, anchoMini: 24, altoMini: 16 });
  }

  return sprites;
}
