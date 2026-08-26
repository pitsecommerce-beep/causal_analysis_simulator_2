export const DISCURSO_DIRECTOR = `Buenos días. Soy Ramón Betancourt, Director de Banca al Menudeo de ETF Bank.

Seré directo: los convoqué porque tenemos un problema que ya no puedo ignorar. Las quejas de clientes sobre nuestro proceso de solicitud de tarjeta de crédito han venido creciendo, y la presión de la Dirección General es cada vez más fuerte.

Ustedes son parte de varias consultoras que compiten por este mandato. Quiero que eso quede claro desde el principio: no son los únicos en esta sala. El equipo que demuestre el mejor diagnóstico se lleva el contrato.

Tenemos una muestra de mil quinientas solicitudes reales extraídas de nuestro sistema C.R.A.S.S., que cubre dieciocho meses de operación. También contamos con noventa comentarios directos de clientes que pasaron por este proceso. Son sus palabras textuales, no las mías ni las de nadie en este banco.

Nuestro proceso involucra tres actores. Primero, el cliente que llega a la sucursal. Segundo, el ejecutivo de sucursal que captura la solicitud. Y tercero, nuestra Oficina de Solicitud de Crédito, el CrOP, que procesa toda la documentación y coordina las evaluaciones crediticias.

Lo que necesito de ustedes es un diagnóstico basado en evidencia. No quiero opiniones, no quiero corazonadas, no quiero que adivinen. Quiero que analicen los datos con rigor, identifiquen qué está pasando realmente y me propongan acciones concretas.

Tienen tiempo limitado. Cada consulta al sistema tiene un costo. Piensen antes de actuar.

Adelante.`;

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
