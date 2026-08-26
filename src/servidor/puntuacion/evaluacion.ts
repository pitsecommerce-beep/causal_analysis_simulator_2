import type { DiagnosticoEquipo, RigorMetodo, EstadoMotor, ConfigSimulador, ResultadoPuntuacion } from '../motor/tipos.js';
import { calcularPuntuacion } from './reglas.js';

export function evaluarEquipo(
  estado: EstadoMotor,
  diagnostico: DiagnosticoEquipo,
  rigor: RigorMetodo,
  config: ConfigSimulador,
): ResultadoPuntuacion {
  return calcularPuntuacion(estado, diagnostico, rigor, config);
}

export function crearDiagnosticoVacio(): DiagnosticoEquipo {
  return {
    ventanaCapturaEsCuello: false,
    reprocesoEsMecanismo: false,
    fugaPlastico: false,
    trabajoPerdidoBuro: false,
    causasEspurias: [],
    concentracionSinMasa: false,
    minutoDeclaracion: 45,
  };
}

export function crearRigorVacio(): RigorMetodo {
  return {
    paretoEstratificacion: false,
    dispersionInterpretacion: false,
    embudoEtapas: false,
    hipotesisEscrita: false,
    cruzoComentariosBase: false,
  };
}
