import type { DatosCargados } from '../datos/tipos.js';
import {
  generarDiscursoDirector,
  generarParlamentosClientes,
  type ResultadoDiscurso,
  type ParlamentoCliente,
} from './anthropic.js';
import { textoAAudio, vozDirector, vozCliente, type ResultadoAudio } from './deepgram.js';

export interface PiezaEscena {
  rol: 'director' | 'cliente';
  nombre: string;
  genero: string;
  texto: string;
  fuenteTexto: 'ia' | 'respaldo';
  audio: Buffer;
  fuenteAudio: 'ia' | 'respaldo';
}

export interface EscenaCompleta {
  director: PiezaEscena;
  clientes: PiezaEscena[];
  lista: boolean;
}

export type EstadoGeneracion = 'pendiente' | 'generando' | 'lista' | 'error';

interface CacheEscena {
  estado: EstadoGeneracion;
  escena: EscenaCompleta | null;
  error: string | null;
}

const cache = new Map<string, CacheEscena>();

export function estadoEscena(codigoSala: string): EstadoGeneracion {
  return cache.get(codigoSala)?.estado ?? 'pendiente';
}

export function obtenerEscena(codigoSala: string): EscenaCompleta | null {
  return cache.get(codigoSala)?.escena ?? null;
}

export async function precalentarEscena(
  codigoSala: string,
  datos: DatosCargados,
): Promise<void> {
  const existente = cache.get(codigoSala);
  if (existente && existente.estado !== 'pendiente' && existente.estado !== 'error') {
    return;
  }

  cache.set(codigoSala, { estado: 'generando', escena: null, error: null });

  try {
    const [discurso, parlamentos] = await Promise.all([
      generarDiscursoDirector(
        datos.solicitudes.length,
        datos.comentarios.length,
        new Set(datos.solicitudes.map(s => s.sucursal)).size,
      ),
      generarParlamentosClientes(
        datos.comentarios,
        datos.verdadOculta.semilla,
      ),
    ]);

    const director = await construirPieza(
      'director', 'Ramón Betancourt', 'M', discurso, vozDirector(),
    );

    const clientes: PiezaEscena[] = [];
    for (let i = 0; i < parlamentos.length; i++) {
      const p = parlamentos[i];
      const pieza = await construirPieza(
        'cliente', p.nombre, p.genero,
        { texto: p.texto, fuente: p.fuente },
        vozCliente(p.genero, i),
      );
      clientes.push(pieza);
    }

    cache.set(codigoSala, {
      estado: 'lista',
      escena: { director, clientes, lista: true },
      error: null,
    });
  } catch (err) {
    console.warn('⚠ Error precalentando escena:', (err as Error).message);
    cache.set(codigoSala, {
      estado: 'error',
      escena: escenaRespaldo(datos),
      error: (err as Error).message,
    });
  }
}

async function construirPieza(
  rol: 'director' | 'cliente',
  nombre: string,
  genero: string,
  discurso: ResultadoDiscurso,
  voz: string,
): Promise<PiezaEscena> {
  let audioResult: ResultadoAudio;
  try {
    audioResult = await textoAAudio(discurso.texto, { voz });
  } catch {
    audioResult = { audio: Buffer.alloc(0), fuente: 'respaldo' };
  }

  return {
    rol,
    nombre,
    genero,
    texto: discurso.texto,
    fuenteTexto: discurso.fuente,
    audio: audioResult.audio,
    fuenteAudio: audioResult.fuente,
  };
}

function escenaRespaldo(datos: DatosCargados): EscenaCompleta {
  const totalSucursales = new Set(datos.solicitudes.map(s => s.sucursal)).size;
  const textoDirector = `Buenos días. Soy Ramón Betancourt, Director de Banca al Menudeo de ETF Bank.

Los he convocado porque tenemos un problema serio. Las quejas de clientes en nuestro proceso de tarjeta de crédito se han disparado. No estoy hablando de percepciones: tenemos datos concretos.

Frente a ustedes tienen acceso a una muestra de ${datos.solicitudes.length} solicitudes reales de nuestro proceso. Además contamos con ${datos.comentarios.length} comentarios directos de clientes. Son sus palabras, no las mías.

Nuestro proceso involucra tres actores principales y ${totalSucursales} sucursales. Necesito un diagnóstico basado en evidencia. Tienen tiempo limitado. Adelante.`;

  return {
    director: {
      rol: 'director',
      nombre: 'Ramón Betancourt',
      genero: 'M',
      texto: textoDirector,
      fuenteTexto: 'respaldo',
      audio: Buffer.alloc(0),
      fuenteAudio: 'respaldo',
    },
    clientes: [],
    lista: true,
  };
}

export function limpiarCache(codigoSala: string): void {
  cache.delete(codigoSala);
}
