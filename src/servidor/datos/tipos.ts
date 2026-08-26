export interface SolicitudCruda {
  'Application #': number;
  'Customer #': number;
  'Age': number;
  'Marital Status': string | null;
  'Gender': string | null;
  'State': string | null;
  'Branch #': number;
  'Years as customer': number;
  'Credit Bureau Score': number | null;
  'ETFBank Score': number | null;
  'Date of first data input': number | null;
  'Date of last data input': number | null;
  '# of tries': number;
  'Date documents sent': number | null;
  'Date documents Received at CrOP': number | null;
  'Credit Bureau result': string | null;
  'Credit Bureau run date': number | null;
  'ETFBank Score result': string | null;
  'ETFB Score Date': number | string | null;
  'Date Plastic Sent': number | null;
  'Last Status': string;
  'Credit Line Granted': number | null;
  'Comments': string | null;
}

export interface ErrorParseado {
  tipo: 'captura' | 'incompletos' | 'ilegibles' | 'invalid_id';
  fecha: Date | null;
}

export interface EventoComentario {
  fecha: Date | null;
  descripcion: string;
  esError: boolean;
  tipoError: 'captura' | 'incompletos' | 'ilegibles' | 'invalid_id' | null;
}

export interface Solicitud {
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
  fechaPrimerCaptura: Date;
  fechaUltimaCaptura: Date;
  intentos: number;
  fechaEnvioDocumentos: Date | null;
  fechaRecepcionCrOP: Date | null;
  resultadoBuro: string | null;
  fechaBuro: Date | null;
  resultadoScoreETF: string | null;
  fechaScoreETF: Date | null;
  fechaPlastico: Date | null;
  ultimoEstatus: string;
  lineaCredito: number | null;
  comentariosRaw: string;
  errores: ErrorParseado[];
  erroresPorCaso: number;
  erroresCaptura: number;
  incompletos: number;
  ilegibles: number;
  tieneReproceso: boolean;
  ventanaCaptura: number;
  cicloTotal: number | null;
  estaAtorado: boolean;
  mes: string;
}

export interface ComentarioCliente {
  id: string;
  solicitudId: number;
  estado: string;
  sucursal: number;
  intentos: number;
  canalCaptacion: string;
  fechaComentario: string;
  categoriaPrimaria: string;
  categoriaSecundaria: string | null;
  comentario: string;
  evidencia: string;
}

export interface DatosCargados {
  solicitudes: Solicitud[];
  comentarios: ComentarioCliente[];
  verdadOculta: VerdadOculta;
}

export interface VerdadOculta {
  semilla: number;
  n: number;
  meses: number;
  inicio: string;
  sucursales_foco: number[];
  capacitacion_base: Record<string, number>;
  ejecutivos: Record<string, number>;
  claridad_checklist: {
    antes: number;
    despues: number;
    mes_quiebre: number;
    evento: string;
  };
  umbral_buro: number;
  umbral_score_interno: number;
  trampas: string[];
  linea_base: {
    n: number;
    intentos_media: number;
    intentos_sd: number;
    ventana_captura_media: number;
    ventana_captura_mediana: number;
    corr_intentos_captura: number;
    tasa_reproceso: number;
    errores_por_100: number;
    mix_error: {
      captura: number;
      incompletos: number;
      ilegibles: number;
    };
    embudo: {
      total: number;
      buro_corrido: number;
      buro_aceptado: number;
      score_aceptado: number;
      plastico_enviado: number;
    };
    atorados: number;
    dias_perdidos_en_rechazados_por_buro: number;
  };
  ranking_sucursales_por_error: Array<{
    sucursal: number;
    n: number;
    errores: number;
    errores_captura: number;
    intentos_medio: number;
    captura_media: number;
    es_foco: boolean;
  }>;
}
