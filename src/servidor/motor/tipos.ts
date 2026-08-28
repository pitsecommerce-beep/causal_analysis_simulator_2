export interface ConfigSimulador {
  fases: Record<string, { inicio: number; duracion: number }>;
  equipo: {
    tamano: number;
    presupuesto: number;
    creditos_indagacion: number;
  };
  costos_consulta: Record<string, number>;
  intervenciones: ConfigIntervencion[];
  eventos: ConfigEvento[];
  puntuacion: ConfigPuntuacion;
  desempate: string[];
  voz?: {
    clientes_por_sesion: number;
    max_palabras_director: number;
    max_palabras_testimonio: number;
    timeout_ms: number;
    terminos_prohibidos: string[];
    voces: {
      director: string;
      adriana?: string;
      clienteM: string[];
      clienteF: string[];
    };
  };
}

export interface ConfigIntervencion {
  id: number;
  nombre: string;
  costo: number;
  retraso_trimestres: number;
  requiere_sucursales?: boolean;
  efectos: Record<string, number>;
  efecto_secundario: string | null;
  efecto_perverso?: {
    trimestre_activacion: number;
    errores_mult: number;
    quejas_mult: number;
  };
}

export interface ConfigEvento {
  id: string;
  nombre: string;
  efecto: Record<string, number>;
  duracion_trimestres: number;
}

export interface ConfigPuntuacion {
  diagnostico: Record<string, number>;
  rigor: Record<string, number>;
  impacto: Record<string, number>;
  velocidad: {
    max_puntos: number;
    minuto_inicio: number;
    minuto_fin: number;
    puntos_minimo: number;
  };
  eficiencia: { max_puntos: number };
  penalizaciones: Record<string, number>;
}

export interface KPIs {
  ventanaCapturaMediana: number;
  ventanaCapturaMedia: number;
  quejas: number;
  quejasVisibles: number;
  conversion: number;
  atorados: number;
  atoradosPct: number;
  trabajoPerdidoDias: number;
  erroresCaptura: number;
  incompletos: number;
  ilegibles: number;
  erroresTotales: number;
  backofficeMediana: number;
  costoOperativo: number;
}

export interface IntervencionAplicada {
  id: number;
  nombre: string;
  trimestre: number;
  sucursalesNombradas?: number[];
  activa: boolean;
}

export interface EventoActivo {
  id: string;
  nombre: string;
  trimestre: number;
  trimestresFaltantes: number;
}

export interface EstadoMotor {
  trimestre: number;
  kpis: KPIs;
  kpisBase: KPIs;
  presupuesto: number;
  creditosIndagacion: number;
  intervenciones: IntervencionAplicada[];
  eventosActivos: EventoActivo[];
  historialKPIs: KPIs[];
  penalizaciones: Penalizacion[];
}

export interface Penalizacion {
  tipo: string;
  descripcion: string;
  puntos: number;
}

export interface DiagnosticoEquipo {
  ventanaCapturaEsCuello: boolean;
  reprocesoEsMecanismo: boolean;
  fugaPlastico: boolean;
  trabajoPerdidoBuro: boolean;
  causasEspurias: string[];
  concentracionSinMasa: boolean;
  minutoDeclaracion: number;
}

export interface RigorMetodo {
  paretoEstratificacion: boolean;
  dispersionInterpretacion: boolean;
  embudoEtapas: boolean;
  hipotesisEscrita: boolean;
  cruzoComentariosBase: boolean;
}

export interface ResultadoPuntuacion {
  diagnostico: number;
  rigor: number;
  impacto: number;
  velocidad: number;
  eficiencia: number;
  penalizaciones: number;
  total: number;
  final: string;
  desglose: Record<string, number>;
}

export type RolEquipo = 'patrocinador' | 'lider' | 'analista' | 'voz_cliente';

export interface MiembroEquipo {
  nombre: string;
  rol: RolEquipo;
}

export type Final = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export const FINALES: Record<Final, { nombre: string; rangoMin: number; rangoMax: number }> = {
  A: { nombre: 'Reconversión', rangoMin: 900, rangoMax: 1000 },
  B: { nombre: 'Buen proyecto incompleto', rangoMin: 700, rangoMax: 899 },
  C: { nombre: 'Ataque al mediador', rangoMin: 450, rangoMax: 649 },
  D: { nombre: 'La métrica traicionera', rangoMin: 300, rangoMax: 449 },
  E: { nombre: 'El incentivo perverso', rangoMin: 250, rangoMax: 449 },
  F: { nombre: 'Dispersión', rangoMin: 150, rangoMax: 349 },
  G: { nombre: 'Parálisis por análisis', rangoMin: 100, rangoMax: 299 },
  H: { nombre: 'Falso positivo', rangoMin: 0, rangoMax: 1000 },
};
