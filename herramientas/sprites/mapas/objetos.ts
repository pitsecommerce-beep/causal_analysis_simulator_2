// Room object sprites: laptop, chair, cup, folder, phone
// Smaller sprites at various sizes, scaled 4x

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

  // Laptop closed (16×8 mini → 64×32)
  {
    const S: Record<string, string> = {
      '.': '__', F: 'D2', E: 'D3', L: 'M2', H: 'N5',
    };
    const mapa = [
      fila('..FFFFFFFFFFFF..', S),
      fila('.FFFFFFFFFFFFFF.', S),
      fila('FFFFFFFFFFFFFFFF', S),
      fila('EEEEEEEEEEEEEEEE', S),
      fila('EEEEEEEEEEEEEEEE', S),
      fila('..LLLLLLLLLLLL..', S),
      fila('................', S),
      fila('................', S),
    ];
    sprites.push({ nombre: 'laptop-cerrada', mapa, escala: ESCALA, anchoMini: 16, altoMini: 8 });
  }

  // Laptop open (16×12 mini → 64×48)
  {
    const S: Record<string, string> = {
      '.': '__', F: 'D2', E: 'D3', S: 'N3', B: 'N6',
      L: 'M2', K: 'M1', W: 'WH',
    };
    const mapa = [
      fila('.FFFFFFFFFFFFFF.', S),
      fila('FBBBBBBBBBBBBBBF', S),
      fila('FBBBBBBBBBBBBBBF', S),
      fila('FBBSSSSSSSSSSBBF', S),
      fila('FBBSSSSSSSSSSBBF', S),
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

  return sprites;
}
