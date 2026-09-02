#!/usr/bin/env npx tsx
import { cargarConfig, crearEstadoInicial, avanzarTrimestre } from '../motor/dag.js';
import { aplicarIntervencion } from '../motor/intervenciones.js';
import { calcularPuntuacion } from '../puntuacion/reglas.js';
import type { DiagnosticoEquipo, RigorMetodo, ConfigSimulador } from '../motor/tipos.js';
import { FINALES } from '../motor/tipos.js';

const config = cargarConfig();

interface EquipoSim {
  nombre: string;
  ids: number[];
  diag: Partial<DiagnosticoEquipo>;
  rigor: Partial<RigorMetodo>;
  minuto: number;
}

const EQUIPOS: EquipoSim[] = [
  { nombre: 'Alfa',    ids: [1, 4, 5], diag: { ventanaCapturaEsCuello: true, reprocesoEsMecanismo: true, fugaPlastico: true, trabajoPerdidoBuro: true }, rigor: { paretoEstratificacion: true, dispersionInterpretacion: true, embudoEtapas: true, hipotesisEscrita: true, cruzoComentariosBase: true }, minuto: 25 },
  { nombre: 'Beta',    ids: [1, 2],    diag: { ventanaCapturaEsCuello: true, reprocesoEsMecanismo: true },                                               rigor: { paretoEstratificacion: true, hipotesisEscrita: true },                                                                               minuto: 32 },
  { nombre: 'Gamma',   ids: [6],       diag: { ventanaCapturaEsCuello: true },                                                                            rigor: { paretoEstratificacion: true },                                                                                                       minuto: 38 },
  { nombre: 'Delta',   ids: [3],       diag: {},                                                                                                           rigor: {},                                                                                                                                    minuto: 43 },
  { nombre: 'Epsilon', ids: [],        diag: {},                                                                                                           rigor: {},                                                                                                                                    minuto: 45 },
];

function simular(eq: EquipoSim, cfg: ConfigSimulador) {
  let estado = crearEstadoInicial(cfg);
  for (const id of eq.ids) aplicarIntervencion(estado, id, cfg);
  estado = avanzarTrimestre(estado, cfg);
  estado = avanzarTrimestre(estado, cfg);
  estado = avanzarTrimestre(estado, cfg);

  const diagnostico: DiagnosticoEquipo = {
    ventanaCapturaEsCuello: eq.diag.ventanaCapturaEsCuello ?? false,
    reprocesoEsMecanismo: eq.diag.reprocesoEsMecanismo ?? false,
    fugaPlastico: eq.diag.fugaPlastico ?? false,
    trabajoPerdidoBuro: eq.diag.trabajoPerdidoBuro ?? false,
    causasEspurias: eq.diag.causasEspurias ?? [],
    concentracionSinMasa: eq.diag.concentracionSinMasa ?? false,
    minutoDeclaracion: eq.minuto,
  };
  const rigor: RigorMetodo = {
    paretoEstratificacion: eq.rigor.paretoEstratificacion ?? false,
    dispersionInterpretacion: eq.rigor.dispersionInterpretacion ?? false,
    embudoEtapas: eq.rigor.embudoEtapas ?? false,
    hipotesisEscrita: eq.rigor.hipotesisEscrita ?? false,
    cruzoComentariosBase: eq.rigor.cruzoComentariosBase ?? false,
  };

  return { estado, resultado: calcularPuntuacion(estado, diagnostico, rigor, cfg) };
}

function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  PROYECCION DEMO — Simula flujo de proyección en consola   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const fases = config.fases;
  let minAcum = 0;
  console.log('\n── Fases de sesión ──\n');
  for (const [nombre, fase] of Object.entries(fases)) {
    console.log(`  ${nombre.padEnd(16)} ${String(fase.duracion).padStart(2)} min  (${minAcum}:00 → ${minAcum + fase.duracion}:00)`);
    minAcum += fase.duracion;
  }
  console.log(`  ${'TOTAL'.padEnd(16)} ${minAcum} min`);

  if (minAcum > 50) {
    console.log('\n  ⚠ Las fases suman más de 50 minutos');
    process.exit(1);
  }
  console.log('\n  ✓ Las fases caben en 50 minutos');

  console.log('\n── Simulación de 5 equipos ──\n');

  const resultados = EQUIPOS.map(eq => {
    const { estado, resultado } = simular(eq, config);
    return { ...eq, estado, resultado };
  });

  resultados.sort((a, b) => b.resultado.total - a.resultado.total);

  console.log('  Marcador de trimestres (vista proyección):');
  console.log('  ┌────┬──────────┬───────┬─────┬──────────────────────────────────┐');
  console.log('  │  # │ Equipo   │ Total │ Fin │ Nombre                           │');
  console.log('  ├────┼──────────┼───────┼─────┼──────────────────────────────────┤');

  for (let i = 0; i < resultados.length; i++) {
    const r = resultados[i];
    const pos = String(i + 1).padStart(2);
    const nombre = r.nombre.padEnd(8);
    const total = String(r.resultado.total).padStart(5);
    const final_ = r.resultado.final.padEnd(3);
    const nombreFinal = (FINALES[r.resultado.final as keyof typeof FINALES]?.nombre ?? '').padEnd(32);
    console.log(`  │ ${pos} │ ${nombre} │ ${total} │  ${final_}│ ${nombreFinal} │`);
  }

  console.log('  └────┴──────────┴───────┴─────┴──────────────────────────────────┘');

  console.log('\n── Revelación de podio ──\n');

  const pasos = ['oscuro', 'titulo', 'letras', 'puntajes', 'ranking', 'podio', 'ganador', 'completo'];
  console.log('  Secuencia de revelación:');
  for (const p of pasos) {
    console.log(`    → ${p}`);
  }

  console.log('\n  Podio final:');
  for (let i = 0; i < Math.min(3, resultados.length); i++) {
    const r = resultados[i];
    const medalla = i === 0 ? 'ORO' : i === 1 ? 'PLATA' : 'BRONCE';
    console.log(`    ${medalla.padEnd(6)} ${r.nombre}: ${r.resultado.total} pts — Final ${r.resultado.final} (${FINALES[r.resultado.final as keyof typeof FINALES]?.nombre})`);
  }

  console.log('\n── Verificaciones ──\n');

  let errores = 0;

  const finalesCubiertos = new Set(resultados.map(r => r.resultado.final));
  console.log(`  Finales cubiertos: ${Array.from(finalesCubiertos).sort().join(', ')}`);

  if (resultados[0].resultado.total >= resultados[resultados.length - 1].resultado.total) {
    console.log('  ✓ Ranking ordenado de mayor a menor');
  } else {
    console.log('  ✗ Ranking desordenado');
    errores++;
  }

  for (const r of resultados) {
    const fi = FINALES[r.resultado.final as keyof typeof FINALES];
    if (!fi) {
      console.log(`  ✗ Final desconocido: ${r.resultado.final}`);
      errores++;
    } else {
      console.log(`  ✓ ${r.nombre}: final ${r.resultado.final} (${fi.nombre}) — ${r.resultado.total} pts`);
    }
  }

  const fasesSalta = ['espera', 'sala_juntas', 'voz_cliente', 'transicion', 'trimestre_1', 'trimestre_2', 'trimestre_3', 'consejo', 'finalizado'];
  const fasesConfig = Object.keys(fases);
  for (const f of fasesConfig) {
    if (!fasesSalta.includes(f)) {
      console.log(`  ✗ Fase desconocida en config: ${f}`);
      errores++;
    }
  }
  if (errores === 0) console.log('  ✓ Todas las fases son conocidas');

  console.log('');
  if (errores > 0) {
    console.log(`  ✗ ${errores} error(es) encontrado(s)`);
    process.exit(1);
  } else {
    console.log('  ✓ Demo de proyección verificada correctamente');
  }
}

main();
