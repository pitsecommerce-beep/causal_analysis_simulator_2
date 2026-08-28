import type { SolicitudCliente } from './tipos';

const MESES_ES: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
};

const PATRONES_ERROR: Array<{ patron: RegExp; tipo: 'captura' | 'incompletos' | 'ilegibles' }> = [
  { patron: /input error/i, tipo: 'captura' },
  { patron: /error de catura/i, tipo: 'captura' },
  { patron: /incomplete documents/i, tipo: 'incompletos' },
  { patron: /illegible document/i, tipo: 'ilegibles' },
  { patron: /documentos ilegibles/i, tipo: 'ilegibles' },
];

function contarErroresPorTipo(raw: string): { erroresCaptura: number; incompletos: number; ilegibles: number } {
  let erroresCaptura = 0;
  let incompletos = 0;
  let ilegibles = 0;

  if (!raw || !raw.trim()) return { erroresCaptura, incompletos, ilegibles };

  const segmentos = raw.split(/\./).map(s => s.trim()).filter(s => s.length > 0);

  for (const segmento of segmentos) {
    const matchFecha = segmento.match(/^(\d{1,2}[\s.\-]+[a-zA-Z]{3,4})/);
    const descripcion = matchFecha
      ? segmento.substring(matchFecha[0].length).trim()
      : segmento.trim();

    for (const { patron, tipo } of PATRONES_ERROR) {
      if (patron.test(descripcion)) {
        if (tipo === 'captura') erroresCaptura++;
        else if (tipo === 'incompletos') incompletos++;
        else if (tipo === 'ilegibles') ilegibles++;
        break;
      }
    }
  }

  return { erroresCaptura, incompletos, ilegibles };
}

function diasEntre(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function calcularVentanaCaptura(fechaPrimer: string, fechaUltima: string): number {
  return diasEntre(new Date(fechaPrimer), new Date(fechaUltima));
}

export function calcularMes(fechaPrimer: string): string {
  const d = new Date(fechaPrimer);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${y}-${m}`;
}

export function derivarCamposError(comentariosRaw: string): { erroresCaptura: number; incompletos: number; ilegibles: number } {
  return contarErroresPorTipo(comentariosRaw);
}

export interface CamposDerivados {
  ventanaCaptura: number;
  erroresCaptura: number;
  incompletos: number;
  ilegibles: number;
  mes: string;
}

export function derivarCampos(s: SolicitudCliente): CamposDerivados {
  const { erroresCaptura, incompletos, ilegibles } = contarErroresPorTipo(s.comentariosRaw);
  return {
    ventanaCaptura: calcularVentanaCaptura(s.fechaPrimerCaptura, s.fechaUltimaCaptura),
    erroresCaptura,
    incompletos,
    ilegibles,
    mes: calcularMes(s.fechaPrimerCaptura),
  };
}

export function obtenerDerivado(s: SolicitudCliente, campo: string): number | string | null {
  switch (campo) {
    case 'ventanaCaptura':
      return calcularVentanaCaptura(s.fechaPrimerCaptura, s.fechaUltimaCaptura);
    case 'erroresCaptura':
      return contarErroresPorTipo(s.comentariosRaw).erroresCaptura;
    case 'incompletos':
      return contarErroresPorTipo(s.comentariosRaw).incompletos;
    case 'ilegibles':
      return contarErroresPorTipo(s.comentariosRaw).ilegibles;
    case 'erroresTotales': {
      const e = contarErroresPorTipo(s.comentariosRaw);
      return e.erroresCaptura + e.incompletos + e.ilegibles;
    }
    case 'mes':
      return calcularMes(s.fechaPrimerCaptura);
    default:
      return null;
  }
}

export const CAMPOS_DERIVADOS = new Set([
  'ventanaCaptura', 'erroresCaptura', 'incompletos', 'ilegibles', 'erroresTotales', 'mes',
]);

export const EJEMPLO_FILA_CRUDA = '20 jul. illegible document. 27 jul incomplete documents. 6 ago input error.';
