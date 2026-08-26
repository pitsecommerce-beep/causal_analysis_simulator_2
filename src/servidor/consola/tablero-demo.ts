import { cargarConfig, crearEstadoInicial, avanzarTrimestre } from '../motor/dag.js';
import { aplicarIntervencion } from '../motor/intervenciones.js';
import { calcularPuntuacion } from '../puntuacion/reglas.js';
import type { DiagnosticoEquipo, RigorMetodo, EstadoMotor, ResultadoPuntuacion, ConfigSimulador } from '../motor/tipos.js';
import { FINALES } from '../motor/tipos.js';

const config = cargarConfig();

interface EquipoDemo {
  nombre: string;
  descripcion: string;
  intervenciones: { id: number; sucursales?: number[]; trimestre: number }[];
  diagnostico: Partial<DiagnosticoEquipo>;
  rigor: Partial<RigorMetodo>;
  minuto: number;
}

const EQUIPOS: EquipoDemo[] = [
  {
    nombre: 'Alfa',
    descripcion: 'Diagnostico perfecto + intervenciones optimas + rigor completo',
    intervenciones: [
      { id: 1, trimestre: 0 },
      { id: 4, trimestre: 0 },
      { id: 5, sucursales: [110, 676, 728], trimestre: 1 },
    ],
    diagnostico: { ventanaCapturaEsCuello: true, reprocesoEsMecanismo: true, fugaPlastico: true, trabajoPerdidoBuro: true },
    rigor: { paretoEstratificacion: true, dispersionInterpretacion: true, embudoEtapas: true, hipotesisEscrita: true, cruzoComentariosBase: true },
    minuto: 28,
  },
  {
    nombre: 'Beta',
    descripcion: 'Diagnostico perfecto + buenas intervenciones pero rigor parcial',
    intervenciones: [
      { id: 1, trimestre: 0 },
      { id: 4, trimestre: 1 },
    ],
    diagnostico: { ventanaCapturaEsCuello: true, reprocesoEsMecanismo: true, fugaPlastico: true, trabajoPerdidoBuro: true },
    rigor: { paretoEstratificacion: true, embudoEtapas: true, hipotesisEscrita: true },
    minuto: 32,
  },
  {
    nombre: 'Gamma',
    descripcion: 'Buen diagnostico parcial + algunas intervenciones',
    intervenciones: [
      { id: 1, trimestre: 0 },
      { id: 5, sucursales: [110, 676, 728], trimestre: 1 },
    ],
    diagnostico: { ventanaCapturaEsCuello: true, reprocesoEsMecanismo: true, fugaPlastico: true },
    rigor: { paretoEstratificacion: true, dispersionInterpretacion: true, embudoEtapas: true },
    minuto: 35,
  },
  {
    nombre: 'Delta',
    descripcion: 'Diagnostico decente + intervencion mediadora (Final C)',
    intervenciones: [
      { id: 6, trimestre: 0 },
      { id: 1, trimestre: 1 },
    ],
    diagnostico: { ventanaCapturaEsCuello: true, reprocesoEsMecanismo: true },
    rigor: { paretoEstratificacion: true, embudoEtapas: true },
    minuto: 38,
  },
  {
    nombre: 'Epsilon',
    descripcion: 'Ataque al mediador con foco en intervencion 6 (Final C)',
    intervenciones: [
      { id: 6, trimestre: 0 },
    ],
    diagnostico: { ventanaCapturaEsCuello: true, reprocesoEsMecanismo: true, fugaPlastico: true },
    rigor: { paretoEstratificacion: true },
    minuto: 36,
  },
  {
    nombre: 'Zeta',
    descripcion: 'Metrica traicionera - interv 8 que baja conversion (Final D)',
    intervenciones: [
      { id: 8, trimestre: 0 },
      { id: 1, trimestre: 1 },
    ],
    diagnostico: { ventanaCapturaEsCuello: true },
    rigor: { paretoEstratificacion: true },
    minuto: 40,
  },
  {
    nombre: 'Eta',
    descripcion: 'Metrica traicionera variante (Final D)',
    intervenciones: [
      { id: 8, trimestre: 0 },
    ],
    diagnostico: { ventanaCapturaEsCuello: true, reprocesoEsMecanismo: true },
    rigor: { embudoEtapas: true },
    minuto: 39,
  },
  {
    nombre: 'Theta',
    descripcion: 'Incentivo perverso - interv 9 (Final E)',
    intervenciones: [
      { id: 9, trimestre: 0 },
      { id: 1, trimestre: 1 },
    ],
    diagnostico: { ventanaCapturaEsCuello: true, reprocesoEsMecanismo: true },
    rigor: { paretoEstratificacion: true },
    minuto: 37,
  },
  {
    nombre: 'Iota',
    descripcion: 'Incentivo perverso variante (Final E)',
    intervenciones: [
      { id: 9, trimestre: 0 },
      { id: 3, trimestre: 1 },
    ],
    diagnostico: { ventanaCapturaEsCuello: true },
    rigor: {},
    minuto: 42,
  },
  {
    nombre: 'Kappa',
    descripcion: 'Dispersion - intervenciones 3 y 10 (Final F)',
    intervenciones: [
      { id: 3, trimestre: 0 },
      { id: 10, trimestre: 1 },
    ],
    diagnostico: { ventanaCapturaEsCuello: true },
    rigor: { paretoEstratificacion: true },
    minuto: 40,
  },
  {
    nombre: 'Lambda',
    descripcion: 'Dispersion variante (Final F)',
    intervenciones: [
      { id: 10, trimestre: 0 },
      { id: 2, trimestre: 1 },
    ],
    diagnostico: { reprocesoEsMecanismo: true },
    rigor: {},
    minuto: 43,
  },
  {
    nombre: 'Mu',
    descripcion: 'Paralisis por analisis - sin intervenciones (Final G)',
    intervenciones: [],
    diagnostico: { ventanaCapturaEsCuello: true },
    rigor: { paretoEstratificacion: true, hipotesisEscrita: true },
    minuto: 44,
  },
  {
    nombre: 'Nu',
    descripcion: 'Paralisis variante - sin intervenciones y poco diagnostico (Final G)',
    intervenciones: [],
    diagnostico: { reprocesoEsMecanismo: true },
    rigor: {},
    minuto: 45,
  },
  {
    nombre: 'Xi',
    descripcion: 'Falso positivo - causas espurias + trampas (Final H)',
    intervenciones: [
      { id: 2, trimestre: 0 },
    ],
    diagnostico: { causasEspurias: ['edad', 'score_buro', 'genero', 'estado_civil'], concentracionSinMasa: true },
    rigor: {},
    minuto: 43,
  },
  {
    nombre: 'Omicron',
    descripcion: 'Falso positivo variante (Final H)',
    intervenciones: [
      { id: 7, trimestre: 0 },
    ],
    diagnostico: { causasEspurias: ['edad', 'anios_cliente', 'score_buro'], concentracionSinMasa: true },
    rigor: { paretoEstratificacion: true },
    minuto: 41,
  },
  {
    nombre: 'Pi',
    descripcion: 'Buen proyecto incompleto - diagnostico bueno pero impacto parcial (Final B)',
    intervenciones: [
      { id: 1, trimestre: 0 },
      { id: 2, trimestre: 1 },
    ],
    diagnostico: { ventanaCapturaEsCuello: true, reprocesoEsMecanismo: true, fugaPlastico: true, trabajoPerdidoBuro: true },
    rigor: { paretoEstratificacion: true, dispersionInterpretacion: true, embudoEtapas: true, hipotesisEscrita: true },
    minuto: 30,
  },
];

function simularEquipo(eq: EquipoDemo, config: ConfigSimulador): { resultado: ResultadoPuntuacion; estado: EstadoMotor } {
  let estado = crearEstadoInicial(config);

  for (const interv of eq.intervenciones) {
    while (estado.trimestre < interv.trimestre && estado.trimestre < 3) {
      estado = avanzarTrimestre(estado, config);
    }
    aplicarIntervencion(estado, interv.id, config, interv.sucursales);
  }

  while (estado.trimestre < 3) {
    estado = avanzarTrimestre(estado, config);
  }

  const diagnostico: DiagnosticoEquipo = {
    ventanaCapturaEsCuello: eq.diagnostico.ventanaCapturaEsCuello ?? false,
    reprocesoEsMecanismo: eq.diagnostico.reprocesoEsMecanismo ?? false,
    fugaPlastico: eq.diagnostico.fugaPlastico ?? false,
    trabajoPerdidoBuro: eq.diagnostico.trabajoPerdidoBuro ?? false,
    causasEspurias: eq.diagnostico.causasEspurias ?? [],
    concentracionSinMasa: eq.diagnostico.concentracionSinMasa ?? false,
    minutoDeclaracion: eq.minuto,
  };

  const rigor: RigorMetodo = {
    paretoEstratificacion: eq.rigor.paretoEstratificacion ?? false,
    dispersionInterpretacion: eq.rigor.dispersionInterpretacion ?? false,
    embudoEtapas: eq.rigor.embudoEtapas ?? false,
    hipotesisEscrita: eq.rigor.hipotesisEscrita ?? false,
    cruzoComentariosBase: eq.rigor.cruzoComentariosBase ?? false,
  };

  const resultado = calcularPuntuacion(estado, diagnostico, rigor, config);
  return { resultado, estado };
}

function main(): void {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║         TABLERO DEMO — 16 equipos simulados (todos los finales)        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝');

  const resultados: { nombre: string; descripcion: string; resultado: ResultadoPuntuacion; estado: EstadoMotor }[] = [];

  for (const eq of EQUIPOS) {
    const { resultado, estado } = simularEquipo(eq, config);
    resultados.push({ nombre: eq.nombre, descripcion: eq.descripcion, resultado, estado });
  }

  resultados.sort((a, b) => b.resultado.total - a.resultado.total);

  console.log('');
  console.log('┌────┬──────────┬───────┬─────┬──────┬──────┬──────┬──────┬──────┬───────┬─────────────────────────────────┐');
  console.log('│  # │ Equipo   │ Total │ Fin │ Diag │ Rig  │ Imp  │ Vel  │ Efi  │ Penal │ Descripcion                     │');
  console.log('├────┼──────────┼───────┼─────┼──────┼──────┼──────┼──────┼──────┼───────┼─────────────────────────────────┤');

  for (let i = 0; i < resultados.length; i++) {
    const r = resultados[i];
    const p = r.resultado;
    const pos = String(i + 1).padStart(2);
    const nombre = r.nombre.padEnd(8);
    const total = String(p.total).padStart(5);
    const final = p.final.padEnd(3);
    const diag = String(p.diagnostico).padStart(4);
    const rig = String(p.rigor).padStart(4);
    const imp = String(p.impacto).padStart(4);
    const vel = String(p.velocidad).padStart(4);
    const efi = String(p.eficiencia).padStart(4);
    const pen = String(p.penalizaciones).padStart(5);
    const desc = r.descripcion.slice(0, 31).padEnd(31);
    console.log(`│ ${pos} │ ${nombre} │ ${total} │  ${final}│ ${diag} │ ${rig} │ ${imp} │ ${vel} │ ${efi} │ ${pen} │ ${desc} │`);
  }

  console.log('└────┴──────────┴───────┴─────┴──────┴──────┴──────┴──────┴──────┴───────┴─────────────────────────────────┘');

  const finalesCubiertos = new Set(resultados.map(r => r.resultado.final));
  const todosFinales = Object.keys(FINALES);
  const faltantes = todosFinales.filter(f => !finalesCubiertos.has(f));

  console.log(`\nFinales cubiertos: ${Array.from(finalesCubiertos).sort().join(', ')} (${finalesCubiertos.size}/8)`);
  if (faltantes.length > 0) {
    console.log(`\x1b[31mFaltantes: ${faltantes.join(', ')}\x1b[0m`);
  } else {
    console.log('\x1b[32mTodos los 8 finales cubiertos.\x1b[0m');
  }

  console.log('\n── Detalle por equipo ──\n');

  for (const r of resultados) {
    const finalInfo = FINALES[r.resultado.final as keyof typeof FINALES];
    console.log(`  ${r.nombre}: ${r.resultado.total} pts — Final ${r.resultado.final}: ${finalInfo.nombre}`);
    console.log(`    ${r.descripcion}`);
    console.log(`    KPIs finales: captura=${r.estado.kpis.ventanaCapturaMediana.toFixed(1)}d, quejas=${r.estado.kpis.quejas}, conv=${r.estado.kpis.conversion.toFixed(1)}%, errores=${r.estado.kpis.erroresTotales}`);

    const desglose = Object.entries(r.resultado.desglose)
      .filter(([, v]) => v !== 0)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}=${v > 0 ? '+' : ''}${v}`)
      .join(', ');
    if (desglose) console.log(`    Desglose: ${desglose}`);
    console.log('');
  }
}

main();
