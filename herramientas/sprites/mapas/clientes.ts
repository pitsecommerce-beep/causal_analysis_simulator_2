// Client sprites for testimonial phase (24×40 mini → 96×160)
const ESCALA = 4;

function fila(s: string, S: Record<string, string>): string[] {
  return s.split('').map(c => S[c] ?? '__');
}

interface SpriteCliente {
  nombre: string;
  mapa: string[][];
  escala: number;
}

function clienteBase(
  nombre: string,
  piel: string, sombra: string, cabello: string,
  ropa: string, detalle: string,
): SpriteCliente {
  const S: Record<string, string> = {
    '.': '__', H: cabello, P: piel, s: sombra,
    R: ropa, D: detalle,
  };

  const mapa = [
    fila('........HHHHHH..........', S),
    fila('......HHHHHHHHHH........', S),
    fila('.....HHHHHHHHHHH........', S),
    fila('.....HHHHHHHHHHHH.......', S),
    fila('......PPPPPPPPPP........', S),
    fila('......PPPPPPPPPP........', S),
    fila('......PssPPPssPP........', S),
    fila('......PPPPPPPPPP........', S),
    fila('........PPPPPP..........', S),
    fila('........PPPPPP..........', S),
    fila('....RRRRRRRRRRRRRR......', S),
    fila('...RRRRRRRRRRRRRRRR.....', S),
    fila('...RRRDDRRRRRRDDRR......', S),
    fila('...RRRRRRRRRRRRRRRR.....', S),
    fila('...RRRRRRRRRRRRRRRR.....', S),
    fila('...RRRRRRRRRRRRRRRR.....', S),
    fila('...RRRRRRRRRRRRRRRR.....', S),
    fila('....RRRRRRRRRRRRRR......', S),
    fila('..PPRRRRRRRRRRRRRRPP....', S),
    fila('..PPRRRRRRRRRRRRRRPP....', S),
    fila('..PPPPRRRRRRRRPPPPPP....', S),
    fila('..PPPPRRRRRRRRPPPPPP....', S),
    fila('...RRRRRRRRRRRRRR......', S),
    fila('...RRRRRRRRRRRRRR......', S),
    fila('...RRRRRRRRRRRRRR......', S),
    fila('...RRRRRR..RRRRRR......', S),
    fila('...RRRRRR..RRRRRR......', S),
    fila('...RRRRRR..RRRRRR......', S),
    fila('...RRRRRR..RRRRRR......', S),
    fila('...RRRRRR..RRRRRR......', S),
    fila('...RRRRRR..RRRRRR......', S),
    fila('...RRRRRR..RRRRRR......', S),
    fila('...RRRRRR..RRRRRR......', S),
    fila('...RRRRRR..RRRRRR......', S),
    fila('..RRRRRRR..RRRRRRR.....', S),
    fila('..RRRRRRR..RRRRRRR.....', S),
    fila('........................', S),
    fila('........................', S),
    fila('........................', S),
    fila('........................', S),
  ];

  return { nombre, mapa, escala: ESCALA };
}

export function generarClientes(): SpriteCliente[] {
  return [
    clienteBase('cliente-0', 'S1', 'S3', 'D2', 'N5', 'N3'),  // male, light
    clienteBase('cliente-1', 'S2', 'S4', 'BK', 'D1', 'M3'),  // male, medium
    clienteBase('cliente-2', 'S1', 'S3', 'D2', 'N4', 'N2'),  // female, light
    clienteBase('cliente-3', 'S2', 'S4', 'BK', 'M3', 'D1'),  // female, medium
  ];
}
