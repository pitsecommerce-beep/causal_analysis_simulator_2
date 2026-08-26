import type { EventoComentario, ErrorParseado } from './tipos.js';

const MESES_ES: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
};

const PATRONES_ERROR: Array<{ patron: RegExp; tipo: 'captura' | 'incompletos' | 'ilegibles' | 'invalid_id' }> = [
  { patron: /input error/i, tipo: 'captura' },
  { patron: /error de catura/i, tipo: 'captura' },
  { patron: /incomplete documents/i, tipo: 'incompletos' },
  { patron: /illegible document/i, tipo: 'ilegibles' },
  { patron: /invalid id/i, tipo: 'invalid_id' },
];

const PATRONES_CIERRE: RegExp[] = [
  /authorized for/i,
  /de autoriza el loan/i,
  /envío de plástico/i,
  /bureau rejected/i,
  /score rejected/i,
];

function parsearFechaEvento(textoFecha: string, anioReferencia: number): Date | null {
  textoFecha = textoFecha.trim().replace(/[.\-]/g, ' ').replace(/\s+/g, ' ');
  const partes = textoFecha.trim().split(' ');
  if (partes.length < 2) return null;

  const dia = parseInt(partes[0], 10);
  const mesStr = partes[1].toLowerCase().replace('.', '');
  const mes = MESES_ES[mesStr.substring(0, 3)];

  if (isNaN(dia) || mes === undefined) return null;

  return new Date(anioReferencia, mes, dia);
}

export function parsearComentarios(raw: string | null, fechaReferencia: Date): EventoComentario[] {
  if (!raw || raw.trim() === '') return [];

  const eventos: EventoComentario[] = [];
  const segmentos = raw.split(/\./).map(s => s.trim()).filter(s => s.length > 0);

  const anioRef = fechaReferencia.getFullYear();

  for (const segmento of segmentos) {
    const matchFecha = segmento.match(/^(\d{1,2}[\s.\-]+[a-zA-Z]{3,4})/);
    const fecha = matchFecha ? parsearFechaEvento(matchFecha[1], anioRef) : null;

    const descripcion = matchFecha
      ? segmento.substring(matchFecha[0].length).trim()
      : segmento.trim();

    let esError = false;
    let tipoError: 'captura' | 'incompletos' | 'ilegibles' | 'invalid_id' | null = null;

    for (const { patron, tipo } of PATRONES_ERROR) {
      if (patron.test(descripcion)) {
        esError = true;
        tipoError = tipo;
        break;
      }
    }

    if (!esError) {
      const esCierre = PATRONES_CIERRE.some(p => p.test(descripcion));
      if (esCierre) {
        esError = false;
        tipoError = null;
      }
    }

    eventos.push({ fecha, descripcion, esError, tipoError });
  }

  return eventos;
}

export function extraerErrores(eventos: EventoComentario[]): ErrorParseado[] {
  return eventos
    .filter(e => e.esError && e.tipoError !== null)
    .map(e => ({ tipo: e.tipoError!, fecha: e.fecha }));
}

const EXCEL_EPOCH = new Date(1899, 11, 30);

export function excelSerialAFecha(serial: number | string | null): Date | null {
  if (serial === null || serial === undefined) return null;
  if (typeof serial === 'string') {
    if (serial.toLowerCase() === 'na' || serial.trim() === '') return null;
    const parsed = new Date(serial);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof serial !== 'number' || isNaN(serial)) return null;
  const ms = EXCEL_EPOCH.getTime() + serial * 86400000;
  return new Date(ms);
}

export function diasEntre(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function mesDeApertura(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = (fecha.getMonth() + 1).toString().padStart(2, '0');
  return `${y}-${m}`;
}
