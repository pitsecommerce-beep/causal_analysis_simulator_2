import type { RGBA } from '../paleta.js';
import { PALETA } from '../paleta.js';

type Genero = 'F' | 'M';
type Complexion = 'clara' | 'media';
type Traje = 'formal' | 'casual';

export type EstadoSprite =
  | 'idle' | 'tecleando' | 'consultando'
  | 'decidiendo' | 'esperando' | 'desconectado'
  | 'publicando' | 'proponiendo';

export interface SpritePersona {
  nombre: string;
  genero: Genero;
  complexion: Complexion;
  traje: Traje;
  estado: EstadoSprite;
  mapa: string[][];
  escala: number;
}

const ESCALA = 4;
export const ANCHO_SPRITE = 24 * ESCALA;
export const ALTO_SPRITE = 40 * ESCALA;

function fila(s: string, subs: Record<string, string>): string[] {
  return s.split('').map(c => subs[c] ?? '__');
}

function generarMapaBase(genero: Genero, comp: Complexion, traje: Traje): string[][] {
  const pb = comp === 'clara' ? 'S1' : 'S2';
  const ps = comp === 'clara' ? 'S3' : 'S4';
  const hr = comp === 'clara' ? 'H1' : 'BK';
  const rc = traje === 'formal' ? 'N7' : 'D2';
  const rd = traje === 'formal' ? 'N5' : 'M3';

  const S: Record<string, string> = {
    '.': '__', H: hr, P: pb, S: ps,
    R: rc, D: rd, T: 'G8', L: 'G4',
    W: 'WH', N: 'N1',
  };

  if (genero === 'F') {
    return [
      fila('........HHHHHH..........', S),  // 0  hair top
      fila('......HHHHHHHHHH........', S),  // 1
      fila('.....HHHHHHHHHHH........', S),  // 2
      fila('.....HHHHHHHHHHHH.......', S),  // 3  hair sides longer
      fila('....HHPPPPPPPPHHH.......', S),  // 4  face with hair framing
      fila('....HHPPPPPPPPHHH.......', S),  // 5
      fila('....HHPSSPPPSSPHH.......', S),  // 6  eyes
      fila('....HHPPPPPPPPHHH.......', S),  // 7
      fila('....HH.PPPPPP.HH........', S),  // 8  neck + hair falls
      fila('....HH.PPPPPP.HH........', S),  // 9
      fila('...HHRRRRRRRRRRRRHH.....', S),  // 10 shoulders + hair
      fila('...HHRRRRRRRRRRRRHH.....', S),  // 11
      fila('....RRRRDDRRRRDRRR......', S),  // 12 lapels
      fila('....RRRRRRRRRRRRRR......', S),  // 13
      fila('....RRRRRRRRRRRRRR......', S),  // 14
      fila('.....RRRRRRRRRRRRR......', S),  // 15 narrower waist
      fila('.....RRRRRRRRRRRRR......', S),  // 16
      fila('....RRRRRRRRRRRRRR......', S),  // 17
      fila('..PPRRRRRRRRRRRRRRPP....', S),  // 18 arms
      fila('..PPRRRRRRRRRRRRRRPP....', S),  // 19
      fila('..PPPPRRRRRRRRPPPPPP....', S),  // 20 hands
      fila('..PPPPRRRRRRRRPPPPPP....', S),  // 21
      fila('TTTTTTTTTTTTTTTTTTTTTTTT', S),  // 22 table
      fila('TTTTTTTTTTTTTTTTTTTTTTTT', S),  // 23
      fila('LLLLLLLLLLLLLLLLLLLLLLLL', S),  // 24
      fila('TTTTTTTTTTTTTTTTTTTTTTTT', S),  // 25
      ...Array.from({ length: 14 }, () => fila('........................', S)),
    ];
  }

  // Male: broader shoulders, short hair
  return [
    fila('........HHHHHH..........', S),  // 0  hair top
    fila('......HHHHHHHHHH........', S),  // 1
    fila('.....HHHHHHHHHHH........', S),  // 2
    fila('.....HHHHHHHHHHHH.......', S),  // 3
    fila('......PPPPPPPPPP........', S),  // 4  face
    fila('......PPPPPPPPPP........', S),  // 5
    fila('......PSSPPPSSPP........', S),  // 6  eyes
    fila('......PPPPPPPPPP........', S),  // 7
    fila('........PPPPPP..........', S),  // 8  neck
    fila('........PPPPPP..........', S),  // 9
    fila('....RRRRRRRRRRRRRR......', S),  // 10 broad shoulders
    fila('...RRRRRRRRRRRRRRRR.....', S),  // 11
    fila('...RRRDDRRRRRRDDRR......', S),  // 12 lapels
    fila('...RRRRRRRRRRRRRRRR.....', S),  // 13
    fila('...RRRRRRRRRRRRRRRR.....', S),  // 14
    fila('...RRRRRRRRRRRRRRRR.....', S),  // 15
    fila('...RRRRRRRRRRRRRRRR.....', S),  // 16
    fila('....RRRRRRRRRRRRRR......', S),  // 17
    fila('..PPRRRRRRRRRRRRRRPP....', S),  // 18 arms
    fila('..PPRRRRRRRRRRRRRRPP....', S),  // 19
    fila('..PPPPRRRRRRRRPPPPPP....', S),  // 20 hands
    fila('..PPPPRRRRRRRRPPPPPP....', S),  // 21
    fila('TTTTTTTTTTTTTTTTTTTTTTTT', S),  // 22 table
    fila('TTTTTTTTTTTTTTTTTTTTTTTT', S),  // 23
    fila('LLLLLLLLLLLLLLLLLLLLLLLL', S),  // 24
    fila('TTTTTTTTTTTTTTTTTTTTTTTT', S),  // 25
    ...Array.from({ length: 14 }, () => fila('........................', S)),
  ];
}

function clonar(m: string[][]): string[][] {
  return m.map(r => [...r]);
}

function tecleando(base: string[][]): string[][] {
  const m = clonar(base);
  for (let y = 0; y <= 9; y++) {
    m[y] = ['__', ...m[y].slice(0, 23)];
  }
  if (m[20]) { m[20][5] = m[20][2]; m[20][6] = m[20][2]; m[20][9] = m[20][2]; m[20][10] = m[20][2]; }
  return m;
}

function consultando(base: string[][]): string[][] {
  const m = clonar(base);
  m[22][5] = 'N3'; m[22][6] = 'N3'; m[22][7] = 'N3'; m[22][8] = 'N3';
  m[22][9] = 'N3'; m[22][10] = 'N3';
  m[23][6] = 'N2'; m[23][7] = 'N2'; m[23][8] = 'N2'; m[23][9] = 'N2';
  return m;
}

function decidiendo(base: string[][]): string[][] {
  const m = clonar(base);
  const pb = m[18][1];
  m[8][5] = pb; m[7][5] = pb;
  m[18][1] = '__'; m[19][1] = '__';
  return m;
}

function esperando(base: string[][]): string[][] {
  const m = clonar(base);
  m[0][10] = 'WR'; m[0][11] = 'WR';
  m[0][12] = 'WR'; m[0][13] = 'WR';
  return m;
}

function publicando(base: string[][]): string[][] {
  const m = clonar(base);
  const pb = m[18][1];
  // Raise right arm higher (pointing at whiteboard)
  m[6][17] = pb; m[6][18] = pb;
  m[7][17] = pb; m[7][18] = pb;
  m[8][17] = pb;
  m[9][17] = pb;
  m[10][17] = pb;
  // OK indicator above the pointing hand
  m[4][17] = 'OK'; m[4][18] = 'OK';
  m[5][17] = 'OK'; m[5][18] = 'OK';
  return m;
}

function proponiendo(base: string[][]): string[][] {
  const m = clonar(base);
  const pb = m[18][1];
  // Raise one hand
  m[7][2] = pb; m[7][3] = pb;
  m[8][2] = pb; m[8][3] = pb;
  m[9][2] = pb;
  // Gold indicator above head (proposal icon)
  m[0][6] = 'G6'; m[0][7] = 'G6';
  m[0][8] = 'G6'; m[0][9] = 'G6';
  return m;
}

function desconectado(): string[][] {
  const rows: string[][] = [];
  for (let y = 0; y < 40; y++) {
    const row: string[] = new Array(24).fill('__');
    if (y >= 22 && y <= 23) row.fill('G8');
    else if (y === 24) row.fill('G4');
    else if (y === 25) row.fill('G8');
    else if (y >= 10 && y <= 21) {
      for (let x = 5; x <= 18; x++) row[x] = 'M2';
    }
    rows.push(row);
  }
  return rows;
}

const VARIANTES: Array<{
  genero: Genero; complexion: Complexion; traje: Traje; sufijo: string;
}> = [
  { genero: 'F', complexion: 'clara', traje: 'formal', sufijo: 'fcf' },
  { genero: 'F', complexion: 'clara', traje: 'casual', sufijo: 'fcc' },
  { genero: 'F', complexion: 'media', traje: 'formal', sufijo: 'fmf' },
  { genero: 'F', complexion: 'media', traje: 'casual', sufijo: 'fmc' },
  { genero: 'M', complexion: 'clara', traje: 'formal', sufijo: 'mcf' },
  { genero: 'M', complexion: 'clara', traje: 'casual', sufijo: 'mcc' },
  { genero: 'M', complexion: 'media', traje: 'formal', sufijo: 'mmf' },
  { genero: 'M', complexion: 'media', traje: 'casual', sufijo: 'mmc' },
];

const ESTADOS: EstadoSprite[] = [
  'idle', 'tecleando', 'consultando', 'decidiendo',
  'esperando', 'desconectado', 'publicando', 'proponiendo',
];

export { VARIANTES as VARIANTES_COMPANERO };

export function generarTodosCompaneros(): SpritePersona[] {
  const sprites: SpritePersona[] = [];
  for (const v of VARIANTES) {
    for (const estado of ESTADOS) {
      let mapa: string[][];
      if (estado === 'desconectado') {
        mapa = desconectado();
      } else {
        const base = generarMapaBase(v.genero, v.complexion, v.traje);
        switch (estado) {
          case 'tecleando':    mapa = tecleando(base); break;
          case 'consultando':  mapa = consultando(base); break;
          case 'decidiendo':   mapa = decidiendo(base); break;
          case 'esperando':    mapa = esperando(base); break;
          case 'publicando':   mapa = publicando(base); break;
          case 'proponiendo':  mapa = proponiendo(base); break;
          default:             mapa = base;
        }
      }
      sprites.push({
        nombre: `companero-${v.sufijo}-${estado}`,
        genero: v.genero, complexion: v.complexion, traje: v.traje,
        estado, mapa, escala: ESCALA,
      });
    }
  }
  return sprites;
}
