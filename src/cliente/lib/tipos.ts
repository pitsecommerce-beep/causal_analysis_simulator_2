export interface SolicitudCliente {
  id: number;
  clienteId: number;
  edad: number;
  estadoCivil: string;
  genero: string;
  estado: string;
  sucursal: number;
  aniosCliente: number;
  scoreBuro: number | null;
  scoreETF: number | null;
  intentos: number;
  fechaPrimerCaptura: string;
  fechaUltimaCaptura: string;
  fechaEnvioDocumentos: string | null;
  fechaRecepcionCrOP: string | null;
  resultadoBuro: string | null;
  fechaBuro: string | null;
  resultadoScoreETF: string | null;
  fechaScoreETF: string | null;
  fechaPlastico: string | null;
  ultimoEstatus: string;
  lineaCredito: number | null;
  comentariosRaw: string;
}

export interface KPIsCliente {
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

export interface Penalizacion {
  tipo: string;
  descripcion: string;
  puntos: number;
}

export interface EstadoMotorCliente {
  trimestre: number;
  kpis: KPIsCliente;
  kpisBase: KPIsCliente;
  presupuesto: number;
  creditosIndagacion: number;
  intervenciones: IntervencionAplicada[];
  eventosActivos: { id: string; nombre: string; trimestresFaltantes: number }[];
  historialKPIs: KPIsCliente[];
  penalizaciones: Penalizacion[];
}

export interface IntervencionCatalogo {
  id: number;
  nombre: string;
  costo: number;
  disponible: boolean;
  razon?: string;
}

export interface EstadoReloj {
  iniciado: boolean;
  pausado: boolean;
  segundoActual: number;
  minuto: number;
  fase: string;
  fases: { nombre: string; inicioMin: number; finMin: number }[];
}

export interface EntradaBitacoraLocal {
  id: number;
  tipo: string;
  hipotesis: string;
  parametros: Record<string, unknown> | null;
  timestamp: string;
  resultado?: ResultadoConsulta;
}

export type ResultadoConsulta =
  | ResultadoSegmentar
  | ResultadoCorrelacionar
  | ResultadoSerieTiempo
  | ResultadoEmbudo;

export interface ResultadoSegmentar {
  tipo: 'segmentar';
  datos: { categoria: string; valor: number; n: number }[];
  agrupadoPor: string;
  medida: string;
}

export interface ResultadoCorrelacionar {
  tipo: 'correlacionar';
  datos: { x: number; y: number }[];
  pearson: number;
  n: number;
  variableX: string;
  variableY: string;
}

export interface ResultadoSerieTiempo {
  tipo: 'serie_tiempo';
  datos: { mes: string; valor: number; n: number }[];
  variable: string;
}

export interface ResultadoEmbudo {
  tipo: 'embudo';
  etapas: { nombre: string; cantidad: number; porcentaje: number }[];
}

export const CAMPOS_AGRUPACION: Record<string, string> = {
  sucursal: 'Sucursal',
  estado: 'Estado',
  mes: 'Mes',
  estadoCivil: 'Estado civil',
  genero: 'Género',
  ultimoEstatus: 'Estatus final',
  resultadoBuro: 'Resultado buró',
  resultadoScoreETF: 'Resultado score ETF',
};

export const CAMPOS_MEDIDA: Record<string, string> = {
  count: 'Cantidad',
  erroresCaptura: 'Errores de captura',
  incompletos: 'Incompletos',
  ilegibles: 'Ilegibles',
  erroresTotales: 'Errores totales',
  ventanaCaptura: 'Ventana captura (media)',
  intentos: 'Intentos (media)',
};

export const CAMPOS_NUMERICOS: Record<string, string> = {
  edad: 'Edad',
  aniosCliente: 'Años como cliente',
  scoreBuro: 'Score buró',
  scoreETF: 'Score ETF',
  intentos: 'Intentos',
  ventanaCaptura: 'Ventana de captura',
  lineaCredito: 'Línea de crédito',
  erroresCaptura: 'Errores de captura',
};

export const CAMPOS_SERIE: Record<string, string> = {
  erroresCaptura: 'Errores de captura',
  incompletos: 'Incompletos',
  ilegibles: 'Ilegibles',
  ventanaCaptura: 'Ventana de captura',
  intentos: 'Intentos',
  count: 'Total solicitudes',
};

export interface ComentarioClientePublico {
  id: string;
  solicitudId: number;
  estado: string;
  sucursal: number;
  intentos: number;
  canal: string;
  fecha: string;
  categoriaPrimaria: string;
  categoriaSecundaria: string | null;
  comentario: string;
}

export type RolEquipo = 'patrocinador' | 'lider' | 'analista' | 'voz_cliente';

export interface MiembroEquipo {
  nombre: string;
  rol: RolEquipo;
}

export const NOMBRES_ROLES: Record<RolEquipo, string> = {
  patrocinador: 'Patrocinador del proceso',
  lider: 'Líder de mejora',
  analista: 'Analista de datos',
  voz_cliente: 'Voz del cliente',
};

export const DESC_ROLES: Record<RolEquipo, string> = {
  patrocinador: 'Autoriza intervenciones (gasto de presupuesto)',
  lider: 'Envía el diagnóstico final',
  analista: 'Ejecuta las consultas de datos',
  voz_cliente: 'Marca evidencia de comentarios de cliente',
};

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

export interface PreguntaConsejo {
  pregunta: string;
  angulo: string;
}

export interface EquipoTablero {
  nombre: string;
  trimestre: number;
  presupuesto: number;
  creditos: number;
  intervenciones: string[];
  kpis: KPIsCliente;
  historialKPIs: KPIsCliente[];
  resultado: ResultadoPuntuacion | null;
  miembros: MiembroEquipo[];
}

export interface DiagnosticoForm {
  ventanaCapturaEsCuello: boolean;
  reprocesoEsMecanismo: boolean;
  fugaPlastico: boolean;
  trabajoPerdidoBuro: boolean;
  causasEspurias: string[];
  concentracionSinMasa: boolean;
}

export const NOMBRES_FINALES: Record<string, string> = {
  A: 'Reconversión',
  B: 'Buen proyecto incompleto',
  C: 'Ataque al mediador',
  D: 'La métrica traicionera',
  E: 'El incentivo perverso',
  F: 'Dispersión',
  G: 'Parálisis por análisis',
  H: 'Falso positivo',
};

export interface PropuestaIntervencion {
  id: string;
  intervencionId: number;
  intervencionNombre: string;
  costo: number;
  justificacion: string;
  propuestoPor: string;
  rolPropuesto: RolEquipo;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  respuesta?: string;
  timestamp: string;
  sucursales?: number[];
}

export interface SolicitudAccion {
  id: string;
  de: string;
  rolDe: RolEquipo;
  para: RolEquipo;
  tipo: 'consulta' | 'testimonios' | 'diagnostico' | 'general';
  mensaje: string;
  estado: 'pendiente' | 'completada' | 'descartada';
  timestamp: string;
}

export interface ObjetivoFase {
  equipo: string;
  rol: Record<RolEquipo, string>;
  faltante: string;
}

export const OBJETIVOS_FASE: Record<string, ObjetivoFase> = {
  trimestre_1: {
    equipo: 'Formular y probar al menos dos hipótesis, y decidir la primera intervención.',
    rol: {
      analista: 'Ejecuta consultas para probar hipótesis.',
      voz_cliente: 'Revisa testimonios y marca evidencia relevante.',
      patrocinador: 'Espera propuestas de intervención para autorizar.',
      lider: 'Coordina al equipo y revisa hallazgos.',
    },
    faltante: 'Sin propuesta de intervención aprobada.',
  },
  trimestre_2: {
    equipo: 'Revisar consecuencias de la intervención y corregir el rumbo.',
    rol: {
      analista: 'Verifica cómo cambiaron los KPIs tras la intervención.',
      voz_cliente: 'Busca cambios en la percepción de clientes.',
      patrocinador: 'Evalúa si se necesita una nueva intervención.',
      lider: 'Revisa el avance del diagnóstico.',
    },
    faltante: 'Revisen el impacto y decidan si intervienen de nuevo.',
  },
  trimestre_3: {
    equipo: 'Cerrar el diagnóstico y preparar la entrega al consejo.',
    rol: {
      analista: 'Completa las consultas pendientes.',
      voz_cliente: 'Confirma la evidencia de comentarios.',
      patrocinador: 'Autoriza la última intervención si aplica.',
      lider: 'Completa los campos del diagnóstico final.',
    },
    faltante: 'Diagnóstico incompleto.',
  },
};

export const NOMBRES_FASES: Record<string, string> = {
  espera: 'Esperando inicio',
  sala_juntas: 'Sala de juntas',
  voz_cliente: 'Voz del cliente',
  transicion: 'Transición',
  trimestre_1: 'Trimestre 1',
  trimestre_2: 'Trimestre 2',
  trimestre_3: 'Trimestre 3',
  consejo: 'El consejo',
  finalizado: 'Sesión finalizada',
};
