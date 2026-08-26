import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { cargarConfig } from '../motor/dag.js';
import { cargarTodosDatos } from '../datos/cargador.js';
import {
  generarDiscursoDirector,
  generarParlamentosClientes,
  validarTerminosProhibidos,
} from '../voz/anthropic.js';
import { textoAAudio, vozDirector, vozCliente } from '../voz/deepgram.js';
import { DISCURSO_DIRECTOR, TESTIMONIOS_RESPALDO } from '../voz/guiones.js';

const modoRespaldo = process.argv.includes('--respaldo');

async function main(): Promise<void> {
  const config = cargarConfig();
  const datos = cargarTodosDatos();
  const voz = config.voz!;
  const totalSucursales = new Set(datos.solicitudes.map(s => s.sucursal)).size;

  const outDir = resolve('salida');
  mkdirSync(outDir, { recursive: true });

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  PRUEBA DE VOZ — modo: ${(modoRespaldo ? 'RESPALDO' : 'IA').padEnd(37)}║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');

  if (modoRespaldo) {
    await probarRespaldo(outDir, voz);
  } else {
    await probarIA(outDir, datos, voz, totalSucursales);
  }

  console.log('╚══════════════════════════════════════════════════════════════╝');
}

async function probarIA(
  outDir: string,
  datos: ReturnType<typeof cargarTodosDatos>,
  voz: NonNullable<ReturnType<typeof cargarConfig>['voz']>,
  totalSucursales: number,
): Promise<void> {
  console.log('║');
  console.log('║  ── Discurso del director ──');

  const discurso = await generarDiscursoDirector(
    datos.solicitudes.length,
    datos.comentarios.length,
    totalSucursales,
    voz.terminos_prohibidos,
    voz.max_palabras_director,
    voz.timeout_ms,
  );

  const textoDirector = discurso.fuente === 'ia' && discurso.texto
    ? discurso.texto
    : DISCURSO_DIRECTOR;

  console.log(`║  Fuente texto:   ${discurso.fuente}`);
  console.log(`║  Tiempo Anthropic: ${discurso.tiempoMs} ms`);
  console.log(`║  Palabras:       ${textoDirector.split(/\s+/).length}`);
  console.log(`║  Validación:     ${discurso.validacion ? 'PASÓ' : 'FALLÓ (usó respaldo)'}`);

  writeFileSync(resolve(outDir, 'director.txt'), textoDirector);

  const audioDir = await textoAAudio(
    textoDirector,
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
    console.log('║  Audio:          no generado');
  }

  console.log('║');
  console.log('║  ── Parlamentos de clientes ──');

  const parlamentos = await generarParlamentosClientes(
    datos.comentarios,
    datos.solicitudes,
    datos.verdadOculta.semilla,
    voz.max_palabras_testimonio,
    voz.timeout_ms,
  );

  for (let i = 0; i < parlamentos.length; i++) {
    const p = parlamentos[i];
    console.log(`║`);
    console.log(`║  Cliente ${i + 1}: ${p.nombre} (${p.genero}, suc ${p.sucursal}, ${p.estado})`);
    console.log(`║  Fuente texto:   ${p.fuente}`);
    console.log(`║  Tiempo Anthropic: ${p.tiempoMs} ms`);
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
  const todosTextos = [textoDirector, ...parlamentos.map(p => p.texto)];
  let todosValidos = true;
  for (let i = 0; i < todosTextos.length; i++) {
    const etiqueta = i === 0 ? 'Director' : `Cliente ${i}`;
    const valido = validarTerminosProhibidos(todosTextos[i], voz.terminos_prohibidos);
    console.log(`║  ${etiqueta}: ${valido ? 'PASÓ' : 'FALLÓ'}`);
    if (!valido) todosValidos = false;
  }
  console.log(`║  Resultado global: ${todosValidos ? 'TODOS PASARON' : 'HAY FALLOS'}`);
  console.log('║');
}

async function probarRespaldo(
  outDir: string,
  voz: NonNullable<ReturnType<typeof cargarConfig>['voz']>,
): Promise<void> {
  console.log('║');
  console.log('║  ── Verificación de archivos de respaldo ──');

  const archivos = [
    'discurso-director.txt',
    'discurso-director.mp3',
    'testimonios.json',
    'cliente-0.mp3',
    'cliente-1.mp3',
    'cliente-2.mp3',
    'cliente-3.mp3',
  ];

  let todoOk = true;
  for (const archivo of archivos) {
    const ruta = resolve('src/servidor/voz/respaldo', archivo);
    const existe = existsSync(ruta);
    const marca = existe ? '✓' : '✗';
    if (!existe) todoOk = false;
    const tam = existe
      ? ` (${(readFileSync(ruta).length / 1024).toFixed(1)} KB)`
      : '';
    console.log(`║  ${marca} ${archivo}${tam}`);
  }

  console.log('║');
  console.log('║  ── Texto de respaldo del director ──');
  const textoDir = readFileSync(resolve('src/servidor/voz/respaldo/discurso-director.txt'), 'utf-8');
  const palabras = textoDir.split(/\s+/).length;
  console.log(`║  Palabras: ${palabras}`);
  const valido = validarTerminosProhibidos(textoDir, voz.terminos_prohibidos);
  console.log(`║  Validación términos prohibidos: ${valido ? 'PASÓ' : 'FALLÓ'}`);

  writeFileSync(resolve(outDir, 'director.txt'), textoDir);

  console.log('║');
  console.log('║  ── Testimonios de respaldo ──');
  const testimoniosRaw = readFileSync(resolve('src/servidor/voz/respaldo/testimonios.json'), 'utf-8');
  const testimonios = JSON.parse(testimoniosRaw) as Array<{
    nombre: string; genero: string; sucursal: number; estado: string; texto: string;
  }>;

  for (let i = 0; i < testimonios.length; i++) {
    const t = testimonios[i];
    console.log(`║  ${t.nombre} (${t.genero}, suc ${t.sucursal}, ${t.estado}): ${t.texto.slice(0, 60)}...`);
    writeFileSync(resolve(outDir, `cliente-${i}.txt`), t.texto);
  }

  console.log('║');
  console.log(`║  Resultado: ${todoOk ? 'TODOS LOS ARCHIVOS PRESENTES' : 'FALTAN ARCHIVOS'}`);
  console.log('║');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
