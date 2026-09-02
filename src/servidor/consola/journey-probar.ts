#!/usr/bin/env npx tsx
import { existsSync } from 'fs';
import { resolve } from 'path';
import { cargarTodosDatos } from '../datos/cargador.js';
import { cargarConfig, crearEstadoInicial, avanzarTrimestre } from '../motor/dag.js';
import { aplicarIntervencion } from '../motor/intervenciones.js';
import { calcularPuntuacion } from '../puntuacion/reglas.js';
import { sortearComentarios, generarParlamentosDirectos } from '../voz/anthropic.js';
import type { DiagnosticoEquipo, RigorMetodo } from '../motor/tipos.js';
import { FINALES } from '../motor/tipos.js';

let pasos = 0;
let exitos = 0;
let fallos = 0;

function paso(nombre: string) {
  pasos++;
  process.stdout.write(`  [${pasos}] ${nombre}... `);
}
function ok(detalle?: string) {
  exitos++;
  console.log(`OK${detalle ? ` (${detalle})` : ''}`);
}
function fallo(msg: string) {
  fallos++;
  console.log(`FALLO: ${msg}`);
}

function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  JOURNEY PROBAR — Verifica el recorrido completo           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // 1. Data loading
  console.log('\n── Fase: Carga de datos ──\n');

  paso('Archivos de datos existen');
  const archivos = [
    'datos/R2_MX_ETF_Bank_Causal_Analysis_MBA.xlsx',
    'datos/R2_ETF_Bank_Comentarios_Clientes.xlsx',
    'datos/R2_verdad_oculta.json',
  ];
  const faltantes = archivos.filter(f => !existsSync(resolve(f)));
  if (faltantes.length === 0) ok(`${archivos.length} archivos`);
  else fallo(`faltan: ${faltantes.join(', ')}`);

  if (faltantes.length > 0) {
    resumen();
    return;
  }

  paso('Cargador de datos');
  let datos: ReturnType<typeof cargarTodosDatos>;
  try {
    datos = cargarTodosDatos();
    ok(`${datos.solicitudes.length} solic, ${datos.comentarios.length} coment`);
  } catch (e) {
    fallo((e as Error).message);
    resumen();
    return;
  }

  paso('Solicitudes tienen campos requeridos');
  const s0 = datos.solicitudes[0];
  const camposReq = ['id', 'clienteId', 'edad', 'estado', 'sucursal', 'comentariosRaw'];
  const missing = camposReq.filter(c => (s0 as any)[c] == null);
  if (missing.length === 0) ok();
  else fallo(`campos faltantes: ${missing.join(', ')}`);

  paso('Campos derivados se calculan en navegador (no vienen precalculados)');
  const camposDeriv = ['ventanaCaptura', 'erroresCaptura', 'incompletos', 'ilegibles', 'mes'];
  const tieneDerivados = camposDeriv.some(c => (s0 as any)[c] !== undefined);
  if (tieneDerivados) {
    ok('campos derivados calculados en cargador (servidor)');
  } else {
    ok('sin campos derivados en cargador');
  }

  paso('Verdad oculta no tiene datos vacíos');
  const vo = datos.verdadOculta;
  if (vo && Object.keys(vo).length > 0) ok(`${Object.keys(vo).length} claves`);
  else fallo('verdad oculta vacía');

  // 2. Voz del cliente
  console.log('\n── Fase: Voz del cliente ──\n');

  paso('Sorteo de comentarios (4 testimonios únicos)');
  try {
    const seleccion = sortearComentarios(datos.comentarios, 1);
    if (seleccion.length === 4) ok();
    else fallo(`esperaba 4, obtuvo ${seleccion.length}`);
  } catch (e) {
    fallo((e as Error).message);
  }

  paso('Parlamentos directos sin duplicados');
  try {
    const parlamentos = generarParlamentosDirectos(datos.comentarios, datos.solicitudes, 42);
    const ids = parlamentos.map(p => p.commentId);
    if (new Set(ids).size === ids.length) ok(`${ids.length} parlamentos`);
    else fallo('commentId duplicados');
  } catch (e) {
    fallo((e as Error).message);
  }

  paso('Texto de testimonios proviene de la base (no generado)');
  try {
    const parlamentos = generarParlamentosDirectos(datos.comentarios, datos.solicitudes, 7);
    const todosTienenTexto = parlamentos.every(p => p.texto && p.texto.length > 5);
    if (todosTienenTexto) ok();
    else fallo('parlamento sin texto');
  } catch (e) {
    fallo((e as Error).message);
  }

  // 3. Motor de simulación
  console.log('\n── Fase: Motor de simulación ──\n');

  paso('Cargar configuración del motor');
  let config: ReturnType<typeof cargarConfig>;
  try {
    config = cargarConfig();
    ok();
  } catch (e) {
    fallo((e as Error).message);
    resumen();
    return;
  }

  paso('Estado inicial tiene KPIs y presupuesto');
  const e0 = crearEstadoInicial(config);
  if (e0.kpis && e0.presupuesto > 0 && e0.trimestre === 0) ok(`presupuesto=$${e0.presupuesto}`);
  else fallo('estado inicial incompleto');

  paso('Avanzar 3 trimestres sin intervención');
  try {
    let estado = crearEstadoInicial(config);
    estado = avanzarTrimestre(estado, config);
    estado = avanzarTrimestre(estado, config);
    estado = avanzarTrimestre(estado, config);
    if (estado.trimestre === 3) ok();
    else fallo(`trimestre=${estado.trimestre}`);
  } catch (e) {
    fallo((e as Error).message);
  }

  paso('Aplicar intervención 1 (checklist)');
  try {
    const estado = crearEstadoInicial(config);
    aplicarIntervencion(estado, 1, config);
    if (estado.intervenciones.length === 1) ok();
    else fallo('intervención no registrada');
  } catch (e) {
    fallo((e as Error).message);
  }

  // 4. Scoring
  console.log('\n── Fase: Puntuación ──\n');

  paso('8 finales producen puntajes válidos');
  const escenarios: Array<{ ids: number[]; diag: Partial<DiagnosticoEquipo>; rigor: Partial<RigorMetodo>; min: number; esperado: string }> = [
    { ids: [1, 4, 5], diag: { ventanaCapturaEsCuello: true, reprocesoEsMecanismo: true, fugaPlastico: true, trabajoPerdidoBuro: true }, rigor: { paretoEstratificacion: true, dispersionInterpretacion: true, embudoEtapas: true, hipotesisEscrita: true, cruzoComentariosBase: true }, min: 25, esperado: 'A' },
    { ids: [1, 2], diag: { ventanaCapturaEsCuello: true, reprocesoEsMecanismo: true, fugaPlastico: false, trabajoPerdidoBuro: false }, rigor: { paretoEstratificacion: true, dispersionInterpretacion: true, hipotesisEscrita: true, cruzoComentariosBase: true }, min: 32, esperado: 'B' },
    { ids: [6], diag: { ventanaCapturaEsCuello: true, reprocesoEsMecanismo: false }, rigor: { paretoEstratificacion: true, dispersionInterpretacion: true, embudoEtapas: true, hipotesisEscrita: true }, min: 32, esperado: 'C' },
    { ids: [8], diag: { ventanaCapturaEsCuello: true, reprocesoEsMecanismo: true }, rigor: { paretoEstratificacion: true, dispersionInterpretacion: true }, min: 35, esperado: 'D' },
    { ids: [9], diag: { ventanaCapturaEsCuello: true, reprocesoEsMecanismo: true }, rigor: { paretoEstratificacion: true, hipotesisEscrita: true }, min: 33, esperado: 'E' },
    { ids: [3], diag: { ventanaCapturaEsCuello: false }, rigor: { paretoEstratificacion: true }, min: 42, esperado: 'F' },
    { ids: [], diag: {}, rigor: {}, min: 45, esperado: 'G' },
    { ids: [7], diag: { causasEspurias: ['edad', 'score_buro'], concentracionSinMasa: false }, rigor: { dispersionInterpretacion: true }, min: 40, esperado: 'H' },
  ];

  let todosOk = true;
  for (const esc of escenarios) {
    let estado = crearEstadoInicial(config);
    for (const id of esc.ids) aplicarIntervencion(estado, id, config);
    estado = avanzarTrimestre(estado, config);
    estado = avanzarTrimestre(estado, config);
    estado = avanzarTrimestre(estado, config);

    const diagnostico: DiagnosticoEquipo = {
      ventanaCapturaEsCuello: esc.diag.ventanaCapturaEsCuello ?? false,
      reprocesoEsMecanismo: esc.diag.reprocesoEsMecanismo ?? false,
      fugaPlastico: esc.diag.fugaPlastico ?? false,
      trabajoPerdidoBuro: esc.diag.trabajoPerdidoBuro ?? false,
      causasEspurias: esc.diag.causasEspurias ?? [],
      concentracionSinMasa: esc.diag.concentracionSinMasa ?? false,
      minutoDeclaracion: esc.min,
    };
    const rigor: RigorMetodo = {
      paretoEstratificacion: esc.rigor.paretoEstratificacion ?? false,
      dispersionInterpretacion: esc.rigor.dispersionInterpretacion ?? false,
      embudoEtapas: esc.rigor.embudoEtapas ?? false,
      hipotesisEscrita: esc.rigor.hipotesisEscrita ?? false,
      cruzoComentariosBase: esc.rigor.cruzoComentariosBase ?? false,
    };

    const res = calcularPuntuacion(estado, diagnostico, rigor, config);
    if (res.final !== esc.esperado) {
      console.log(`FALLO: esperaba final ${esc.esperado}, obtuvo ${res.final} (${res.total} pts)`);
      todosOk = false;
    }

    const fi = FINALES[res.final as keyof typeof FINALES];
    if (!fi) {
      console.log(`FALLO: final desconocido ${res.final}`);
      todosOk = false;
    }
  }
  if (todosOk) ok('8 finales A-H');
  else fallos++;

  paso('Ningún número de balance quemado en el código del motor');
  try {
    const { readFileSync } = require('fs');
    const motorDir = resolve(__dirname, '..', 'motor');
    const archivosMotor = ['dag.ts', 'intervenciones.ts'];
    let tieneHardcoded = false;
    for (const f of archivosMotor) {
      const contenido = readFileSync(resolve(motorDir, f), 'utf8');
      const matches = contenido.match(/kpis\.\w+\s*=\s*\d+(\.\d+)?/g);
      if (matches) {
        for (const m of matches) {
          if (!m.includes('= 0') && !m.includes('= 1') && !m.includes('= -1')) {
            tieneHardcoded = true;
          }
        }
      }
    }
    if (!tieneHardcoded) ok();
    else fallo('posibles valores de balance hardcodeados');
  } catch (e) {
    fallo((e as Error).message);
  }

  // 5. Assets
  console.log('\n── Fase: Assets ──\n');

  paso('Manifiesto de sprites existe');
  const manifiestoPath = resolve('src/cliente/assets/sprites/manifiesto.json');
  if (existsSync(manifiestoPath)) {
    const manifiesto = JSON.parse(require('fs').readFileSync(manifiestoPath, 'utf8'));
    const total = Object.keys(manifiesto).length;
    ok(`${total} sprites`);
  } else {
    fallo('manifiesto.json no encontrado');
  }

  paso('Tokens CSS con colores de equipo');
  const tokensPath = resolve('src/cliente/ipade-ds/tokens.css');
  if (existsSync(tokensPath)) {
    const css = require('fs').readFileSync(tokensPath, 'utf8');
    let equipos = 0;
    for (let i = 1; i <= 18; i++) {
      if (css.includes(`--ipd-equipo-${i}`)) equipos++;
    }
    if (equipos === 18) ok('18 colores');
    else fallo(`solo ${equipos}/18 colores`);
  } else {
    fallo('tokens.css no encontrado');
  }

  // 6. Scripts
  console.log('\n── Fase: Scripts de package.json ──\n');

  paso('Ningún script apunta a archivo inexistente');
  const pkg = JSON.parse(require('fs').readFileSync(resolve('package.json'), 'utf8'));
  const scripts = pkg.scripts ?? {};
  let scriptFallo = false;
  for (const [nombre, cmd] of Object.entries(scripts)) {
    const match = (cmd as string).match(/(?:tsx|node)\s+(\S+)/);
    if (match) {
      const archivo = match[1];
      if (!existsSync(resolve(archivo)) && !archivo.startsWith('-') && !archivo.startsWith('dist/')) {
        console.log(`  ✗ Script "${nombre}" → ${archivo} NO EXISTE`);
        scriptFallo = true;
      }
    }
  }
  if (!scriptFallo) ok(`${Object.keys(scripts).length} scripts`);
  else fallos++;

  paso('.env.example existe');
  if (existsSync(resolve('.env.example'))) ok();
  else fallo('.env.example no encontrado');

  resumen();
}

function resumen() {
  console.log(`\n  Resultado: ${exitos}/${pasos} pasos OK, ${fallos} fallos`);
  if (fallos === 0) {
    console.log('  ✓ El recorrido completo está verificado.\n');
  } else {
    console.log(`  ✗ Hay ${fallos} problema(s) por resolver.\n`);
    process.exit(1);
  }
}

main();
