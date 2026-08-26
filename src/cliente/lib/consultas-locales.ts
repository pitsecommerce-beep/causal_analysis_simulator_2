import type {
  SolicitudCliente,
  ResultadoSegmentar,
  ResultadoCorrelacionar,
  ResultadoSerieTiempo,
  ResultadoEmbudo,
  ResultadoConsulta,
} from './tipos';
import { media, correlacionPearson } from './estadistica';

function obtenerValorCampo(s: SolicitudCliente, campo: string): string {
  const val = (s as Record<string, unknown>)[campo];
  return val == null ? '(vacío)' : String(val);
}

function obtenerValorNumerico(s: SolicitudCliente, campo: string): number | null {
  if (campo === 'erroresTotales') return s.erroresCaptura + s.incompletos + s.ilegibles;
  const val = (s as Record<string, unknown>)[campo];
  return typeof val === 'number' ? val : null;
}

export function ejecutarSegmentar(
  datos: SolicitudCliente[],
  agrupadoPor: string,
  medida: string,
): ResultadoSegmentar {
  const grupos = new Map<string, number[]>();

  for (const s of datos) {
    const clave = obtenerValorCampo(s, agrupadoPor);
    if (!grupos.has(clave)) grupos.set(clave, []);
    const val = medida === 'count' ? 1 : (obtenerValorNumerico(s, medida) ?? 0);
    grupos.get(clave)!.push(val);
  }

  const resultado: ResultadoSegmentar['datos'] = [];
  for (const [cat, vals] of grupos) {
    resultado.push({
      categoria: cat,
      valor: medida === 'count' ? vals.length : Math.round(media(vals) * 10) / 10,
      n: vals.length,
    });
  }

  resultado.sort((a, b) => b.valor - a.valor);

  return { tipo: 'segmentar', datos: resultado, agrupadoPor, medida };
}

export function ejecutarCorrelacionar(
  datos: SolicitudCliente[],
  variableX: string,
  variableY: string,
): ResultadoCorrelacionar {
  const pares: { x: number; y: number }[] = [];

  for (const s of datos) {
    const x = obtenerValorNumerico(s, variableX);
    const y = obtenerValorNumerico(s, variableY);
    if (x != null && y != null) {
      pares.push({ x, y });
    }
  }

  const xs = pares.map(p => p.x);
  const ys = pares.map(p => p.y);
  const pearson = Math.round(correlacionPearson(xs, ys) * 1000) / 1000;

  return { tipo: 'correlacionar', datos: pares, pearson, n: pares.length, variableX, variableY };
}

export function ejecutarSerieTiempo(
  datos: SolicitudCliente[],
  variable: string,
): ResultadoSerieTiempo {
  const porMes = new Map<string, number[]>();

  for (const s of datos) {
    const mes = s.mes;
    if (!porMes.has(mes)) porMes.set(mes, []);
    const val = variable === 'count' ? 1 : (obtenerValorNumerico(s, variable) ?? 0);
    porMes.get(mes)!.push(val);
  }

  const meses = [...porMes.keys()].sort();
  const resultado: ResultadoSerieTiempo['datos'] = meses.map(mes => {
    const vals = porMes.get(mes)!;
    return {
      mes,
      valor: variable === 'count' ? vals.length : Math.round(media(vals) * 10) / 10,
      n: vals.length,
    };
  });

  return { tipo: 'serie_tiempo', datos: resultado, variable };
}

export function ejecutarEmbudo(datos: SolicitudCliente[]): ResultadoEmbudo {
  const total = datos.length;
  const buroRealizado = datos.filter(s => s.fechaBuro != null).length;
  const buroAceptado = datos.filter(s => s.resultadoBuro === 'Accepted').length;
  const scoreAceptado = datos.filter(s => s.resultadoScoreETF === 'Score Accepted').length;
  const plasticoEnviado = datos.filter(s => s.fechaPlastico != null).length;

  const etapas = [
    { nombre: 'Total solicitudes', cantidad: total },
    { nombre: 'Buró realizado', cantidad: buroRealizado },
    { nombre: 'Buró aceptado', cantidad: buroAceptado },
    { nombre: 'Score aceptado', cantidad: scoreAceptado },
    { nombre: 'Plástico enviado', cantidad: plasticoEnviado },
  ].map(e => ({
    ...e,
    porcentaje: total > 0 ? Math.round((e.cantidad / total) * 1000) / 10 : 0,
  }));

  return { tipo: 'embudo', etapas };
}

export function ejecutarConsulta(
  datos: SolicitudCliente[],
  tipo: string,
  parametros: Record<string, string>,
): ResultadoConsulta {
  switch (tipo) {
    case 'segmentar':
      return ejecutarSegmentar(datos, parametros.agrupadoPor, parametros.medida);
    case 'correlacionar':
      return ejecutarCorrelacionar(datos, parametros.variableX, parametros.variableY);
    case 'serie_tiempo':
      return ejecutarSerieTiempo(datos, parametros.variable);
    case 'embudo':
      return ejecutarEmbudo(datos);
    default:
      throw new Error(`Tipo de consulta no válido: ${tipo}`);
  }
}
