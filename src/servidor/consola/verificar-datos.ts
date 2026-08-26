import { cargarTodosDatos } from '../datos/cargador.js';
import { calcularEstadisticas } from '../datos/derivados.js';

const { solicitudes, comentarios } = cargarTodosDatos('datos');
const stats = calcularEstadisticas(solicitudes);

interface Verificacion {
  medida: string;
  esperado: string;
  obtenido: string;
  ok: boolean;
}

const verificaciones: Verificacion[] = [
  {
    medida: 'Filas',
    esperado: '1,500',
    obtenido: stats.filas.toLocaleString('es-MX'),
    ok: stats.filas === 1500,
  },
  {
    medida: 'Sucursales',
    esperado: '18',
    obtenido: String(stats.sucursales),
    ok: stats.sucursales === 18,
  },
  {
    medida: 'Estados',
    esperado: '8',
    obtenido: String(stats.estados),
    ok: stats.estados === 8,
  },
  {
    medida: 'Meses distintos',
    esperado: '18',
    obtenido: String(stats.mesesDistintos),
    ok: stats.mesesDistintos === 18,
  },
  {
    medida: 'Errores totales',
    esperado: '1,318',
    obtenido: stats.erroresTotales.toLocaleString('es-MX'),
    ok: stats.erroresTotales === 1318,
  },
  {
    medida: 'Errores de captura',
    esperado: '659',
    obtenido: String(stats.erroresCaptura),
    ok: stats.erroresCaptura === 659,
  },
  {
    medida: 'Documentos incompletos',
    esperado: '472',
    obtenido: String(stats.documentosIncompletos),
    ok: stats.documentosIncompletos === 472,
  },
  {
    medida: 'Documentos ilegibles',
    esperado: '187',
    obtenido: String(stats.documentosIlegibles),
    ok: stats.documentosIlegibles === 187,
  },
  {
    medida: 'Casos con al menos un error',
    esperado: '897',
    obtenido: String(stats.casosConError),
    ok: stats.casosConError === 897,
  },
  {
    medida: 'Intentos, media',
    esperado: '1.96',
    obtenido: String(stats.intentosMedia),
    ok: stats.intentosMedia === 1.96,
  },
  {
    medida: 'Intentos, desviación',
    esperado: '0.89',
    obtenido: String(stats.intentosDesviacion),
    ok: Math.abs(stats.intentosDesviacion - 0.89) < 0.01,
  },
  {
    medida: 'Ventana captura, media',
    esperado: '18.9',
    obtenido: String(stats.ventanaCapturaMedia),
    ok: Math.abs(stats.ventanaCapturaMedia - 18.9) < 0.15,
  },
  {
    medida: 'Ventana captura, mediana',
    esperado: '11',
    obtenido: String(stats.ventanaCapturaMediana),
    ok: stats.ventanaCapturaMediana === 11,
  },
  {
    medida: 'Correlación intentos-captura',
    esperado: '0.786',
    obtenido: String(stats.correlacionIntentosCapturaR),
    ok: Math.abs(stats.correlacionIntentosCapturaR - 0.786) < 0.005,
  },
  {
    medida: 'Buró corrido',
    esperado: '1,397',
    obtenido: stats.buroCorrido.toLocaleString('es-MX'),
    ok: stats.buroCorrido === 1397,
  },
  {
    medida: 'Buró aceptado',
    esperado: '1,022',
    obtenido: stats.buroAceptado.toLocaleString('es-MX'),
    ok: stats.buroAceptado === 1022,
  },
  {
    medida: 'Score aceptado',
    esperado: '873',
    obtenido: String(stats.scoreAceptado),
    ok: stats.scoreAceptado === 873,
  },
  {
    medida: 'Plástico enviado',
    esperado: '731',
    obtenido: String(stats.plasticoEnviado),
    ok: stats.plasticoEnviado === 731,
  },
  {
    medida: 'Atorados',
    esperado: '142',
    obtenido: String(stats.atorados),
    ok: stats.atorados === 142,
  },
  {
    medida: 'Días perdidos rechazados buró',
    esperado: '6,758',
    obtenido: stats.diasPerdidosRechazadosBuro.toLocaleString('es-MX'),
    ok: stats.diasPerdidosRechazadosBuro === 6758,
  },
  {
    medida: 'Top 3 sucursales por errores',
    esperado: '110, 676, 728',
    obtenido: stats.top3SucursalesPorErrores.join(', '),
    ok: stats.top3SucursalesPorErrores.join(',') === '110,676,728',
  },
];

const anchoMedida = Math.max(...verificaciones.map(v => v.medida.length)) + 2;
const anchoEsperado = Math.max(...verificaciones.map(v => v.esperado.length)) + 2;
const anchoObtenido = Math.max(...verificaciones.map(v => v.obtenido.length)) + 2;

console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║          VERIFICACIÓN DE CARGA DE DATOS — ETF Bank R2                    ║');
console.log('╠════════════════════════════════════════════════════════════════════════════╣');
console.log(
  '║ ' +
    'Medida'.padEnd(anchoMedida) +
    'Esperado'.padEnd(anchoEsperado) +
    'Obtenido'.padEnd(anchoObtenido) +
    '  ║'
);
console.log('╠════════════════════════════════════════════════════════════════════════════╣');

let todosOk = true;
for (const v of verificaciones) {
  const marca = v.ok ? ' ✓' : ' ✗';
  todosOk = todosOk && v.ok;
  console.log(
    '║ ' +
      v.medida.padEnd(anchoMedida) +
      v.esperado.padEnd(anchoEsperado) +
      v.obtenido.padEnd(anchoObtenido) +
      marca +
      ' ║'
  );
}

console.log('╠════════════════════════════════════════════════════════════════════════════╣');
const okCount = verificaciones.filter(v => v.ok).length;
const resumen = `${okCount}/${verificaciones.length} verificaciones correctas`;
console.log('║ ' + resumen.padEnd(72) + ' ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');

// Invariant check: # of tries = 1 + number of error events
let invarianteOk = 0;
let invarianteFallo = 0;
for (const s of solicitudes) {
  const esperadoIntentos = 1 + s.erroresPorCaso;
  if (s.intentos === esperadoIntentos) {
    invarianteOk++;
  } else {
    invarianteFallo++;
  }
}
console.log(`\nInvariante: # of tries = 1 + errores en Comments`);
console.log(`  Correctos: ${invarianteOk}/${solicitudes.length}`);
if (invarianteFallo > 0) {
  console.log(`  FALLOS: ${invarianteFallo}`);
}

console.log(`\nComentarios de clientes: ${comentarios.length} registros cargados`);

// % errores top 3
console.log(`\n% errores en top 3: ${stats.pctErroresTop3}%`);

if (!todosOk) {
  process.exit(1);
}
