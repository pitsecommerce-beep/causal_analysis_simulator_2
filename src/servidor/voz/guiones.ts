import { readFileSync } from 'fs';
import { resolve } from 'path';

function cargarGuion(nombre: string): string {
  return readFileSync(resolve(__dirname, 'guiones', nombre), 'utf-8').trim();
}

export const DISCURSO_DIRECTOR = cargarGuion('director.txt');
export const DISCURSO_ADRIANA = cargarGuion('adriana.txt');

export interface TestimonioRespaldo {
  commentId: string;
  solicitudId: number;
  estado: string;
  sucursal: number;
  genero: string;
  intentos: number;
  nombre: string;
  texto: string;
}

export interface ErrorValidacion {
  indice: number;
  campo: string;
  esperado: string;
  encontrado: string;
}

export function validarTestimoniosContraDatos<
  C extends { id: string; solicitudId: number; estado: string; sucursal: number; comentario: string },
  S extends { id: number; genero: string },
>(
  testimonios: TestimonioRespaldo[],
  comentarios: C[],
  solicitudes: S[],
  semilla: number,
  sortearFn: (c: C[], s: number) => C[],
): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];
  const seleccionados = sortearFn(comentarios, semilla);
  const indiceSol = new Map(solicitudes.map(s => [s.id, s]));

  for (let i = 0; i < testimonios.length; i++) {
    const t = testimonios[i];
    const real = seleccionados[i];
    if (!real) {
      errores.push({ indice: i, campo: 'existencia', esperado: 'registro real', encontrado: 'no existe en sorteo' });
      continue;
    }

    if (t.commentId !== real.id)
      errores.push({ indice: i, campo: 'commentId', esperado: real.id, encontrado: t.commentId });
    if (t.solicitudId !== real.solicitudId)
      errores.push({ indice: i, campo: 'solicitudId', esperado: String(real.solicitudId), encontrado: String(t.solicitudId) });
    if (t.estado !== real.estado)
      errores.push({ indice: i, campo: 'estado', esperado: real.estado, encontrado: t.estado });
    if (t.sucursal !== real.sucursal)
      errores.push({ indice: i, campo: 'sucursal', esperado: String(real.sucursal), encontrado: String(t.sucursal) });
    if (t.texto !== real.comentario)
      errores.push({ indice: i, campo: 'texto', esperado: real.comentario.slice(0, 60) + '...', encontrado: t.texto.slice(0, 60) + '...' });

    const sol = indiceSol.get(real.solicitudId);
    if (sol) {
      const g = sol.genero.toLowerCase();
      const generoEsperado = g.includes('female') || g.includes('femenin') ? 'F' : 'M';
      if (t.genero !== generoEsperado)
        errores.push({ indice: i, campo: 'genero', esperado: generoEsperado, encontrado: t.genero });
    }
  }

  if (testimonios.length !== seleccionados.length)
    errores.push({ indice: -1, campo: 'cantidad', esperado: String(seleccionados.length), encontrado: String(testimonios.length) });

  return errores;
}

export const TESTIMONIOS_RESPALDO: TestimonioRespaldo[] = [
  {
    commentId: 'C-032',
    solicitudId: 604,
    estado: 'Edo Mex',
    sucursal: 110,
    genero: 'M',
    intentos: 3,
    nombre: 'Carlos',
    texto: 'No hay una lista clara de requisitos. Cada ejecutivo pide algo distinto y uno paga el tiempo.',
  },
  {
    commentId: 'C-005',
    solicitudId: 1422,
    estado: 'Edo Mex',
    sucursal: 214,
    genero: 'M',
    intentos: 3,
    nombre: 'Pedro',
    texto: 'No hay una lista clara de requisitos. Cada ejecutivo pide algo distinto y uno paga el tiempo.',
  },
  {
    commentId: 'C-061',
    solicitudId: 93,
    estado: 'D.F.',
    sucursal: 631,
    genero: 'F',
    intentos: 2,
    nombre: 'Carmen',
    texto: 'Mi solicitud fue autorizada y ahi se quedo. No hay tarjeta, no hay explicacion, no hay a quien preguntar.',
  },
  {
    commentId: 'C-080',
    solicitudId: 1023,
    estado: 'Edo Mex',
    sucursal: 692,
    genero: 'F',
    intentos: 3,
    nombre: 'María',
    texto: 'Si el buro era el problema, pudieron consultarlo antes de pedirme tres veces los mismos papeles.',
  },
];
