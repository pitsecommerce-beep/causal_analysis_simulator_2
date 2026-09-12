#!/usr/bin/env npx tsx
import { generarDatosDemo } from '../debrief/datos-demo.js';
import { exec } from 'child_process';

function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  DEBRIEF DEMO — Dashboard con 17 equipos sinteticos        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const datos = generarDatosDemo();
  const ordenados = [...datos.equipos].sort((a, b) => b.resultado.total - a.resultado.total);

  console.log(`\n── ${datos.equipos.length} equipos generados ──\n`);
  console.log('  ┌────┬────────────┬───────┬─────┬──────┬───────┬────────┐');
  console.log('  │  # │ Equipo     │ Total │ Fin │ Diag │ Rigor │ Impact │');
  console.log('  ├────┼────────────┼───────┼─────┼──────┼───────┼────────┤');

  for (let i = 0; i < ordenados.length; i++) {
    const eq = ordenados[i];
    const r = eq.resultado;
    const pos = String(i + 1).padStart(2);
    const nombre = eq.nombre.padEnd(10);
    const total = String(r.total).padStart(5);
    const final_ = r.final.padEnd(3);
    const diag = String(r.diagnostico).padStart(4);
    const rigor = String(r.rigor).padStart(5);
    const impacto = String(r.impacto).padStart(6);
    console.log(`  │ ${pos} │ ${nombre} │ ${total} │  ${final_}│ ${diag} │ ${rigor} │ ${impacto} │`);
  }

  console.log('  └────┴────────────┴───────┴─────┴──────┴───────┴────────┘');

  console.log('\n── DAG verdadero ──\n');
  for (const nodo of datos.dagVerdadero) {
    const barra = '#'.repeat(nodo.equiposIdentificaron);
    console.log(`  ${nodo.nombre.padEnd(30)} ${String(nodo.equiposIdentificaron).padStart(2)}/${datos.equipos.length}  ${barra}`);
  }

  console.log('\n── Trampas declaradas ──\n');
  for (const t of datos.trampas.filter(t => t.equiposDeclararon > 0)) {
    const barra = '!'.repeat(t.equiposDeclararon);
    console.log(`  ${t.nombre.padEnd(20)} ${String(t.equiposDeclararon).padStart(2)} equipo(s)  r=${t.correlacionReal.toFixed(3)}  ${barra}`);
  }

  console.log('\n── Finales cubiertos ──\n');
  const finales = new Set(datos.equipos.map(e => e.resultado.final));
  console.log(`  ${Array.from(finales).sort().join(', ')} (${finales.size} de 8)`);

  console.log('\n── Verificaciones ──\n');
  let errores = 0;

  if (datos.equipos.length === 17) {
    console.log('  ✓ 17 equipos generados');
  } else {
    console.log(`  ✗ Se esperaban 17, hay ${datos.equipos.length}`);
    errores++;
  }

  if (datos.dagVerdadero.length === 4) {
    console.log('  ✓ 4 nodos causales en DAG');
  } else {
    console.log(`  ✗ Se esperaban 4 nodos, hay ${datos.dagVerdadero.length}`);
    errores++;
  }

  if (datos.trampas.length === 7) {
    console.log('  ✓ 7 trampas definidas');
  } else {
    console.log(`  ✗ Se esperaban 7 trampas, hay ${datos.trampas.length}`);
    errores++;
  }

  for (const eq of datos.equipos) {
    if (eq.historialKPIs.length !== 4) {
      console.log(`  ✗ ${eq.nombre}: historial tiene ${eq.historialKPIs.length} trimestres, esperados 4`);
      errores++;
    }
  }
  if (errores === 0) console.log('  ✓ Todos los historiales tienen 4 trimestres');

  const top = ordenados[0];
  const bottom = ordenados[ordenados.length - 1];
  console.log(`  ✓ Rango de puntajes: ${top.resultado.total} (${top.nombre}) a ${bottom.resultado.total} (${bottom.nombre})`);

  console.log('');
  if (errores > 0) {
    console.log(`  ✗ ${errores} error(es)`);
    process.exit(1);
  }

  console.log('  ✓ Datos de debrief verificados');
  console.log('');
  console.log('  Abriendo dashboard en navegador...');
  console.log('  (Usa Ctrl+C para detener el servidor Vite)');
  console.log('');

  const child = exec('npx vite --open /debrief-demo.html', { cwd: process.cwd() });
  child.stdout?.pipe(process.stdout);
  child.stderr?.pipe(process.stderr);
  child.on('exit', code => process.exit(code ?? 0));
}

main();
