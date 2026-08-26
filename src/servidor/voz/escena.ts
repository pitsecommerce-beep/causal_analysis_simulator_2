import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { DatosCargados } from '../datos/tipos.js';
import type { ConfigSimulador } from '../motor/tipos.js';
import {
  generarDiscursoDirector,
  generarParlamentosClientes,
  validarTerminosProhibidos,
  type ResultadoDiscurso,
  type ParlamentoCliente,
} from './anthropic.js';
import { textoAAudio, vozDirector, vozCliente, type ResultadoAudio } from './deepgram.js';
import { DISCURSO_DIRECTOR, TESTIMONIOS_RESPALDO } from './guiones.js';

export interface PiezaEscena {
  rol: 'director' | 'cliente';
  nombre: string;
  estado: string;
  sucursal: number;
  genero: string;
  intentos: number;
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

function configVoz(config: ConfigSimulador) {
  const voz = config.voz;
  return {
    maxPalabrasDirector: voz?.max_palabras_director ?? 320,
    maxPalabrasTestimonio: voz?.max_palabras_testimonio ?? 70,
    timeoutMs: voz?.timeout_ms ?? 12000,
    terminosProhibidos: voz?.terminos_prohibidos ?? [],
    voces: voz?.voces ?? {
      director: 'aura-2-javier-es',
      clienteM: ['aura-2-aquila-es', 'aura-2-javier-es'],
      clienteF: ['aura-2-carina-es', 'aura-2-diana-es', 'aura-2-selena-es'],
    },
  };
}

export async function precalentarEscena(
  codigoSala: string,
  datos: DatosCargados,
  config: ConfigSimulador,
): Promise<void> {
  const existente = cache.get(codigoSala);
  if (existente && existente.estado !== 'pendiente' && existente.estado !== 'error') {
    return;
  }

  cache.set(codigoSala, { estado: 'generando', escena: null, error: null });

  const cv = configVoz(config);

  try {
    const totalSucursales = new Set(datos.solicitudes.map(s => s.sucursal)).size;

    const [discurso, parlamentos] = await Promise.all([
      generarDiscursoDirector(
        datos.solicitudes.length,
        datos.comentarios.length,
        totalSucursales,
        cv.terminosProhibidos,
        cv.maxPalabrasDirector,
        cv.timeoutMs,
      ),
      generarParlamentosClientes(
        datos.comentarios,
        datos.solicitudes,
        datos.verdadOculta.semilla,
        cv.maxPalabrasTestimonio,
        cv.timeoutMs,
      ),
    ]);

    const textoDirector = discurso.fuente === 'ia' && discurso.texto
      ? discurso.texto
      : DISCURSO_DIRECTOR;

    const audioDirector = await generarAudioConRespaldo(
      textoDirector,
      vozDirector(cv.voces),
      cv.timeoutMs,
      'discurso-director.mp3',
    );

    const director: PiezaEscena = {
      rol: 'director',
      nombre: 'Ramón Betancourt',
      estado: '',
      sucursal: 0,
      genero: 'M',
      intentos: 0,
      texto: textoDirector,
      fuenteTexto: discurso.fuente === 'ia' && discurso.texto ? 'ia' : 'respaldo',
      audio: audioDirector.audio,
      fuenteAudio: audioDirector.fuente,
    };

    const clientes: PiezaEscena[] = [];
    for (let i = 0; i < parlamentos.length; i++) {
      const p = parlamentos[i];
      const textoCliente = p.fuente === 'ia' ? p.texto : obtenerTestimonioRespaldo(i);
      const voz = vozCliente(p.genero, i, cv.voces);
      const audio = await generarAudioConRespaldo(
        textoCliente,
        voz,
        cv.timeoutMs,
        `cliente-${i}.mp3`,
      );

      clientes.push({
        rol: 'cliente',
        nombre: p.nombre,
        estado: p.estado,
        sucursal: p.sucursal,
        genero: p.genero,
        intentos: p.intentos,
        texto: textoCliente,
        fuenteTexto: p.fuente,
        audio: audio.audio,
        fuenteAudio: audio.fuente,
      });
    }

    cache.set(codigoSala, {
      estado: 'lista',
      escena: { director, clientes, lista: true },
      error: null,
    });
  } catch (err) {
    console.warn('⚠ Error precalentando escena:', (err as Error).message);
    const escenaResp = construirEscenaRespaldo();
    cache.set(codigoSala, {
      estado: 'error',
      escena: escenaResp,
      error: (err as Error).message,
    });
  }
}

async function generarAudioConRespaldo(
  texto: string,
  voz: string,
  timeoutMs: number,
  archivoRespaldo: string,
): Promise<ResultadoAudio> {
  const resultado = await textoAAudio(texto, { voz }, timeoutMs);
  if (resultado.audio.length > 0) return resultado;

  try {
    const ruta = resolve('src/servidor/voz/respaldo', archivoRespaldo);
    const audio = readFileSync(ruta);
    return { audio, fuente: 'respaldo', tiempoMs: 0 };
  } catch {
    return { audio: Buffer.alloc(0), fuente: 'respaldo', tiempoMs: 0 };
  }
}

function obtenerTestimonioRespaldo(indice: number): string {
  if (indice < TESTIMONIOS_RESPALDO.length) {
    return TESTIMONIOS_RESPALDO[indice].texto;
  }
  return TESTIMONIOS_RESPALDO[0].texto;
}

function construirEscenaRespaldo(): EscenaCompleta {
  let audioDirector = Buffer.alloc(0);
  try {
    audioDirector = readFileSync(resolve('src/servidor/voz/respaldo/discurso-director.mp3'));
  } catch { /* no fallback audio */ }

  const clientes: PiezaEscena[] = TESTIMONIOS_RESPALDO.map((t, i) => {
    let audio = Buffer.alloc(0);
    try {
      audio = readFileSync(resolve('src/servidor/voz/respaldo', `cliente-${i}.mp3`));
    } catch { /* no fallback audio */ }

    return {
      rol: 'cliente' as const,
      nombre: t.nombre,
      estado: t.estado,
      sucursal: t.sucursal,
      genero: t.genero,
      intentos: t.intentos,
      texto: t.texto,
      fuenteTexto: 'respaldo' as const,
      audio,
      fuenteAudio: 'respaldo' as const,
    };
  });

  return {
    director: {
      rol: 'director',
      nombre: 'Ramón Betancourt',
      estado: '',
      sucursal: 0,
      genero: 'M',
      intentos: 0,
      texto: DISCURSO_DIRECTOR,
      fuenteTexto: 'respaldo',
      audio: audioDirector,
      fuenteAudio: audioDirector.length > 0 ? 'respaldo' : 'respaldo',
    },
    clientes,
    lista: true,
  };
}

export function limpiarCache(codigoSala: string): void {
  cache.delete(codigoSala);
}

export { validarTerminosProhibidos };
