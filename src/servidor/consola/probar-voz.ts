import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { cargarConfig } from '../motor/dag.js';
import { cargarTodosDatos } from '../datos/cargador.js';
import {
  validarTerminosProhibidos,
  sortearComentarios,
  nombreFicticio,
  generarParlamentosDirectos,
} from '../voz/anthropic.js';
import { textoAAudio, vozDirector, vozCliente } from '../voz/deepgram.js';
import {
  DISCURSO_DIRECTOR,
  DISCURSO_ADRIANA,
  TESTIMONIOS_RESPALDO,
  validarTestimoniosContraDatos,
} from '../voz/guiones.js';

const modoRespaldo = process.argv.includes('--respaldo');

function esPlaceholder(buf: Buffer): boolean {
  if (buf.length === 0) return true;
  let ceros = 0;
  for (let i = 2; i < Math.min(buf.length, 512); i++) {
    if (buf[i] === 0) ceros++;
  }
  return ceros > 400;
}

async function main(): Promise<void> {
  const config = cargarConfig();
  const datos = cargarTodosDatos();
  const voz = config.voz!;

  const outDir = resolve('salida');
  mkdirSync(outDir, { recursive: true });

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  PRUEBA DE VOZ — modo: ${(modoRespaldo ? 'RESPALDO' : 'TEXTO FIJO + DEEPGRAM').padEnd(37)}║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');

  if (modoRespaldo) {
    await probarRespaldo(outDir, datos, voz);
  } else {
    await probarTextoFijo(outDir, datos, voz);
  }

  console.log('╚══════════════════════════════════════════════════════════════╝');
}

async function probarTextoFijo(
  outDir: string,
  datos: ReturnType<typeof cargarTodosDatos>,
  voz: NonNullable<ReturnType<typeof cargarConfig>['voz']>,
): Promise<void> {
  console.log('║');
  console.log('║  ── Discurso del director (texto fijo) ──');
  console.log('║  Fuente: src/servidor/voz/guiones/director.txt');
  console.log('║  Anthropic: NO SE USA en Acto 1');

  const palabras = DISCURSO_DIRECTOR.split(/\s+/).length;
  console.log(`║  Palabras:       ${palabras}`);

  const valido = validarTerminosProhibidos(DISCURSO_DIRECTOR, voz.terminos_prohibidos);
  console.log(`║  Validación:     ${valido ? 'PASÓ' : 'FALLÓ — contiene términos prohibidos'}`);

  writeFileSync(resolve(outDir, 'director.txt'), DISCURSO_DIRECTOR);

  const audioDir = await textoAAudio(
    DISCURSO_DIRECTOR,
    { voz: vozDirector(voz.voces) },
    voz.timeout_ms,
  );
  console.log(`║  Fuente audio:   ${audioDir.fuente}`);
  console.log(`║  Tiempo Deepgram: ${audioDir.tiempoMs} ms`);

  if (audioDir.audio.length > 0) {
    const path = resolve(outDir, 'director.mp3');
    writeFileSync(path, audioDir.audio);
    console.log(`║  Audio:          ${path} (${(audioDir.audio.length / 1024).toFixed(1)} KB)`);
  } else {
    console.log('║  Audio:          no generado (sin DEEPGRAM_API_KEY)');
  }

  console.log('║');
  console.log('║  ── Adriana Rueda (texto fijo) ──');
  console.log('║  Fuente: src/servidor/voz/guiones/adriana.txt');

  const palabrasAdriana = DISCURSO_ADRIANA.split(/\s+/).length;
  console.log(`║  Palabras:       ${palabrasAdriana}`);

  const vozAdriana = voz.voces.clienteF?.[0] ?? 'aura-2-carina-es';
  const audioAdriana = await textoAAudio(
    DISCURSO_ADRIANA,
    { voz: vozAdriana },
    voz.timeout_ms,
  );
  console.log(`║  Fuente audio:   ${audioAdriana.fuente}`);
  console.log(`║  Tiempo Deepgram: ${audioAdriana.tiempoMs} ms`);

  if (audioAdriana.audio.length > 0) {
    const path = resolve(outDir, 'adriana.mp3');
    writeFileSync(path, audioAdriana.audio);
    console.log(`║  Audio:          ${path} (${(audioAdriana.audio.length / 1024).toFixed(1)} KB)`);
  } else {
    console.log('║  Audio:          no generado (sin DEEPGRAM_API_KEY)');
  }

  console.log('║');
  console.log('║  ── Testimonios de clientes (texto directo, sin Anthropic) ──');

  const parlamentos = generarParlamentosDirectos(
    datos.comentarios,
    datos.solicitudes,
    datos.verdadOculta.semilla,
  );

  for (let i = 0; i < parlamentos.length; i++) {
    const p = parlamentos[i];
    console.log(`║`);
    console.log(`║  Cliente ${i + 1}: ${p.nombre} (${p.genero}, suc ${p.sucursal}, ${p.estado})`);
    console.log(`║  Fuente texto:   ${p.fuente}`);
    console.log(`║  Palabras:       ${p.texto.split(/\s+/).length}`);
    console.log(`║  Texto:          ${p.texto.slice(0, 80)}...`);

    writeFileSync(resolve(outDir, `cliente-${i}.txt`), p.texto);

    const vozId = vozCliente(p.genero, i, voz.voces);
    const audio = await textoAAudio(p.texto, { voz: vozId }, voz.timeout_ms);
    console.log(`║  Fuente audio:   ${audio.fuente}`);
    console.log(`║  Tiempo Deepgram: ${audio.tiempoMs} ms`);

    if (audio.audio.length > 0) {
      const path = resolve(outDir, `cliente-${i}.mp3`);
      writeFileSync(path, audio.audio);
      console.log(`║  Audio:          ${path} (${(audio.audio.length / 1024).toFixed(1)} KB)`);
    } else {
      console.log('║  Audio:          no generado');
    }
  }

  console.log('║');
  console.log('║  ── Validación de términos prohibidos ──');
  const todosTextos = [DISCURSO_DIRECTOR, ...parlamentos.map(p => p.texto)];
  let todosValidos = true;
  for (let i = 0; i < todosTextos.length; i++) {
    const etiqueta = i === 0 ? 'Director' : `Cliente ${i}`;
    const v = validarTerminosProhibidos(todosTextos[i], voz.terminos_prohibidos);
    console.log(`║  ${etiqueta}: ${v ? 'PASÓ' : 'FALLÓ'}`);
    if (!v) todosValidos = false;
  }
  console.log(`║  Resultado global: ${todosValidos ? 'TODOS PASARON' : 'HAY FALLOS'}`);

  console.log('║');
  console.log('║  ── Resumen ──');
  console.log('║  Anthropic en Acto 1: NO (texto fijo + testimonios directos)');
  console.log('║  Anthropic en consejo: SÍ (generarPreguntasConsejo, minuto 45)');
  console.log('║  Deepgram TTS: en vivo como camino principal');
  console.log('║');
}

async function probarRespaldo(
  outDir: string,
  datos: ReturnType<typeof cargarTodosDatos>,
  voz: NonNullable<ReturnType<typeof cargarConfig>['voz']>,
): Promise<void> {
  console.log('║');
  console.log('║  ── Validación de testimonios contra datos reales ──');
  console.log('║');

  const errores = validarTestimoniosContraDatos(
    TESTIMONIOS_RESPALDO,
    datos.comentarios,
    datos.solicitudes,
    datos.verdadOculta.semilla,
    sortearComentarios,
  );

  const seleccionados = sortearComentarios(datos.comentarios, datos.verdadOculta.semilla);
  const indiceSol = new Map(datos.solicitudes.map(s => [s.id, s]));

  for (let i = 0; i < TESTIMONIOS_RESPALDO.length; i++) {
    const t = TESTIMONIOS_RESPALDO[i];
    const real = seleccionados[i];
    const sol = real ? indiceSol.get(real.solicitudId) : null;
    const generoBase = sol ? sol.genero.toLowerCase() : '';
    const generoEsperado = generoBase.includes('female') || generoBase.includes('femenin') ? 'F' : 'M';
    const nombreEsperado = real ? nombreFicticio(real.id, generoEsperado, i) : '?';

    console.log(`║  Testimonio ${i + 1}:`);
    const campos = [
      { campo: 'commentId', respaldo: t.commentId, real: real?.id ?? '?' },
      { campo: 'solicitudId', respaldo: String(t.solicitudId), real: real ? String(real.solicitudId) : '?' },
      { campo: 'estado', respaldo: t.estado, real: real?.estado ?? '?' },
      { campo: 'sucursal', respaldo: String(t.sucursal), real: real ? String(real.sucursal) : '?' },
      { campo: 'genero', respaldo: t.genero, real: generoEsperado },
      { campo: 'nombre', respaldo: t.nombre, real: nombreEsperado },
      { campo: 'texto(50)', respaldo: t.texto.slice(0, 50), real: real ? real.comentario.slice(0, 50) : '?' },
    ];

    for (const c of campos) {
      const ok = c.respaldo === c.real;
      const marca = ok ? '✓' : '✗';
      console.log(`║    ${marca} ${c.campo.padEnd(14)} respaldo="${c.respaldo}" ${ok ? '' : `real="${c.real}"`}`);
    }
    console.log('║');
  }

  if (errores.length === 0) {
    console.log('║  ✓ TODOS LOS CAMPOS COINCIDEN CON DATOS REALES');
  } else {
    console.log(`║  ✗ ${errores.length} DISCREPANCIA(S) ENCONTRADA(S)`);
    console.log('║  Ejecuta "npm run voz:respaldo" para regenerar.');
  }

  console.log('║');
  console.log('║  ── Verificación de archivos de respaldo ──');
  console.log('║');

  const archivos = [
    { nombre: 'discurso-director.txt', esAudio: false },
    { nombre: 'discurso-director.mp3', esAudio: true },
    { nombre: 'adriana.mp3', esAudio: true },
    { nombre: 'testimonios.json', esAudio: false },
    { nombre: 'cliente-0.mp3', esAudio: true },
    { nombre: 'cliente-1.mp3', esAudio: true },
    { nombre: 'cliente-2.mp3', esAudio: true },
    { nombre: 'cliente-3.mp3', esAudio: true },
  ];

  let todoOk = true;
  let hayPlaceholders = false;
  for (const archivo of archivos) {
    const ruta = resolve('src/servidor/voz/respaldo', archivo.nombre);
    const existe = existsSync(ruta);
    if (!existe) {
      todoOk = false;
      console.log(`║  ✗ ${archivo.nombre} — NO ENCONTRADO`);
      continue;
    }

    const buf = readFileSync(ruta);
    const tam = (buf.length / 1024).toFixed(1);

    if (archivo.esAudio) {
      const placeholder = esPlaceholder(buf);
      if (placeholder) {
        hayPlaceholders = true;
        console.log(`║  ⚠ ${archivo.nombre} (${tam} KB) — PLACEHOLDER, no apto para sesión real`);
      } else {
        console.log(`║  ✓ ${archivo.nombre} (${tam} KB)`);
      }
    } else {
      console.log(`║  ✓ ${archivo.nombre} (${tam} KB)`);
    }
  }

  console.log('║');

  if (hayPlaceholders) {
    console.log('║  ⚠ Hay MP3 placeholder. Para generar audio real:');
    console.log('║    1. Configura DEEPGRAM_API_KEY en .env');
    console.log('║    2. Ejecuta "npm run voz:respaldo"');
    console.log('║');
  }

  console.log('║  ── Guion fijo del director ──');
  console.log(`║  Palabras: ${DISCURSO_DIRECTOR.split(/\s+/).length}`);
  const valido = validarTerminosProhibidos(DISCURSO_DIRECTOR, voz.terminos_prohibidos);
  console.log(`║  Validación términos prohibidos: ${valido ? 'PASÓ' : 'FALLÓ'}`);
  console.log('║');

  console.log('║  ── Textos de testimonios de respaldo ──');
  for (let i = 0; i < TESTIMONIOS_RESPALDO.length; i++) {
    const t = TESTIMONIOS_RESPALDO[i];
    const valT = validarTerminosProhibidos(t.texto, voz.terminos_prohibidos);
    console.log(`║  ${t.nombre} (${t.genero}, suc ${t.sucursal}, ${t.estado}): ${valT ? 'PASÓ' : 'FALLÓ'}`);
    console.log(`║    "${t.texto.slice(0, 70)}..."`);
  }

  console.log('║');
  console.log(`║  Resultado: ${todoOk && errores.length === 0 ? 'RESPALDO VÁLIDO' : 'HAY PROBLEMAS — ver arriba'}`);
  console.log('║');

  writeFileSync(resolve(outDir, 'director.txt'), DISCURSO_DIRECTOR);
  for (let i = 0; i < TESTIMONIOS_RESPALDO.length; i++) {
    writeFileSync(resolve(outDir, `cliente-${i}.txt`), TESTIMONIOS_RESPALDO[i].texto);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
