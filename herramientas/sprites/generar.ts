#!/usr/bin/env npx tsx
// Sprite generator — produces all PNGs from pixel maps
// Output: src/cliente/assets/sprites/*.png + manifiesto.json
// Contact sheet: herramientas/sprites/salida/contacto.png

import { resolve } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { colorPorClave } from './paleta.js';
import { crearPNG, guardarPNG, pegarPNG, dibujarMapa } from './png-util.js';
import { generarTodosCompaneros, ANCHO_SPRITE, ALTO_SPRITE } from './mapas/persona.js';
import { generarDirector } from './mapas/director.js';
import { generarClientes } from './mapas/clientes.js';
import { generarObjetos } from './mapas/objetos.js';
import { generarPanorama } from './mapas/panorama.js';

const SPRITES_DIR = resolve('src/cliente/assets/sprites');
const CONTACTO_DIR = resolve('herramientas/sprites/salida');

interface EntradaManifiesto {
  archivo: string;
  ancho: number;
  alto: number;
  anclaX: number;
  anclaY: number;
  categoria: string;
}

function renderizarMapa(
  mapa: string[][], escala: number,
): ReturnType<typeof crearPNG> {
  const alto = mapa.length * escala;
  const ancho = mapa[0].length * escala;
  const png = crearPNG(ancho, alto);

  for (let my = 0; my < mapa.length; my++) {
    for (let mx = 0; mx < mapa[my].length; mx++) {
      const color = colorPorClave(mapa[my][mx]);
      if (color[3] === 0) continue;
      for (let sy = 0; sy < escala; sy++) {
        for (let sx = 0; sx < escala; sx++) {
          const px = mx * escala + sx;
          const py = my * escala + sy;
          const idx = (png.width * py + px) << 2;
          png.data[idx] = color[0];
          png.data[idx + 1] = color[1];
          png.data[idx + 2] = color[2];
          png.data[idx + 3] = color[3];
        }
      }
    }
  }
  return png;
}

function main(): void {
  mkdirSync(SPRITES_DIR, { recursive: true });
  mkdirSync(CONTACTO_DIR, { recursive: true });

  const manifiesto: Record<string, EntradaManifiesto> = {};
  const todosSprites: Array<{ nombre: string; png: ReturnType<typeof crearPNG> }> = [];

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  GENERADOR DE SPRITES — pixel art programático             ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  // 1. Companions (4 variants × 6 states = 24 sprites)
  const companeros = generarTodosCompaneros();
  console.log(`║  Compañeros: ${companeros.length} sprites`);
  for (const sp of companeros) {
    const png = renderizarMapa(sp.mapa, sp.escala);
    const archivo = `${sp.nombre}.png`;
    guardarPNG(png, resolve(SPRITES_DIR, archivo));
    manifiesto[sp.nombre] = {
      archivo, ancho: png.width, alto: png.height,
      anclaX: Math.floor(png.width / 2), anclaY: png.height,
      categoria: 'companero',
    };
    todosSprites.push({ nombre: sp.nombre, png });
  }

  // 2. Director
  const dir = generarDirector();
  console.log('║  Director: 1 sprite');
  {
    const png = renderizarMapa(dir.mapa, dir.escala);
    const archivo = `${dir.nombre}.png`;
    guardarPNG(png, resolve(SPRITES_DIR, archivo));
    manifiesto[dir.nombre] = {
      archivo, ancho: png.width, alto: png.height,
      anclaX: Math.floor(png.width / 2), anclaY: png.height,
      categoria: 'director',
    };
    todosSprites.push({ nombre: dir.nombre, png });
  }

  // 3. Clients
  const clientes = generarClientes();
  console.log(`║  Clientes: ${clientes.length} sprites`);
  for (const cl of clientes) {
    const png = renderizarMapa(cl.mapa, cl.escala);
    const archivo = `${cl.nombre}.png`;
    guardarPNG(png, resolve(SPRITES_DIR, archivo));
    manifiesto[cl.nombre] = {
      archivo, ancho: png.width, alto: png.height,
      anclaX: Math.floor(png.width / 2), anclaY: png.height,
      categoria: 'cliente',
    };
    todosSprites.push({ nombre: cl.nombre, png });
  }

  // 4. Objects
  const objetos = generarObjetos();
  console.log(`║  Objetos: ${objetos.length} sprites`);
  for (const obj of objetos) {
    const png = renderizarMapa(obj.mapa, obj.escala);
    const archivo = `${obj.nombre}.png`;
    guardarPNG(png, resolve(SPRITES_DIR, archivo));
    manifiesto[obj.nombre] = {
      archivo, ancho: png.width, alto: png.height,
      anclaX: Math.floor(png.width / 2), anclaY: Math.floor(png.height / 2),
      categoria: 'objeto',
    };
    todosSprites.push({ nombre: obj.nombre, png });
  }

  // 5. Panorama
  console.log('║  Panorama: 3072×1024');
  const panorama = generarPanorama();
  guardarPNG(panorama, resolve(SPRITES_DIR, 'panorama.png'));
  manifiesto['panorama'] = {
    archivo: 'panorama.png', ancho: panorama.width, alto: panorama.height,
    anclaX: 0, anclaY: 0, categoria: 'fondo',
  };

  // Write manifest
  writeFileSync(
    resolve(SPRITES_DIR, 'manifiesto.json'),
    JSON.stringify(manifiesto, null, 2) + '\n',
  );
  console.log('║  ✓ manifiesto.json escrito');

  // 6. Contact sheet — all sprites on a grid
  console.log('║');
  console.log('║  ── Hoja de contacto ──');

  const MARGEN = 8;
  const COLUMNAS = 8;
  const maxW = Math.max(...todosSprites.map(s => s.png.width));
  const maxH = Math.max(...todosSprites.map(s => s.png.height));
  const celdaW = maxW + MARGEN * 2;
  const celdaH = maxH + MARGEN * 2;
  const filas = Math.ceil(todosSprites.length / COLUMNAS);
  const contactoW = celdaW * COLUMNAS;
  const contactoH = celdaH * filas;
  const contacto = crearPNG(contactoW, contactoH);

  // Dark background
  for (let i = 0; i < contacto.data.length; i += 4) {
    contacto.data[i] = 0x20;
    contacto.data[i + 1] = 0x25;
    contacto.data[i + 2] = 0x2C;
    contacto.data[i + 3] = 255;
  }

  for (let i = 0; i < todosSprites.length; i++) {
    const col = i % COLUMNAS;
    const row = Math.floor(i / COLUMNAS);
    const sp = todosSprites[i];
    const offX = col * celdaW + MARGEN + Math.floor((maxW - sp.png.width) / 2);
    const offY = row * celdaH + MARGEN + (maxH - sp.png.height);
    pegarPNG(contacto, sp.png, offX, offY);
  }

  guardarPNG(contacto, resolve(CONTACTO_DIR, 'contacto.png'));
  console.log(`║  ✓ contacto.png (${contactoW}×${contactoH}, ${todosSprites.length} sprites)`);

  // Size report
  const { statSync } = require('fs');
  let totalBytes = 0;
  for (const [, entry] of Object.entries(manifiesto)) {
    const e = entry as EntradaManifiesto;
    const size = statSync(resolve(SPRITES_DIR, e.archivo)).size;
    totalBytes += size;
  }
  const totalKB = (totalBytes / 1024).toFixed(1);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);

  console.log('║');
  console.log(`║  Total assets: ${totalKB} KB (${totalMB} MB)`);
  if (totalBytes > 2 * 1024 * 1024) {
    console.log('║  ⚠ EXCEDE 2 MB — optimizar antes de continuar');
  } else {
    console.log('║  ✓ Dentro del límite de 2 MB');
  }

  console.log('║');
  console.log(`║  Sprites generados: ${todosSprites.length}`);
  console.log(`║  Salida: ${SPRITES_DIR}`);
  console.log(`║  Contacto: ${resolve(CONTACTO_DIR, 'contacto.png')}`);
  console.log('║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
}

main();
