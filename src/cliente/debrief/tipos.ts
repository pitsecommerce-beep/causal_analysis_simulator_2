export interface KPIsDebrief {
  trimestre: number;
  ventanaCapturaMediana: number;
  quejas: number;
  conversion: number;
  erroresCaptura: number;
  atoradosPct: number;
  reproceso?: number;
}

export interface EquipoDebrief {
  nombre: string;
  diagnostico: {
    ventanaCapturaEsCuello: boolean;
    reprocesoEsMecanismo: boolean;
    fugaPlastico: boolean;
    trabajoPerdidoBuro: boolean;
    causasEspurias: string[];
    concentracionSinMasa: boolean;
  };
  rigor: {
    paretoEstratificacion: boolean;
    dispersionInterpretacion: boolean;
    embudoEtapas: boolean;
    hipotesisEscrita: boolean;
    cruzoComentariosBase: boolean;
  };
  intervenciones: { id: number; nombre: string; trimestre: number }[];
  resultado: {
    diagnostico: number;
    rigor: number;
    impacto: number;
    velocidad: number;
    eficiencia: number;
    penalizaciones: number;
    total: number;
    final: string;
    desglose: Record<string, number>;
  };
  historialKPIs: KPIsDebrief[];
  creditosUsados: number;
  creditosTotales: number;
  hipotesisEscritas: number;
  minutoDiagnostico: number;
  presupuestoRestante: number;
  decisiones: { minuto: number; tipo: string }[];
  penalizaciones: { tipo: string; descripcion: string; puntos: number }[];
}

export interface NodoDag {
  id: string;
  nombre: string;
  esCausa: boolean;
  equiposIdentificaron: number;
}

export interface TrampaDebrief {
  nombre: string;
  equiposDeclararon: number;
  correlacionReal: number;
}

export interface DatosDebrief {
  equipos: EquipoDebrief[];
  dagVerdadero: NodoDag[];
  trampas: TrampaDebrief[];
  lineaBase: KPIsDebrief;
}
