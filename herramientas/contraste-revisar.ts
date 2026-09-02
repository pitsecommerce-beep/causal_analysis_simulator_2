#!/usr/bin/env npx tsx
/**
 * contraste:revisar — Verifica ratios de contraste WCAG AA
 * entre pares semánticos texto/fondo del sistema de diseño.
 *
 * Uso: npm run contraste:revisar
 *
 * Reglas WCAG AA:
 *   - Texto normal (< 24px / < 18.66px bold): ratio >= 4.5
 *   - Texto grande (>= 24px / >= 18.66px bold): ratio >= 3.0
 *   - Componentes UI y gráficos: ratio >= 3.0
 */

import * as fs from 'fs';
import * as path from 'path';

const TOKENS_PATH = path.join(__dirname, '..', 'src', 'cliente', 'ipade-ds', 'tokens.css');

// Parse hex color to [r, g, b]
function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Relative luminance per WCAG 2.1
function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Contrast ratio between two colors
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(...hexToRgb(hex1));
  const l2 = luminance(...hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Extract CSS custom properties from :root blocks only (skip .ipd-theme-dark)
function extractTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>();

  // Find all :root { ... } blocks, skipping .ipd-theme-dark and @media
  const blockRe = /(?:^|\n)\s*:root\s*\{([^}]+)\}/g;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = blockRe.exec(css)) !== null) {
    // Check there's no class selector before :root on the same logical block
    const before = css.slice(Math.max(0, blockMatch.index - 40), blockMatch.index);
    if (before.includes('.ipd-theme-dark') || before.includes('[data-theme')) continue;

    const body = blockMatch[1];
    const propRe = /--(ipd-[a-z0-9-]+)\s*:\s*([^;]+)/g;
    let m: RegExpExecArray | null;
    while ((m = propRe.exec(body)) !== null) {
      tokens.set(`--${m[1]}`, m[2].trim());
    }
  }
  return tokens;
}

// Resolve a token value to a hex color (follows var() references)
function resolve(tokens: Map<string, string>, value: string, depth = 0): string | null {
  if (depth > 10) return null;
  const v = value.trim();

  // Direct hex
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;

  // var() reference
  const varMatch = v.match(/^var\(\s*(--[a-z0-9-]+)\s*\)$/);
  if (varMatch) {
    const ref = tokens.get(varMatch[1]);
    if (ref) return resolve(tokens, ref, depth + 1);
    return null;
  }

  // rgba — skip (can't calculate exact contrast without compositing)
  if (v.startsWith('rgba') || v.startsWith('rgb')) return null;

  return null;
}

// Pairs to check: [fg token, bg token, context, threshold]
type Par = [string, string, string, number];

const PARES_TEXTO_NORMAL: Par[] = [
  // Light theme — text on surfaces
  ['--ipd-text-primary', '--ipd-bg-page', 'texto primario / fondo página', 4.5],
  ['--ipd-text-primary', '--ipd-bg-subtle', 'texto primario / fondo sutil', 4.5],
  ['--ipd-text-secondary', '--ipd-bg-page', 'texto secundario / fondo página', 4.5],
  ['--ipd-text-secondary', '--ipd-bg-subtle', 'texto secundario / fondo sutil', 4.5],
  ['--ipd-text-tertiary', '--ipd-bg-page', 'texto terciario / fondo página', 3.0],
  ['--ipd-text-brand', '--ipd-bg-page', 'texto marca / fondo página', 4.5],
  ['--ipd-text-brand', '--ipd-bg-subtle', 'texto marca / fondo sutil', 4.5],
  ['--ipd-text-accent', '--ipd-bg-page', 'texto acento / fondo página', 4.5],
  ['--ipd-text-on-brand', '--ipd-bg-brand', 'texto sobre marca / fondo marca', 4.5],
  ['--ipd-text-on-brand', '--ipd-bg-brand-strong', 'texto sobre marca / fondo marca fuerte', 4.5],
  ['--ipd-text-on-accent', '--ipd-bg-accent', 'texto sobre acento / fondo acento', 4.5],
  ['--ipd-text-link', '--ipd-bg-page', 'enlace / fondo página', 4.5],
  ['--ipd-text-link', '--ipd-bg-subtle', 'enlace / fondo sutil', 4.5],

  // Feedback
  ['--ipd-feedback-success-fg', '--ipd-feedback-success-bg', 'éxito fg/bg', 4.5],
  ['--ipd-feedback-warning-fg', '--ipd-feedback-warning-bg', 'advertencia fg/bg', 4.5],
  ['--ipd-feedback-danger-fg', '--ipd-feedback-danger-bg', 'peligro fg/bg', 4.5],
  ['--ipd-feedback-info-fg', '--ipd-feedback-info-bg', 'info fg/bg', 4.5],

  // Interactive
  ['--ipd-text-on-brand', '--ipd-interactive-default', 'texto en botón primario', 4.5],
  ['--ipd-text-on-brand', '--ipd-interactive-hover', 'texto en botón hover', 4.5],
];

const PARES_UI: Par[] = [
  // Borders against backgrounds (3:1 for UI components)
  ['--ipd-border-default', '--ipd-bg-page', 'borde default / fondo página', 3.0],
  ['--ipd-border-focus', '--ipd-bg-page', 'borde focus / fondo página', 3.0],
  ['--ipd-border-brand', '--ipd-bg-page', 'borde marca / fondo página', 3.0],
];

// Team colors: must be readable on white (console) and on navy-900 (projection)
const EQUIPOS: Array<[string, number]> = Array.from({ length: 18 }, (_, i) => [
  `--ipd-equipo-${i + 1}`, i + 1,
]);
const FONDO_BLANCO = '#FFFFFF';
const FONDO_NAVY = '#001F3D';

function main() {
  if (!fs.existsSync(TOKENS_PATH)) {
    console.error(`No se encontró ${TOKENS_PATH}`);
    process.exit(1);
  }

  const css = fs.readFileSync(TOKENS_PATH, 'utf8');
  const tokens = extractTokens(css);
  let failures = 0;
  let warnings = 0;
  let passed = 0;

  console.log('Contraste WCAG AA — Sistema de diseño IPADE');
  console.log('=============================================\n');

  const allPairs = [...PARES_TEXTO_NORMAL, ...PARES_UI];

  for (const [fgToken, bgToken, context, threshold] of allPairs) {
    const fgVal = tokens.get(fgToken);
    const bgVal = tokens.get(bgToken);

    if (!fgVal || !bgVal) {
      console.log(`  ?  ${context}: token no encontrado (${fgToken} / ${bgToken})`);
      warnings++;
      continue;
    }

    const fgHex = resolve(tokens, fgVal);
    const bgHex = resolve(tokens, bgVal);

    if (!fgHex || !bgHex) {
      console.log(`  ?  ${context}: no se pudo resolver a hex (${fgVal} / ${bgVal})`);
      warnings++;
      continue;
    }

    const ratio = contrastRatio(fgHex, bgHex);
    const ok = ratio >= threshold;

    if (ok) {
      console.log(`  ✓  ${ratio.toFixed(2)}:1  ${context}  (mín ${threshold}:1)`);
      passed++;
    } else {
      console.log(`  ✗  ${ratio.toFixed(2)}:1  ${context}  (mín ${threshold}:1)  ← FALLA`);
      failures++;
    }
  }

  // Team colors check (3:1 against both backgrounds for UI legibility)
  console.log('\nColores de equipo');
  console.log('---------------------------------------------');

  for (const [token, num] of EQUIPOS) {
    const val = tokens.get(token);
    if (!val) {
      console.log(`  ?  equipo ${num}: token no encontrado (${token})`);
      warnings++;
      continue;
    }
    const hex = resolve(tokens, val);
    if (!hex) {
      console.log(`  ?  equipo ${num}: no se pudo resolver`);
      warnings++;
      continue;
    }

    const rBlanco = contrastRatio(hex, FONDO_BLANCO);
    const rNavy = contrastRatio(hex, FONDO_NAVY);
    const okB = rBlanco >= 3.0;
    const okN = rNavy >= 3.0;

    if (okB && okN) {
      console.log(`  ✓  equipo ${String(num).padStart(2)}: ${rBlanco.toFixed(2)}:1 blanco, ${rNavy.toFixed(2)}:1 navy`);
      passed++;
    } else {
      const fallos = [];
      if (!okB) fallos.push(`blanco ${rBlanco.toFixed(2)}:1`);
      if (!okN) fallos.push(`navy ${rNavy.toFixed(2)}:1`);
      console.log(`  ✗  equipo ${String(num).padStart(2)}: ${fallos.join(', ')}  ← FALLA`);
      failures++;
    }
  }

  console.log('\n---------------------------------------------');
  console.log(`Resultado: ${passed} pasaron, ${failures} fallaron, ${warnings} no resueltos`);

  if (failures > 0) {
    console.log('\n✗ Hay pares que no cumplen WCAG AA.');
    process.exit(1);
  } else {
    console.log('\n✓ Todos los pares semánticos y colores de equipo cumplen WCAG AA.');
    process.exit(0);
  }
}

main();
