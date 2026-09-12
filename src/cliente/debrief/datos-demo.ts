import type { DatosDebrief, EquipoDebrief, KPIsDebrief, NodoDag, TrampaDebrief } from './tipos';

const NOMBRES_CONSULTORAS = [
  'Apex', 'Bravo', 'Cipher', 'Delta', 'Epsilon',
  'Foxtrot', 'Gamma', 'Helios', 'Ignis', 'Jupiter',
  'Kronos', 'Lumen', 'Magnus', 'Nova', 'Orion',
  'Praxis', 'Quantum',
];

const INTERVENCIONES_NOMBRES: Record<number, string> = {
  1: 'Checklist documental',
  2: 'Capacitacion focalizada',
  3: 'Capacitacion masiva',
  4: 'Consultar buro antes',
  5: 'Automatizar plastico',
  6: 'Dos revisores CrOP',
  7: 'Segmentar por perfil',
  8: 'Endurecer umbral score',
  9: 'Bono por velocidad',
  10: 'Reemplazo CRASS',
};

function kpisBase(): KPIsDebrief {
  return {
    trimestre: 0,
    ventanaCapturaMediana: 11,
    quejas: 100,
    conversion: 100,
    erroresCaptura: 659,
    atoradosPct: 16,
    reproceso: 59.8,
  };
}

function variar(base: number, pct: number): number {
  return Math.round(base * (1 + (Math.random() - 0.5) * 2 * pct));
}

function generarHistorial(intervIds: number[], final: string): KPIsDebrief[] {
  const base = kpisBase();
  const t1 = { ...base, trimestre: 1 };
  const t2: KPIsDebrief = {
    trimestre: 2,
    ventanaCapturaMediana: variar(9, 0.15),
    quejas: variar(85, 0.1),
    conversion: variar(95, 0.05),
    erroresCaptura: variar(500, 0.1),
    atoradosPct: variar(12, 0.15),
    reproceso: variar(45, 0.1),
  };

  let t3 = { ...t2, trimestre: 3 };

  if (final === 'A') {
    t3 = { trimestre: 3, ventanaCapturaMediana: variar(5, 0.1), quejas: variar(55, 0.1), conversion: variar(98, 0.02), erroresCaptura: variar(250, 0.1), atoradosPct: variar(4, 0.2), reproceso: variar(20, 0.15) };
  } else if (final === 'D') {
    t3 = { trimestre: 3, ventanaCapturaMediana: variar(6, 0.1), quejas: variar(70, 0.1), conversion: variar(62, 0.05), erroresCaptura: variar(400, 0.1), atoradosPct: variar(8, 0.15), reproceso: variar(35, 0.1) };
  } else if (final === 'E') {
    t3 = { trimestre: 3, ventanaCapturaMediana: variar(8, 0.1), quejas: variar(118, 0.1), conversion: variar(88, 0.05), erroresCaptura: variar(720, 0.1), atoradosPct: variar(14, 0.15), reproceso: variar(55, 0.1) };
  } else if (final === 'G') {
    t3 = { trimestre: 3, ventanaCapturaMediana: 11, quejas: 100, conversion: 100, erroresCaptura: 659, atoradosPct: 16, reproceso: 59.8 };
  } else if (final === 'H') {
    t3 = { trimestre: 3, ventanaCapturaMediana: variar(10, 0.1), quejas: variar(95, 0.1), conversion: variar(90, 0.05), erroresCaptura: variar(600, 0.1), atoradosPct: variar(14, 0.1), reproceso: variar(52, 0.1) };
  } else {
    t3 = { trimestre: 3, ventanaCapturaMediana: variar(7, 0.15), quejas: variar(72, 0.15), conversion: variar(92, 0.05), erroresCaptura: variar(380, 0.15), atoradosPct: variar(8, 0.15), reproceso: variar(30, 0.15) };
  }

  return [base, t1, t2, t3];
}

interface PerfilEquipo {
  final: string;
  diagScore: number;
  rigorScore: number;
  impactoScore: number;
  total: number;
  intervIds: number[];
  diagFlags: [boolean, boolean, boolean, boolean];
  rigorFlags: [boolean, boolean, boolean, boolean, boolean];
  espurias: string[];
  minutoDiag: number;
  hipotesis: number;
  creditos: number;
}

const PERFILES: PerfilEquipo[] = [
  { final: 'A', diagScore: 350, rigorScore: 200, impactoScore: 280, total: 950, intervIds: [1, 2, 4, 5], diagFlags: [true, true, true, true], rigorFlags: [true, true, true, true, true], espurias: [], minutoDiag: 18, hipotesis: 5, creditos: 8 },
  { final: 'A', diagScore: 340, rigorScore: 160, impactoScore: 270, total: 920, intervIds: [1, 4, 5, 6], diagFlags: [true, true, true, true], rigorFlags: [true, true, true, true, false], espurias: [], minutoDiag: 22, hipotesis: 4, creditos: 7 },
  { final: 'B', diagScore: 290, rigorScore: 160, impactoScore: 220, total: 820, intervIds: [1, 2, 5], diagFlags: [true, true, true, false], rigorFlags: [true, false, true, true, true], espurias: [], minutoDiag: 25, hipotesis: 4, creditos: 6 },
  { final: 'B', diagScore: 250, rigorScore: 120, impactoScore: 200, total: 750, intervIds: [1, 4, 6], diagFlags: [true, true, false, true], rigorFlags: [true, true, true, false, false], espurias: [], minutoDiag: 28, hipotesis: 3, creditos: 7 },
  { final: 'B', diagScore: 220, rigorScore: 120, impactoScore: 240, total: 710, intervIds: [2, 4, 5], diagFlags: [true, true, false, false], rigorFlags: [false, true, true, true, false], espurias: ['Edad'], minutoDiag: 30, hipotesis: 3, creditos: 5 },
  { final: 'C', diagScore: 180, rigorScore: 80, impactoScore: 180, total: 600, intervIds: [1, 6], diagFlags: [true, true, false, false], rigorFlags: [true, false, false, true, false], espurias: ['Score buro'], minutoDiag: 32, hipotesis: 2, creditos: 5 },
  { final: 'C', diagScore: 160, rigorScore: 80, impactoScore: 160, total: 550, intervIds: [6, 5], diagFlags: [true, false, true, false], rigorFlags: [false, true, false, true, false], espurias: ['Anios cliente'], minutoDiag: 35, hipotesis: 2, creditos: 4 },
  { final: 'B', diagScore: 80, rigorScore: 40, impactoScore: 260, total: 480, intervIds: [1, 2, 4, 5], diagFlags: [false, false, true, true], rigorFlags: [false, false, true, false, false], espurias: ['Edad', 'Genero'], minutoDiag: 38, hipotesis: 1, creditos: 3 },
  { final: 'D', diagScore: 120, rigorScore: 80, impactoScore: 100, total: 350, intervIds: [8, 1], diagFlags: [true, false, false, false], rigorFlags: [false, true, false, true, false], espurias: ['Score ETF'], minutoDiag: 30, hipotesis: 2, creditos: 6 },
  { final: 'D', diagScore: 80, rigorScore: 40, impactoScore: 80, total: 300, intervIds: [8, 6], diagFlags: [true, false, false, false], rigorFlags: [false, false, true, false, false], espurias: ['Linea credito', 'Estado civil'], minutoDiag: 34, hipotesis: 1, creditos: 4 },
  { final: 'E', diagScore: 100, rigorScore: 60, impactoScore: 60, total: 280, intervIds: [9, 1], diagFlags: [true, false, false, false], rigorFlags: [false, true, false, false, true], espurias: ['Edad'], minutoDiag: 36, hipotesis: 2, creditos: 5 },
  { final: 'F', diagScore: 60, rigorScore: 40, impactoScore: 40, total: 200, intervIds: [3], diagFlags: [false, false, true, false], rigorFlags: [false, false, false, true, false], espurias: ['Edad', 'Score buro'], minutoDiag: 40, hipotesis: 1, creditos: 2 },
  { final: 'F', diagScore: 40, rigorScore: 40, impactoScore: 60, total: 180, intervIds: [10, 1], diagFlags: [false, false, false, true], rigorFlags: [true, false, false, false, false], espurias: ['Genero', 'Estado civil'], minutoDiag: 42, hipotesis: 1, creditos: 3 },
  { final: 'G', diagScore: 120, rigorScore: 120, impactoScore: 0, total: 260, intervIds: [], diagFlags: [true, false, true, false], rigorFlags: [true, true, false, true, false], espurias: [], minutoDiag: 45, hipotesis: 4, creditos: 10 },
  { final: 'H', diagScore: 30, rigorScore: 20, impactoScore: 80, total: 180, intervIds: [7, 10], diagFlags: [false, false, false, false], rigorFlags: [false, false, false, true, false], espurias: ['Edad', 'Score buro', 'Score ETF'], minutoDiag: 38, hipotesis: 0, creditos: 2 },
  { final: 'C', diagScore: 200, rigorScore: 80, impactoScore: 150, total: 520, intervIds: [6, 4], diagFlags: [true, true, false, false], rigorFlags: [true, false, false, false, true], espurias: [], minutoDiag: 26, hipotesis: 3, creditos: 6 },
  { final: 'B', diagScore: 270, rigorScore: 160, impactoScore: 190, total: 780, intervIds: [1, 5, 4], diagFlags: [true, true, true, false], rigorFlags: [true, true, false, true, true], espurias: [], minutoDiag: 23, hipotesis: 4, creditos: 5 },
];

export function generarDatosDemo(): DatosDebrief {
  const equipos: EquipoDebrief[] = PERFILES.map((p, i) => {
    const historial = generarHistorial(p.intervIds, p.final);
    const decisiones = p.intervIds.map((id, idx) => ({
      minuto: p.minutoDiag - 5 + idx * 3,
      tipo: INTERVENCIONES_NOMBRES[id],
    }));

    const penalizaciones: { tipo: string; descripcion: string; puntos: number }[] = [];
    if (p.espurias.length > 0) {
      penalizaciones.push({ tipo: 'causas_espurias', descripcion: `Causas espurias: ${p.espurias.join(', ')}`, puntos: -40 * p.espurias.length });
    }
    if (p.intervIds.includes(8)) {
      penalizaciones.push({ tipo: 'metrica_traicionera', descripcion: 'Conversion destruida por umbral endurecido', puntos: -120 });
    }
    if (p.intervIds.includes(9)) {
      penalizaciones.push({ tipo: 'incentivo_perverso', descripcion: 'Bono genero errores y quejas en T3', puntos: -80 });
    }

    return {
      nombre: NOMBRES_CONSULTORAS[i],
      diagnostico: {
        ventanaCapturaEsCuello: p.diagFlags[0],
        reprocesoEsMecanismo: p.diagFlags[1],
        fugaPlastico: p.diagFlags[2],
        trabajoPerdidoBuro: p.diagFlags[3],
        causasEspurias: p.espurias,
        concentracionSinMasa: p.espurias.length >= 2,
      },
      rigor: {
        paretoEstratificacion: p.rigorFlags[0],
        dispersionInterpretacion: p.rigorFlags[1],
        embudoEtapas: p.rigorFlags[2],
        hipotesisEscrita: p.rigorFlags[3],
        cruzoComentariosBase: p.rigorFlags[4],
      },
      intervenciones: p.intervIds.map((id, idx) => ({
        id,
        nombre: INTERVENCIONES_NOMBRES[id],
        trimestre: idx === 0 ? 1 : 2,
      })),
      resultado: {
        diagnostico: p.diagScore,
        rigor: p.rigorScore,
        impacto: p.impactoScore,
        velocidad: Math.max(20, 100 - (p.minutoDiag - 25) * 4),
        eficiencia: Math.round((p.creditos / 12) * 50),
        penalizaciones: penalizaciones.reduce((s, pen) => s + pen.puntos, 0),
        total: p.total,
        final: p.final,
        desglose: {},
      },
      historialKPIs: historial,
      creditosUsados: 12 - p.creditos,
      creditosTotales: 12,
      hipotesisEscritas: p.hipotesis,
      minutoDiagnostico: p.minutoDiag,
      presupuestoRestante: p.intervIds.includes(3) || p.intervIds.includes(10) ? 0 : variar(40, 0.3),
      decisiones,
      penalizaciones,
    };
  });

  const dagVerdadero: NodoDag[] = [
    { id: 'ventana_captura', nombre: 'Ventana de captura', esCausa: true, equiposIdentificaron: equipos.filter(e => e.diagnostico.ventanaCapturaEsCuello).length },
    { id: 'reproceso', nombre: 'Reproceso', esCausa: true, equiposIdentificaron: equipos.filter(e => e.diagnostico.reprocesoEsMecanismo).length },
    { id: 'fuga_plastico', nombre: 'Fuga de aprobados sin plastico', esCausa: true, equiposIdentificaron: equipos.filter(e => e.diagnostico.fugaPlastico).length },
    { id: 'trabajo_perdido', nombre: 'Secuencia del buro', esCausa: true, equiposIdentificaron: equipos.filter(e => e.diagnostico.trabajoPerdidoBuro).length },
  ];

  const trampas: TrampaDebrief[] = [
    { nombre: 'Edad del cliente', equiposDeclararon: equipos.filter(e => e.diagnostico.causasEspurias.includes('Edad')).length, correlacionReal: 0.035 },
    { nombre: 'Score del buro', equiposDeclararon: equipos.filter(e => e.diagnostico.causasEspurias.includes('Score buro')).length, correlacionReal: 0.12 },
    { nombre: 'Score ETF interno', equiposDeclararon: equipos.filter(e => e.diagnostico.causasEspurias.includes('Score ETF')).length, correlacionReal: 0.08 },
    { nombre: 'Anios como cliente', equiposDeclararon: equipos.filter(e => e.diagnostico.causasEspurias.includes('Anios cliente')).length, correlacionReal: 0.04 },
    { nombre: 'Linea de credito', equiposDeclararon: equipos.filter(e => e.diagnostico.causasEspurias.includes('Linea credito')).length, correlacionReal: 0.15 },
    { nombre: 'Estado civil', equiposDeclararon: equipos.filter(e => e.diagnostico.causasEspurias.includes('Estado civil')).length, correlacionReal: 0.02 },
    { nombre: 'Genero', equiposDeclararon: equipos.filter(e => e.diagnostico.causasEspurias.includes('Genero')).length, correlacionReal: 0.01 },
  ];

  return { equipos, dagVerdadero, trampas, lineaBase: kpisBase() };
}
