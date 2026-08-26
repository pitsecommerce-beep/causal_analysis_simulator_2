import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as XLSX from 'xlsx';
import type { Solicitud, SolicitudCruda, ComentarioCliente, VerdadOculta, DatosCargados } from './tipos.js';
import { parsearComentarios, extraerErrores, excelSerialAFecha, diasEntre, mesDeApertura } from './parseo.js';

function limpiarTexto(val: string | null): string {
  if (!val) return '';
  return val.trim();
}

function cargarSolicitudes(rutaBase: string): Solicitud[] {
  const ruta = resolve(rutaBase, 'R2_MX_ETF_Bank_Causal_Analysis_MBA.xlsx');
  const wb = XLSX.readFile(ruta);
  const ws = wb.Sheets['MX CAMPUS'];
  const filas: SolicitudCruda[] = XLSX.utils.sheet_to_json(ws, { defval: null });

  return filas.map(fila => {
    const fechaPrimer = excelSerialAFecha(fila['Date of first data input'])!;
    const fechaUltima = excelSerialAFecha(fila['Date of last data input'])!;
    const fechaEnvio = excelSerialAFecha(fila['Date documents sent'] as number | null);
    const fechaRecepcion = excelSerialAFecha(fila['Date documents Received at CrOP'] as number | null);
    const fechaBuro = excelSerialAFecha(fila['Credit Bureau run date'] as number | null);
    const fechaScoreETF = excelSerialAFecha(fila['ETFB Score Date']);
    const fechaPlastico = excelSerialAFecha(fila['Date Plastic Sent'] as number | null);

    const comentariosRaw = fila['Comments'] ?? '';
    const eventos = parsearComentarios(comentariosRaw, fechaPrimer);
    const errores = extraerErrores(eventos);

    const erroresCaptura = errores.filter(e => e.tipo === 'captura').length;
    const incompletos = errores.filter(e => e.tipo === 'incompletos').length;
    const ilegibles = errores.filter(e => e.tipo === 'ilegibles').length;
    const erroresPorCaso = errores.length;

    const ventanaCaptura = diasEntre(fechaPrimer, fechaUltima);

    let cicloTotal: number | null = null;
    if (fechaPlastico) {
      cicloTotal = diasEntre(fechaPrimer, fechaPlastico);
    }

    const resultadoScoreETF = limpiarTexto(fila['ETFBank Score result']);
    const estaAtorado = resultadoScoreETF.toLowerCase() === 'accepted' && fechaPlastico === null;

    return {
      id: fila['Application #'],
      clienteId: fila['Customer #'],
      edad: fila['Age'],
      estadoCivil: limpiarTexto(fila['Marital Status']),
      genero: limpiarTexto(fila['Gender']),
      estado: limpiarTexto(fila['State']),
      sucursal: fila['Branch #'],
      aniosCliente: fila['Years as customer'],
      scoreBuro: fila['Credit Bureau Score'],
      scoreETF: fila['ETFBank Score'],
      fechaPrimerCaptura: fechaPrimer,
      fechaUltimaCaptura: fechaUltima,
      intentos: fila['# of tries'],
      fechaEnvioDocumentos: fechaEnvio,
      fechaRecepcionCrOP: fechaRecepcion,
      resultadoBuro: limpiarTexto(fila['Credit Bureau result']),
      fechaBuro,
      resultadoScoreETF: resultadoScoreETF || null,
      fechaScoreETF,
      fechaPlastico,
      ultimoEstatus: limpiarTexto(fila['Last Status']),
      lineaCredito: fila['Credit Line Granted'],
      comentariosRaw,
      errores,
      erroresPorCaso,
      erroresCaptura,
      incompletos,
      ilegibles,
      tieneReproceso: erroresPorCaso >= 1,
      ventanaCaptura,
      cicloTotal,
      estaAtorado,
      mes: mesDeApertura(fechaPrimer),
    };
  });
}

function cargarComentariosClientes(rutaBase: string): ComentarioCliente[] {
  const ruta = resolve(rutaBase, 'R2_ETF_Bank_Comentarios_Clientes.xlsx');
  const wb = XLSX.readFile(ruta);
  const ws = wb.Sheets['Comentarios'];
  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, range: 3 });

  return filas.map(fila => ({
    id: String(fila['ID']),
    solicitudId: Number(fila['Solicitud #']),
    estado: String(fila['Estado'] ?? '').trim(),
    sucursal: Number(fila['Sucursal #']),
    intentos: Number(fila['Intentos']),
    canalCaptacion: String(fila['Canal de captacion'] ?? '').trim(),
    fechaComentario: String(fila['Fecha del comentario'] ?? ''),
    categoriaPrimaria: String(fila['Categoria primaria'] ?? '').trim(),
    categoriaSecundaria: fila['Categoria secundaria'] ? String(fila['Categoria secundaria']).trim() : null,
    comentario: String(fila['Comentario del cliente'] ?? '').trim(),
    evidencia: String(fila['Evidencia en la base R2'] ?? '').trim(),
  }));
}

function cargarVerdadOculta(rutaBase: string): VerdadOculta {
  const ruta = resolve(rutaBase, 'R2_verdad_oculta.json');
  const raw = readFileSync(ruta, 'utf-8');
  return JSON.parse(raw) as VerdadOculta;
}

export function cargarTodosDatos(rutaBase: string = 'datos'): DatosCargados {
  const solicitudes = cargarSolicitudes(rutaBase);
  const comentarios = cargarComentariosClientes(rutaBase);
  const verdadOculta = cargarVerdadOculta(rutaBase);
  return { solicitudes, comentarios, verdadOculta };
}
