// Director standing sprite (24×40 mini → 96×160)
const ESCALA = 4;
export const ANCHO = 24 * ESCALA;
export const ALTO = 40 * ESCALA;

function fila(s: string, S: Record<string, string>): string[] {
  return s.split('').map(c => S[c] ?? '__');
}

export function generarDirector(): { nombre: string; mapa: string[][]; escala: number } {
  const S: Record<string, string> = {
    '.': '__', H: 'D2', P: 'S1', s: 'S3',
    R: 'N9', D: 'N6', T: 'WH', G: 'G6',
  };

  const mapa = [
    fila('........HHHHHH..........', S),  // 0
    fila('......HHHHHHHHHH........', S),  // 1
    fila('.....HHHHHHHHHHH........', S),  // 2
    fila('.....HHHHHHHHHHHH.......', S),  // 3
    fila('......PPPPPPPPPP........', S),  // 4
    fila('......PPPPPPPPPP........', S),  // 5
    fila('......PssPPPssPP........', S),  // 6
    fila('......PPPPPPPPPP........', S),  // 7
    fila('........PPPPPP..........', S),  // 8
    fila('........TTTTTT..........', S),  // 9  collar
    fila('....RRRRRRRRRRRRRR......', S),  // 10 suit jacket
    fila('...RRRRRRDDRRRRRRR.....', S),  // 11
    fila('..RRRRRRDDDDRRRRRR.....', S),  // 12 tie area
    fila('..RRRRRRDDDDRRRRRR.....', S),  // 13
    fila('..RRRRRRDDDDRRRRRR.....', S),  // 14
    fila('..RRRRRRRRRRRRRRRR.....', S),  // 15
    fila('..RRRRRRRRRRRRRRRR.....', S),  // 16
    fila('..RRRRRRRRRRRRRRRR.....', S),  // 17
    fila('..RRRRRRRRRRRRRRRR.....', S),  // 18
    fila('..RRRRRRRRRRRRRRRR.....', S),  // 19
    fila('..PPRRRRRRRRRRRRPP.....', S),  // 20 hands visible
    fila('..PPRRRRRRRRRRRRPP.....', S),  // 21
    fila('...RRRRRRRRRRRRRR......', S),  // 22 belt area
    fila('...GGGGGGGGGGGGGG......', S),  // 23 belt
    fila('...RRRRRRRRRRRRRR......', S),  // 24 trousers
    fila('...RRRRRRRRRRRRRR......', S),  // 25
    fila('...RRRRRRRRRRRRRR......', S),  // 26
    fila('...RRRRRR..RRRRRR......', S),  // 27 legs separate
    fila('...RRRRRR..RRRRRR......', S),  // 28
    fila('...RRRRRR..RRRRRR......', S),  // 29
    fila('...RRRRRR..RRRRRR......', S),  // 30
    fila('...RRRRRR..RRRRRR......', S),  // 31
    fila('...RRRRRR..RRRRRR......', S),  // 32
    fila('...RRRRRR..RRRRRR......', S),  // 33
    fila('...RRRRRR..RRRRRR......', S),  // 34
    fila('...RRRRRR..RRRRRR......', S),  // 35
    fila('..RRRRRRR..RRRRRRR.....', S),  // 36 shoes
    fila('..RRRRRRR..RRRRRRR.....', S),  // 37
    fila('........................', S),  // 38
    fila('........................', S),  // 39
  ];

  return { nombre: 'director', mapa, escala: ESCALA };
}
