// 32-color palette derived from IPADE Design System tokens
// Each color: [R, G, B, A]
export type RGBA = [number, number, number, number];

export const PALETA: Record<string, RGBA> = {
  // Transparent
  _: [0, 0, 0, 0],

  // Navy scale (from tokens.css)
  N9: [0x00, 0x15, 0x2B, 255],  // navy-950
  N8: [0x00, 0x1F, 0x3D, 255],  // navy-900
  N7: [0x00, 0x28, 0x4E, 255],  // navy-800
  N6: [0x00, 0x30, 0x5B, 255],  // navy-700 — anchor blue
  N5: [0x14, 0x48, 0x7A, 255],  // navy-600
  N4: [0x1E, 0x5A, 0x96, 255],  // navy-500
  N3: [0x4C, 0x82, 0xB8, 255],  // navy-400
  N2: [0x8A, 0xAF, 0xD3, 255],  // navy-300
  N1: [0xC0, 0xD6, 0xE9, 255],  // navy-200
  N0: [0xE1, 0xEC, 0xF5, 255],  // navy-100

  // Gold scale
  G8: [0x6B, 0x52, 0x19, 255],  // gold-900
  G6: [0xB0, 0x8D, 0x3F, 255],  // gold-600
  G4: [0xD9, 0xBF, 0x86, 255],  // gold-400
  G2: [0xF3, 0xED, 0xDC, 255],  // gold-200
  G1: [0xFA, 0xF7, 0xEF, 255],  // gold-100

  // Neutrals
  WH: [0xFF, 0xFF, 0xFF, 255],  // white
  L1: [0xF7, 0xF8, 0xFA, 255],  // neutral-50
  L2: [0xEF, 0xF1, 0xF4, 255],  // neutral-100
  L3: [0xDD, 0xE1, 0xE7, 255],  // neutral-200
  M1: [0xC2, 0xC8, 0xD1, 255],  // neutral-300
  M2: [0x9A, 0xA3, 0xB0, 255],  // neutral-400
  M3: [0x66, 0x70, 0x7E, 255],  // neutral-500
  D1: [0x4D, 0x55, 0x61, 255],  // neutral-600
  D2: [0x34, 0x3B, 0x45, 255],  // neutral-700
  D3: [0x20, 0x25, 0x2C, 255],  // neutral-800
  BK: [0x10, 0x14, 0x1A, 255],  // neutral-900

  // Skin tones (corporate, understated) — 3 base tones
  S1: [0xE8, 0xC8, 0xA0, 255],  // light skin
  S2: [0xC4, 0x9A, 0x6C, 255],  // medium skin
  S3: [0xD6, 0xB0, 0x86, 255],  // light skin shadow
  S4: [0x9E, 0x76, 0x50, 255],  // medium skin shadow
  S5: [0x8A, 0x5C, 0x3A, 255],  // dark skin
  S6: [0x6E, 0x44, 0x2A, 255],  // dark skin shadow

  // Hair tones
  H1: [0x5A, 0x3A, 0x1E, 255],  // brown hair
  H2: [0x2A, 0x1A, 0x0E, 255],  // dark brown hair

  // Scene-specific — wood
  W1: [0x8B, 0x6B, 0x47, 255],  // wood light
  W2: [0x6B, 0x4E, 0x32, 255],  // wood mid
  W3: [0x4A, 0x35, 0x22, 255],  // wood dark

  // Scene-specific — glass / afternoon light
  GL: [0xAA, 0xCC, 0xE8, 255],  // glass highlight
  AF: [0xFF, 0xE8, 0xC0, 255],  // afternoon glow

  // Pear logo
  PR: [0xC8, 0xD8, 0xC0, 255],  // pear body (muted green-cream)
  PL: [0x5A, 0x7A, 0x3A, 255],  // pear leaf

  // Status accents
  OK: [0x1E, 0x7A, 0x46, 255],  // success
  WR: [0x8B, 0x51, 0x06, 255],  // warning (matches tokens.css)
  ER: [0xB3, 0x26, 0x1E, 255],  // danger
};

export const PALETTE_KEYS = Object.keys(PALETA).filter(k => k !== '_');

export function colorPorClave(clave: string): RGBA {
  return PALETA[clave] ?? PALETA['_'];
}
