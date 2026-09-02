import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const TOKENS_PATH = path.join(__dirname, '..', 'src', 'cliente', 'ipade-ds', 'tokens.css');

function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(...hexToRgb(hex1));
  const l2 = luminance(...hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function extractTeamColors(css: string): Map<string, string> {
  const colors = new Map<string, string>();
  const re = /--(ipd-equipo-\d+)\s*:\s*(#[0-9a-fA-F]{6})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    colors.set(`--${m[1]}`, m[2]);
  }
  return colors;
}

const css = fs.readFileSync(TOKENS_PATH, 'utf8');
const teamColors = extractTeamColors(css);

describe('Colores de equipo — contraste WCAG', () => {
  it('hay exactamente 18 colores de equipo definidos', () => {
    expect(teamColors.size).toBe(18);
    for (let i = 1; i <= 18; i++) {
      expect(teamColors.has(`--ipd-equipo-${i}`), `equipo ${i}`).toBe(true);
    }
  });

  it('cada color pasa 3:1 contra blanco (#FFFFFF)', () => {
    for (const [token, hex] of teamColors) {
      const ratio = contrastRatio(hex, '#FFFFFF');
      expect(ratio, `${token} (${hex}) vs blanco`).toBeGreaterThanOrEqual(3.0);
    }
  });

  it('cada color pasa 3:1 contra navy (#001F3D)', () => {
    for (const [token, hex] of teamColors) {
      const ratio = contrastRatio(hex, '#001F3D');
      expect(ratio, `${token} (${hex}) vs navy`).toBeGreaterThanOrEqual(3.0);
    }
  });

  it('los 18 colores son distintos entre sí', () => {
    const hexes = [...teamColors.values()].map(h => h.toLowerCase());
    expect(new Set(hexes).size).toBe(18);
  });
});
