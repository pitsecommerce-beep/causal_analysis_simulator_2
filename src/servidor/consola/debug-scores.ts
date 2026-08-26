import { cargarConfig, crearEstadoInicial, avanzarTrimestre } from '../motor/dag.js';
import { aplicarIntervencion } from '../motor/intervenciones.js';
import { calcularPuntuacion } from '../puntuacion/reglas.js';
import type { DiagnosticoEquipo, RigorMetodo } from '../motor/tipos.js';

const config = cargarConfig();

function diagPerfecto(): DiagnosticoEquipo {
  return { ventanaCapturaEsCuello: true, reprocesoEsMecanismo: true, fugaPlastico: true, trabajoPerdidoBuro: true, causasEspurias: [], concentracionSinMasa: false, minutoDeclaracion: 25 };
}
function rigorPerfecto(): RigorMetodo {
  return { paretoEstratificacion: true, dispersionInterpretacion: true, embudoEtapas: true, hipotesisEscrita: true, cruzoComentariosBase: true };
}

// A: Optimal combo
let estado = crearEstadoInicial(config);
aplicarIntervencion(estado, 1, config);
aplicarIntervencion(estado, 4, config);
aplicarIntervencion(estado, 5, config);
estado = avanzarTrimestre(estado, config);
estado = avanzarTrimestre(estado, config);
estado = avanzarTrimestre(estado, config);

console.log('=== A. Reconversión ===');
console.log('KPIs finales:', JSON.stringify(estado.kpis, null, 2));
console.log('Presupuesto:', estado.presupuesto);
console.log('Penalizaciones:', estado.penalizaciones);
const resA = calcularPuntuacion(estado, diagPerfecto(), rigorPerfecto(), config);
console.log('Resultado:', JSON.stringify(resA, null, 2));

// D: Endurecer score
estado = crearEstadoInicial(config);
aplicarIntervencion(estado, 8, config);
estado = avanzarTrimestre(estado, config);
estado = avanzarTrimestre(estado, config);
estado = avanzarTrimestre(estado, config);

console.log('\n=== D. Métrica traicionera ===');
console.log('KPIs finales:', JSON.stringify(estado.kpis, null, 2));
console.log('Penalizaciones:', estado.penalizaciones);
const diagD: DiagnosticoEquipo = { ventanaCapturaEsCuello: false, reprocesoEsMecanismo: false, fugaPlastico: false, trabajoPerdidoBuro: false, causasEspurias: [], concentracionSinMasa: false, minutoDeclaracion: 35 };
const resD = calcularPuntuacion(estado, diagD, { paretoEstratificacion: false, dispersionInterpretacion: false, embudoEtapas: false, hipotesisEscrita: false, cruzoComentariosBase: false }, config);
console.log('Resultado:', JSON.stringify(resD, null, 2));

// E: Bono
estado = crearEstadoInicial(config);
aplicarIntervencion(estado, 9, config);
estado = avanzarTrimestre(estado, config);
estado = avanzarTrimestre(estado, config);
estado = avanzarTrimestre(estado, config);

console.log('\n=== E. Incentivo perverso ===');
console.log('KPIs finales:', JSON.stringify(estado.kpis, null, 2));
console.log('Penalizaciones:', estado.penalizaciones);
const resE = calcularPuntuacion(estado, diagD, { paretoEstratificacion: false, dispersionInterpretacion: false, embudoEtapas: false, hipotesisEscrita: false, cruzoComentariosBase: false }, config);
console.log('Resultado:', JSON.stringify(resE, null, 2));
