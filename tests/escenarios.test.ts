import { describe, it, expect } from 'vitest';
import { cargarConfig, crearEstadoInicial, avanzarTrimestre } from '../src/servidor/motor/dag.js';
import { aplicarIntervencion } from '../src/servidor/motor/intervenciones.js';
import { calcularPuntuacion } from '../src/servidor/puntuacion/reglas.js';
import type { DiagnosticoEquipo, RigorMetodo } from '../src/servidor/motor/tipos.js';
import { FINALES } from '../src/servidor/motor/tipos.js';

const config = cargarConfig();

function simular3Trimestres(intervencionIds: number[], sucursales?: Record<number, number[]>) {
  let estado = crearEstadoInicial(config);
  for (const id of intervencionIds) {
    aplicarIntervencion(estado, id, config, sucursales?.[id]);
  }
  estado = avanzarTrimestre(estado, config);
  estado = avanzarTrimestre(estado, config);
  estado = avanzarTrimestre(estado, config);
  return estado;
}

describe('Escenarios de desenlace', () => {
  it('A. Reconversión: Checklist + resecuenciar buró + automatizar plástico', () => {
    const estado = simular3Trimestres([1, 4, 5]);
    const diag: DiagnosticoEquipo = {
      ventanaCapturaEsCuello: true, reprocesoEsMecanismo: true,
      fugaPlastico: true, trabajoPerdidoBuro: true,
      causasEspurias: [], concentracionSinMasa: false, minutoDeclaracion: 25,
    };
    const rigor: RigorMetodo = {
      paretoEstratificacion: true, dispersionInterpretacion: true,
      embudoEtapas: true, hipotesisEscrita: true, cruzoComentariosBase: true,
    };
    const res = calcularPuntuacion(estado, diag, rigor, config);
    expect(res.final).toBe('A');
    expect(res.total).toBeGreaterThanOrEqual(900);
    expect(res.total).toBeLessThanOrEqual(1000);
  });

  it('B. Buen proyecto incompleto: Checklist + capacitación focalizada', () => {
    const estado = simular3Trimestres([1, 2], { 2: [110, 676, 728] });
    const diag: DiagnosticoEquipo = {
      ventanaCapturaEsCuello: true, reprocesoEsMecanismo: true,
      fugaPlastico: false, trabajoPerdidoBuro: false,
      causasEspurias: [], concentracionSinMasa: false, minutoDeclaracion: 32,
    };
    const rigor: RigorMetodo = {
      paretoEstratificacion: true, dispersionInterpretacion: true,
      embudoEtapas: false, hipotesisEscrita: true, cruzoComentariosBase: true,
    };
    const res = calcularPuntuacion(estado, diag, rigor, config);
    expect(res.final).toBe('B');
    expect(res.total).toBeGreaterThanOrEqual(700);
    expect(res.total).toBeLessThanOrEqual(899);
  });

  it('C. Ataque al mediador: reforzar CrOP', () => {
    const estado = simular3Trimestres([6]);
    const diag: DiagnosticoEquipo = {
      ventanaCapturaEsCuello: true, reprocesoEsMecanismo: false,
      fugaPlastico: false, trabajoPerdidoBuro: false,
      causasEspurias: [], concentracionSinMasa: false, minutoDeclaracion: 32,
    };
    const rigor: RigorMetodo = {
      paretoEstratificacion: true, dispersionInterpretacion: true,
      embudoEtapas: true, hipotesisEscrita: true, cruzoComentariosBase: false,
    };
    const res = calcularPuntuacion(estado, diag, rigor, config);
    expect(res.final).toBe('C');
    expect(res.total).toBeGreaterThanOrEqual(450);
    expect(res.total).toBeLessThanOrEqual(649);
  });

  it('D. La métrica traicionera: endurecer score interno', () => {
    const estado = simular3Trimestres([8]);
    const diag: DiagnosticoEquipo = {
      ventanaCapturaEsCuello: true, reprocesoEsMecanismo: true,
      fugaPlastico: false, trabajoPerdidoBuro: false,
      causasEspurias: [], concentracionSinMasa: false, minutoDeclaracion: 35,
    };
    const rigor: RigorMetodo = {
      paretoEstratificacion: true, dispersionInterpretacion: true,
      embudoEtapas: false, hipotesisEscrita: false, cruzoComentariosBase: false,
    };
    const res = calcularPuntuacion(estado, diag, rigor, config);
    expect(res.final).toBe('D');
    expect(res.total).toBeGreaterThanOrEqual(300);
    expect(res.total).toBeLessThanOrEqual(449);
  });

  it('E. El incentivo perverso: bono por velocidad', () => {
    const estado = simular3Trimestres([9]);
    const diag: DiagnosticoEquipo = {
      ventanaCapturaEsCuello: true, reprocesoEsMecanismo: true,
      fugaPlastico: false, trabajoPerdidoBuro: false,
      causasEspurias: [], concentracionSinMasa: false, minutoDeclaracion: 33,
    };
    const rigor: RigorMetodo = {
      paretoEstratificacion: true, dispersionInterpretacion: false,
      embudoEtapas: false, hipotesisEscrita: true, cruzoComentariosBase: false,
    };
    const res = calcularPuntuacion(estado, diag, rigor, config);
    expect(res.final).toBe('E');
    expect(res.total).toBeGreaterThanOrEqual(250);
    expect(res.total).toBeLessThanOrEqual(449);
  });

  it('F. Dispersión: capacitación masiva', () => {
    const estado = simular3Trimestres([3]);
    const diag: DiagnosticoEquipo = {
      ventanaCapturaEsCuello: false, reprocesoEsMecanismo: false,
      fugaPlastico: false, trabajoPerdidoBuro: false,
      causasEspurias: ['capacitacion'], concentracionSinMasa: false, minutoDeclaracion: 42,
    };
    const rigor: RigorMetodo = {
      paretoEstratificacion: true, dispersionInterpretacion: false,
      embudoEtapas: false, hipotesisEscrita: false, cruzoComentariosBase: false,
    };
    const res = calcularPuntuacion(estado, diag, rigor, config);
    expect(res.final).toBe('F');
    expect(res.total).toBeGreaterThanOrEqual(150);
    expect(res.total).toBeLessThanOrEqual(349);
  });

  it('G. Parálisis por análisis: no intervinieron', () => {
    const estado = simular3Trimestres([]);
    const diag: DiagnosticoEquipo = {
      ventanaCapturaEsCuello: false, reprocesoEsMecanismo: false,
      fugaPlastico: false, trabajoPerdidoBuro: false,
      causasEspurias: [], concentracionSinMasa: false, minutoDeclaracion: 45,
    };
    const rigor: RigorMetodo = {
      paretoEstratificacion: false, dispersionInterpretacion: false,
      embudoEtapas: false, hipotesisEscrita: false, cruzoComentariosBase: false,
    };
    const res = calcularPuntuacion(estado, diag, rigor, config);
    expect(res.final).toBe('G');
    expect(res.total).toBeGreaterThanOrEqual(100);
    expect(res.total).toBeLessThanOrEqual(299);
  });

  it('H. Falso positivo: intervinieron sobre trampa (segmentar por perfil)', () => {
    const estado = simular3Trimestres([7]);
    const diag: DiagnosticoEquipo = {
      ventanaCapturaEsCuello: false, reprocesoEsMecanismo: false,
      fugaPlastico: false, trabajoPerdidoBuro: false,
      causasEspurias: ['edad', 'score_buro'],
      concentracionSinMasa: false, minutoDeclaracion: 40,
    };
    const rigor: RigorMetodo = {
      paretoEstratificacion: false, dispersionInterpretacion: true,
      embudoEtapas: false, hipotesisEscrita: false, cruzoComentariosBase: false,
    };
    const res = calcularPuntuacion(estado, diag, rigor, config);
    expect(res.final).toBe('H');
  });
});
