import type { RGBA } from '../paleta.js';
import { PALETA } from '../paleta.js';

type Complexion = 'clara' | 'media';
type Traje = 'formal' | 'casual';

export type EstadoSprite =
  | 'idle' | 'tecleando' | 'consultando'
  | 'decidiendo' | 'esperando' | 'desconectado';

export interface SpritePersona {
  nombre: string;
  complexion: Complexion;
  traje: Traje;
  estado: EstadoSprite;
  mapa: string[][];
  escala: number;
}

// 24×40 mini-template scaled 4x → 96×160 output
const ESCALA = 4;
export const ANCHO_SPRITE = 24 * ESCALA;
export const ALTO_SPRITE = 40 * ESCALA;

// Parse a row string into 2-char palette key array
// Each char in the template maps to a key via the substitution table
function fila(s: string, subs: Record<string, string>): string[] {
  return s.split('').map(c => subs[c] ?? '__');
}

function generarMapaBase(comp: Complexion, traje: Traje): string[][] {
  const pb = comp === 'clara' ? 'S1' : 'S2';
  const ps = comp === 'clara' ? 'S3' : 'S4';
  const hr = comp === 'clara' ? 'D2' : 'BK';
  const rc = traje === 'formal' ? 'N7' : 'D2';
  const rd = traje === 'formal' ? 'N5' : 'M3';

  const S: Record<string, string> = {
    '.': '__', H: hr, P: pb, S: ps,
    R: rc, D: rd, T: 'G8', L: 'G4',
    W: 'WH', N: 'N1',
  };

  // 24-wide template, each char = one pixel column at mini scale
  return [
    //          head
    fila('........HHHHHH..........', S),  // 0  hair top
    fila('......HHHHHHHHHH........', S),  // 1
    fila('.....HHHHHHHHHHH........', S),  // 2
    fila('.....HHHHHHHHHHHH.......', S),  // 3
    fila('......PPPPPPPPPP........', S),  // 4  face
    fila('......PPPPPPPPPP........', S),  // 5
    fila('......PSSPPPSSPP........', S),  // 6  eyes (shadow = eye area)
    fila('......PPPPPPPPPP........', S),  // 7
    fila('........PPPPPP..........', S),  // 8  neck
    fila('........PPPPPP..........', S),  // 9
    //          torso
    fila('....RRRRRRRRRRRRRR......', S),  // 10 shoulders
    fila('...RRRRRRRRRRRRRRRR.....', S),  // 11
    fila('...RRRDDRRRRRRDDRR......', S),  // 12 lapels/detail
    fila('...RRRRRRRRRRRRRRRR.....', S),  // 13
    fila('...RRRRRRRRRRRRRRRR.....', S),  // 14
    fila('...RRRRRRRRRRRRRRRR.....', S),  // 15
    fila('...RRRRRRRRRRRRRRRR.....', S),  // 16
    fila('....RRRRRRRRRRRRRR......', S),  // 17
    //          arms on table
    fila('..PPRRRRRRRRRRRRRRPP....', S),  // 18
    fila('..PPRRRRRRRRRRRRRRPP....', S),  // 19
    fila('..PPPPRRRRRRRRPPPPPP....', S),  // 20 hands
    fila('..PPPPRRRRRRRRPPPPPP....', S),  // 21
    //          table surface
    fila('TTTTTTTTTTTTTTTTTTTTTTTT', S),  // 22
    fila('TTTTTTTTTTTTTTTTTTTTTTTT', S),  // 23
    fila('LLLLLLLLLLLLLLLLLLLLLLLL', S),  // 24 table edge highlight
    fila('TTTTTTTTTTTTTTTTTTTTTTTT', S),  // 25
    //          below table (chair legs, floor)
    fila('........................', S),  // 26
    fila('........................', S),  // 27
    fila('........................', S),  // 28
    fila('........................', S),  // 29
    fila('........................', S),  // 30
    fila('........................', S),  // 31
    fila('........................', S),  // 32
    fila('........................', S),  // 33
    fila('........................', S),  // 34
    fila('........................', S),  // 35
    fila('........................', S),  // 36
    fila('........................', S),  // 37
    fila('........................', S),  // 38
    fila('........................', S),  // 39
  ];
}

function clonar(m: string[][]): string[][] {
  return m.map(r => [...r]);
}

function tecleando(base: string[][]): string[][] {
  const m = clonar(base);
  // Lean forward: shift head 1px right, lower arms
  for (let y = 0; y <= 9; y++) {
    m[y] = ['__', ...m[y].slice(0, 23)];
  }
  // Hands closer together on keyboard
  if (m[20]) { m[20][5] = m[20][2]; m[20][6] = m[20][2]; m[20][9] = m[20][2]; m[20][10] = m[20][2]; }
  return m;
}

function consultando(base: string[][]): string[][] {
  const m = clonar(base);
  // Laptop glow on table
  m[22][5] = 'N3'; m[22][6] = 'N3'; m[22][7] = 'N3'; m[22][8] = 'N3';
  m[22][9] = 'N3'; m[22][10] = 'N3';
  m[23][6] = 'N2'; m[23][7] = 'N2'; m[23][8] = 'N2'; m[23][9] = 'N2';
  return m;
}

function decidiendo(base: string[][]): string[][] {
  const m = clonar(base);
  // Hand to chin — raise one arm
  const pb = m[18][1]; // skin color from base
  m[8][5] = pb; m[7][5] = pb;
  m[18][1] = '__'; m[19][1] = '__';
  return m;
}

function esperando(base: string[][]): string[][] {
  const m = clonar(base);
  // Warning indicator above head
  m[0][10] = 'WR'; m[0][11] = 'WR';
  m[0][12] = 'WR'; m[0][13] = 'WR';
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
      // Faint chair silhouette
      for (let x = 5; x <= 18; x++) row[x] = 'M2';
    }
    rows.push(row);
  }
  return rows;
}

const VARIANTES: Array<{ complexion: Complexion; traje: Traje; sufijo: string }> = [
  { complexion: 'clara', traje: 'formal', sufijo: 'cf' },
  { complexion: 'clara', traje: 'casual', sufijo: 'cc' },
  { complexion: 'media', traje: 'formal', sufijo: 'mf' },
  { complexion: 'media', traje: 'casual', sufijo: 'mc' },
];

const ESTADOS: EstadoSprite[] = [
  'idle', 'tecleando', 'consultando', 'decidiendo', 'esperando', 'desconectado',
];

export function generarTodosCompaneros(): SpritePersona[] {
  const sprites: SpritePersona[] = [];
  for (const v of VARIANTES) {
    for (const estado of ESTADOS) {
      let mapa: string[][];
      if (estado === 'desconectado') {
        mapa = desconectado();
      } else {
        const base = generarMapaBase(v.complexion, v.traje);
        switch (estado) {
          case 'tecleando':    mapa = tecleando(base); break;
          case 'consultando':  mapa = consultando(base); break;
          case 'decidiendo':   mapa = decidiendo(base); break;
          case 'esperando':    mapa = esperando(base); break;
          default:             mapa = base;
        }
      }
      sprites.push({
        nombre: `companero-${v.sufijo}-${estado}`,
        complexion: v.complexion, traje: v.traje,
        estado, mapa, escala: ESCALA,
      });
    }
  }
  return sprites;
}
