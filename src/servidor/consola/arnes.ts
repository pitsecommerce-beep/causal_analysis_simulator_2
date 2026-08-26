import * as readline from 'readline';
import { cargarConfig, crearEstadoInicial, avanzarTrimestre } from '../motor/dag.js';
import { aplicarIntervencion, listarIntervencionesDisponibles } from '../motor/intervenciones.js';
import { calcularPuntuacion } from '../puntuacion/reglas.js';
import { crearDiagnosticoVacio, crearRigorVacio } from '../puntuacion/evaluacion.js';
import type { EstadoMotor, KPIs } from '../motor/tipos.js';
import { FINALES } from '../motor/tipos.js';

const config = cargarConfig();
let estado = crearEstadoInicial(config);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function preguntar(texto: string): Promise<string> {
  return new Promise(resolve => rl.question(texto, resolve));
}

function imprimirKPIs(kpis: KPIs, base?: KPIs): void {
  const delta = (actual: number, original: number, mejorSiMenor: boolean = true): string => {
    if (!base) return '';
    const diff = actual - original;
    if (Math.abs(diff) < 0.1) return '  (=)';
    const signo = diff > 0 ? '+' : '';
    const color = (mejorSiMenor ? diff < 0 : diff > 0) ? '\x1b[32m' : '\x1b[31m';
    return `  ${color}${signo}${diff.toFixed(1)}\x1b[0m`;
  };

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    KPIs DEL SISTEMA                        ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Ventana de captura (mediana): ${kpis.ventanaCapturaMediana.toFixed(1)} días${delta(kpis.ventanaCapturaMediana, base?.ventanaCapturaMediana ?? kpis.ventanaCapturaMediana)}`);
  console.log(`║  Ventana de captura (media):   ${kpis.ventanaCapturaMedia.toFixed(1)} días${delta(kpis.ventanaCapturaMedia, base?.ventanaCapturaMedia ?? kpis.ventanaCapturaMedia)}`);
  console.log(`║  Quejas:                       ${kpis.quejas}${delta(kpis.quejas, base?.quejas ?? kpis.quejas)}`);
  console.log(`║  Conversión:                   ${kpis.conversion.toFixed(1)}%${delta(kpis.conversion, base?.conversion ?? kpis.conversion, false)}`);
  console.log(`║  Atorados:                     ${kpis.atorados} (${kpis.atoradosPct}%)${delta(kpis.atorados, base?.atorados ?? kpis.atorados)}`);
  console.log(`║  Trabajo perdido (días):       ${kpis.trabajoPerdidoDias.toLocaleString('es-MX')}${delta(kpis.trabajoPerdidoDias, base?.trabajoPerdidoDias ?? kpis.trabajoPerdidoDias)}`);
  console.log('║  ─────────── Errores ───────────');
  console.log(`║  Error de captura:             ${kpis.erroresCaptura}${delta(kpis.erroresCaptura, base?.erroresCaptura ?? kpis.erroresCaptura)}`);
  console.log(`║  Incompletos:                  ${kpis.incompletos}${delta(kpis.incompletos, base?.incompletos ?? kpis.incompletos)}`);
  console.log(`║  Ilegibles:                    ${kpis.ilegibles}${delta(kpis.ilegibles, base?.ilegibles ?? kpis.ilegibles)}`);
  console.log(`║  Total errores:                ${kpis.erroresTotales}${delta(kpis.erroresTotales, base?.erroresTotales ?? kpis.erroresTotales)}`);
  console.log('║  ─────────── Back office ───────────');
  console.log(`║  Back office (mediana):        ${kpis.backofficeMediana} días${delta(kpis.backofficeMediana, base?.backofficeMediana ?? kpis.backofficeMediana)}`);
  console.log(`║  Costo operativo:              ${kpis.costoOperativo}${delta(kpis.costoOperativo, base?.costoOperativo ?? kpis.costoOperativo)}`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
}

function imprimirEstado(): void {
  console.log(`\n══════ Trimestre ${estado.trimestre} ══════`);
  console.log(`Presupuesto restante: ${estado.presupuesto}/${config.equipo.presupuesto}`);
  console.log(`Créditos de indagación: ${estado.creditosIndagacion}/${config.equipo.creditos_indagacion}`);

  if (estado.eventosActivos.length > 0) {
    console.log('\nEventos activos:');
    for (const ev of estado.eventosActivos) {
      console.log(`  ⚡ ${ev.nombre} (${ev.trimestresFaltantes} trimestre(s) restante(s))`);
    }
  }

  if (estado.intervenciones.length > 0) {
    console.log('\nIntervenciones aplicadas:');
    for (const interv of estado.intervenciones) {
      const cfg = config.intervenciones.find(i => i.id === interv.id);
      const activa = cfg && estado.trimestre >= interv.trimestre + cfg.retraso_trimestres;
      console.log(`  ${activa ? '✓' : '⏳'} ${interv.nombre} (T${interv.trimestre})${interv.sucursalesNombradas ? ` [Sucs: ${interv.sucursalesNombradas.join(', ')}]` : ''}`);
    }
  }

  if (estado.penalizaciones.length > 0) {
    console.log('\n⚠ Penalizaciones:');
    for (const p of estado.penalizaciones) {
      console.log(`  ${p.descripcion} (${p.puntos} pts)`);
    }
  }

  imprimirKPIs(estado.kpis, estado.kpisBase);
}

async function menuIntervenciones(): Promise<void> {
  const lista = listarIntervencionesDisponibles(estado, config);
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║              CATÁLOGO DE INTERVENCIONES                    ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  for (const item of lista) {
    const marca = item.disponible ? ' ' : '✗';
    const razon = item.razon ? ` (${item.razon})` : '';
    console.log(`║ [${marca}] ${item.id.toString().padEnd(2)} ${item.nombre.padEnd(45)} $${item.costo}${razon}`);
  }
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const respuesta = await preguntar('\nNúmero de intervención (0 para cancelar): ');
  const id = parseInt(respuesta, 10);
  if (id === 0 || isNaN(id)) return;

  const cfgInterv = config.intervenciones.find(i => i.id === id);
  if (!cfgInterv) {
    console.log('Intervención no válida.');
    return;
  }

  let sucursales: number[] | undefined;
  if (cfgInterv.requiere_sucursales) {
    const resp = await preguntar('Sucursales a nombrar (separadas por coma): ');
    sucursales = resp.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    if (sucursales.length === 0) {
      console.log('Debes nombrar al menos una sucursal.');
      return;
    }
  }

  const resultado = aplicarIntervencion(estado, id, config, sucursales);
  console.log(resultado.exito ? `\n✓ ${resultado.mensaje}` : `\n✗ ${resultado.mensaje}`);
}

async function menuPrincipal(): Promise<void> {
  console.log('\n' + '─'.repeat(50));
  console.log('  1. Ver KPIs actuales');
  console.log('  2. Aplicar intervención');
  console.log('  3. Avanzar al siguiente trimestre');
  console.log('  4. Finalizar y ver puntuación');
  console.log('  5. Salir');

  const opcion = await preguntar('\nOpción: ');

  switch (opcion.trim()) {
    case '1':
      imprimirEstado();
      break;
    case '2':
      await menuIntervenciones();
      break;
    case '3':
      if (estado.trimestre >= 3) {
        console.log('\nYa estás en el trimestre 3. Usa opción 4 para finalizar.');
      } else {
        estado = avanzarTrimestre(estado, config);
        console.log(`\n════ Avanzando al trimestre ${estado.trimestre} ════`);
        imprimirEstado();
      }
      break;
    case '4':
      await finalizarPartida();
      break;
    case '5':
      rl.close();
      process.exit(0);
    default:
      console.log('Opción no válida.');
  }
}

async function finalizarPartida(): Promise<void> {
  while (estado.trimestre < 3) {
    estado = avanzarTrimestre(estado, config);
  }

  console.log('\n══════════════════════════════════════════════════════');
  console.log('          DIAGNÓSTICO FINAL');
  console.log('══════════════════════════════════════════════════════');

  const diagnostico = crearDiagnosticoVacio();

  const r1 = await preguntar('¿La ventana de captura en sucursal es el cuello de botella? (s/n): ');
  diagnostico.ventanaCapturaEsCuello = r1.toLowerCase().startsWith('s');

  const r2 = await preguntar('¿El reproceso documental es el mecanismo principal? (s/n): ');
  diagnostico.reprocesoEsMecanismo = r2.toLowerCase().startsWith('s');

  const r3 = await preguntar('¿Identificas la fuga de aprobados sin plástico? (s/n): ');
  diagnostico.fugaPlastico = r3.toLowerCase().startsWith('s');

  const r4 = await preguntar('¿Identificas el trabajo perdido por secuencia del buró? (s/n): ');
  diagnostico.trabajoPerdidoBuro = r4.toLowerCase().startsWith('s');

  const r5 = await preguntar('¿Causas espurias declaradas? (separadas por coma, o vacío): ');
  if (r5.trim()) {
    diagnostico.causasEspurias = r5.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  const r6 = await preguntar('Minuto de declaración del diagnóstico (25-45): ');
  diagnostico.minutoDeclaracion = Math.min(45, Math.max(25, parseInt(r6, 10) || 45));

  const rigor = crearRigorVacio();
  console.log('\n── Rigor del método ──');

  const m1 = await preguntar('¿Usaron Pareto con estratificación correcta? (s/n): ');
  rigor.paretoEstratificacion = m1.toLowerCase().startsWith('s');

  const m2 = await preguntar('¿Dispersión con interpretación válida? (s/n): ');
  rigor.dispersionInterpretacion = m2.toLowerCase().startsWith('s');

  const m3 = await preguntar('¿Análisis del embudo por etapas? (s/n): ');
  rigor.embudoEtapas = m3.toLowerCase().startsWith('s');

  const m4 = await preguntar('¿Hipótesis escrita antes de cada consulta? (s/n): ');
  rigor.hipotesisEscrita = m4.toLowerCase().startsWith('s');

  const m5 = await preguntar('¿Cruzaron comentarios con la base cuantitativa? (s/n): ');
  rigor.cruzoComentariosBase = m5.toLowerCase().startsWith('s');

  const resultado = calcularPuntuacion(estado, diagnostico, rigor, config);

  console.log('\n══════════════════════════════════════════════════════');
  console.log('          RESULTADO FINAL');
  console.log('══════════════════════════════════════════════════════');

  const finalInfo = FINALES[resultado.final as keyof typeof FINALES];

  console.log(`\n  Final: ${resultado.final}. ${finalInfo.nombre}`);
  console.log(`  Puntaje total: ${resultado.total}/1000`);

  console.log('\n  ── Desglose ──');
  console.log(`  Diagnóstico causal:    ${resultado.diagnostico}/350`);
  console.log(`  Rigor del método:      ${resultado.rigor}/200`);
  console.log(`  Impacto en negocio:    ${resultado.impacto}/300`);
  console.log(`  Velocidad:             ${resultado.velocidad}/100`);
  console.log(`  Eficiencia:            ${resultado.eficiencia}/50`);
  if (resultado.penalizaciones < 0) {
    console.log(`  Penalizaciones:        ${resultado.penalizaciones}`);
  }

  console.log('\n  ── Detalle ──');
  for (const [k, v] of Object.entries(resultado.desglose)) {
    if (v !== 0) {
      console.log(`    ${k.replace(/_/g, ' ')}: ${v}`);
    }
  }

  imprimirKPIs(estado.kpis, estado.kpisBase);

  console.log('\n  ── Trayectoria de KPIs ──');
  console.log('  Trim  Captura(med)  Quejas  Conv.  Errores');
  for (let t = 0; t < estado.historialKPIs.length; t++) {
    const k = estado.historialKPIs[t];
    console.log(`    ${t}      ${k.ventanaCapturaMediana.toFixed(1).padStart(5)}      ${String(k.quejas).padStart(4)}   ${k.conversion.toFixed(1).padStart(5)}%    ${String(k.erroresTotales).padStart(5)}`);
  }

  rl.close();
}

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   SIMULADOR DE ANÁLISIS CAUSAL — ETF Bank                  ║');
  console.log('║   Arnés interactivo de motor                               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\nLínea base:');
  imprimirEstado();

  while (true) {
    await menuPrincipal();
  }
}

main().catch(console.error);
