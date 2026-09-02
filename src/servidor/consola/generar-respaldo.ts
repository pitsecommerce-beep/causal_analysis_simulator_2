import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { cargarTodosDatos } from '../datos/cargador.js';
import { generarParlamentosDirectos } from '../voz/anthropic.js';
import { textoAAudio, vozCliente, vozDirector } from '../voz/deepgram.js';
import { cargarConfig } from '../motor/dag.js';
import { DISCURSO_DIRECTOR, DISCURSO_ADRIANA } from '../voz/guiones.js';

async function main(): Promise<void> {
  const datos = cargarTodosDatos();
  const config = cargarConfig();
  const voz = config.voz!;

  const parlamentos = generarParlamentosDirectos(
    datos.comentarios,
    datos.solicitudes,
    datos.verdadOculta.semilla,
  );

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  GENERACIÓN DE RESPALDO — audio pregrabado + datos reales  ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  for (let i = 0; i < parlamentos.length; i++) {
    const p = parlamentos[i];
    console.log(`║  ${i + 1}. ${p.nombre} (${p.genero}) — ${p.commentId}`);
    console.log(`║     Sucursal: ${p.sucursal}, Estado: ${p.estado}`);
    console.log(`║     Texto: ${p.texto.slice(0, 70)}...`);
    console.log('║');
  }

  const outDir = resolve('src/servidor/voz/respaldo');
  mkdirSync(outDir, { recursive: true });

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

    for (let i = 0; i < parlamentos.length; i++) {
      const p = parlamentos[i];
      const vozId = vozCliente(p.genero, i, voz.voces);
      const audio = await textoAAudio(p.texto, { voz: vozId }, voz.timeout_ms);
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
