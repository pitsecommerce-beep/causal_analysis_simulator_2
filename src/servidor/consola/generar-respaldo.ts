import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { cargarTodosDatos } from '../datos/cargador.js';
import { sortearComentarios, nombreFicticio } from '../voz/anthropic.js';
import { textoAAudio, vozCliente, vozDirector } from '../voz/deepgram.js';
import { cargarConfig } from '../motor/dag.js';
import { DISCURSO_DIRECTOR, DISCURSO_ADRIANA, type TestimonioRespaldo } from '../voz/guiones.js';

async function main(): Promise<void> {
  const datos = cargarTodosDatos();
  const config = cargarConfig();
  const voz = config.voz!;

  const seleccionados = sortearComentarios(datos.comentarios, datos.verdadOculta.semilla);
  const indiceSolicitud = new Map(datos.solicitudes.map(s => [s.id, s]));

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  GENERACIÓN DE RESPALDO — texto fijo + datos reales        ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  const testimonios: TestimonioRespaldo[] = [];

  for (let i = 0; i < seleccionados.length; i++) {
    const com = seleccionados[i];
    const sol = indiceSolicitud.get(com.solicitudId);
    const generoBase = sol ? sol.genero.toLowerCase() : '';
    const genero = generoBase.includes('female') || generoBase.includes('femenin') ? 'F' : 'M';
    const nombre = nombreFicticio(com.id, genero, i);

    testimonios.push({
      commentId: com.id,
      solicitudId: com.solicitudId,
      estado: com.estado,
      sucursal: com.sucursal,
      genero,
      intentos: com.intentos,
      nombre,
      texto: com.comentario,
    });

    console.log(`║  ${i + 1}. ${nombre} (${genero}) — ${com.id}, sol ${com.solicitudId}`);
    console.log(`║     Sucursal: ${com.sucursal}, Estado: ${com.estado}`);
    console.log(`║     Categoría: ${com.categoriaPrimaria}`);
    console.log(`║     Texto: ${com.comentario.slice(0, 70)}...`);
    console.log('║');
  }

  const outDir = resolve('src/servidor/voz/respaldo');
  mkdirSync(outDir, { recursive: true });

  writeFileSync(resolve(outDir, 'testimonios.json'), JSON.stringify(testimonios, null, 2) + '\n');
  console.log('║  ✓ testimonios.json escrito');

  writeFileSync(resolve(outDir, 'discurso-director.txt'), DISCURSO_DIRECTOR);
  console.log('║  ✓ discurso-director.txt escrito desde guion fijo');

  if (process.env.DEEPGRAM_API_KEY) {
    console.log('║');
    console.log('║  ── Generando audio MP3 con Deepgram ──');

    const audioDir = await textoAAudio(
      DISCURSO_DIRECTOR,
      { voz: vozDirector(voz.voces) },
      voz.timeout_ms,
    );
    if (audioDir.audio.length > 0) {
      writeFileSync(resolve(outDir, 'discurso-director.mp3'), audioDir.audio);
      console.log(`║  ✓ discurso-director.mp3 (${(audioDir.audio.length / 1024).toFixed(1)} KB)`);
    } else {
      console.log('║  ✗ discurso-director.mp3 no generado');
    }

    const vozAdriana = voz.voces.clienteF?.[0] ?? 'aura-2-carina-es';
    const audioAdriana = await textoAAudio(
      DISCURSO_ADRIANA,
      { voz: vozAdriana },
      voz.timeout_ms,
    );
    if (audioAdriana.audio.length > 0) {
      writeFileSync(resolve(outDir, 'adriana.mp3'), audioAdriana.audio);
      console.log(`║  ✓ adriana.mp3 (${(audioAdriana.audio.length / 1024).toFixed(1)} KB)`);
    } else {
      console.log('║  ✗ adriana.mp3 no generado');
    }

    for (let i = 0; i < testimonios.length; i++) {
      const t = testimonios[i];
      const vozId = vozCliente(t.genero, i, voz.voces);
      const audio = await textoAAudio(t.texto, { voz: vozId }, voz.timeout_ms);
      if (audio.audio.length > 0) {
        writeFileSync(resolve(outDir, `cliente-${i}.mp3`), audio.audio);
        console.log(`║  ✓ cliente-${i}.mp3 (${(audio.audio.length / 1024).toFixed(1)} KB)`);
      } else {
        console.log(`║  ✗ cliente-${i}.mp3 no generado`);
      }
    }
  } else {
    console.log('║');
    console.log('║  ⚠ DEEPGRAM_API_KEY no configurada — MP3 no regenerados');
  }

  console.log('║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
