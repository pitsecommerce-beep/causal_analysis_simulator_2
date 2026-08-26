import { cargarTodosDatos } from '../datos/cargador.js';
import { generarDiscursoDirector, generarParlamentosClientes } from '../voz/anthropic.js';
import { textoAAudio, vozDirector, vozCliente } from '../voz/deepgram.js';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

async function main(): Promise<void> {
  console.log('Cargando datos...');
  const datos = cargarTodosDatos();
  const totalSucursales = new Set(datos.solicitudes.map(s => s.sucursal)).size;

  console.log('\n── Generando discurso del director ──');
  const discurso = await generarDiscursoDirector(
    datos.solicitudes.length,
    datos.comentarios.length,
    totalSucursales,
  );
  console.log(`Fuente: ${discurso.fuente}`);
  console.log(`Texto (${discurso.texto.length} chars):\n${discurso.texto.slice(0, 200)}...`);

  console.log('\n── Generando parlamentos de clientes ──');
  const parlamentos = await generarParlamentosClientes(
    datos.comentarios,
    datos.verdadOculta.semilla,
  );
  for (const p of parlamentos) {
    console.log(`  ${p.nombre} (${p.genero}, suc ${p.sucursal}) [${p.fuente}]: ${p.texto.slice(0, 80)}...`);
  }

  const outDir = resolve('tmp_voz_prueba');
  mkdirSync(outDir, { recursive: true });

  console.log('\n── Generando audio del director ──');
  const audioDirector = await textoAAudio(discurso.texto, { voz: vozDirector() });
  if (audioDirector.audio.length > 0) {
    const path = resolve(outDir, 'director.mp3');
    writeFileSync(path, audioDirector.audio);
    console.log(`Audio guardado: ${path} (${(audioDirector.audio.length / 1024).toFixed(1)} KB)`);
  } else {
    console.log('Sin audio (DEEPGRAM_API_KEY no configurada o error)');
  }

  for (let i = 0; i < parlamentos.length; i++) {
    const p = parlamentos[i];
    console.log(`\n── Audio cliente ${p.nombre} ──`);
    const audio = await textoAAudio(p.texto, { voz: vozCliente(p.genero, i) });
    if (audio.audio.length > 0) {
      const path = resolve(outDir, `cliente_${i}_${p.nombre}.mp3`);
      writeFileSync(path, audio.audio);
      console.log(`Audio guardado: ${path} (${(audio.audio.length / 1024).toFixed(1)} KB)`);
    } else {
      console.log('Sin audio');
    }
  }

  console.log('\n── Resultado ──');
  console.log(`Discurso: ${discurso.fuente === 'ia' ? 'IA' : 'respaldo'}`);
  console.log(`Parlamentos: ${parlamentos.length} generados`);
  console.log(`Audio director: ${audioDirector.fuente === 'ia' ? 'generado' : 'no disponible'}`);
  console.log(`Archivos en: ${outDir}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
