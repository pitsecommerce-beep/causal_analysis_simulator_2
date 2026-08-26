import Anthropic from '@anthropic-ai/sdk';
import type { ComentarioCliente, Solicitud } from '../datos/tipos.js';

const MODELO_REDACTAR = () => process.env.ANTHROPIC_MODEL_REDACTAR || 'claude-haiku-4-5';

let cliente: Anthropic | null = null;

function obtenerCliente(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!cliente) {
    cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cliente;
}

export interface ResultadoDiscurso {
  texto: string;
  fuente: 'ia' | 'respaldo';
  validacion: boolean;
  tiempoMs: number;
}

export interface ParlamentoCliente {
  nombre: string;
  estado: string;
  sucursal: number;
  genero: string;
  intentos: number;
  texto: string;
  fuente: 'ia' | 'respaldo';
  tiempoMs: number;
}

export function validarTerminosProhibidos(texto: string, terminos: string[]): boolean {
  const lower = texto.toLowerCase();
  for (const t of terminos) {
    if (lower.includes(t.toLowerCase())) return false;
  }
  return true;
}

export async function generarDiscursoDirector(
  totalSolicitudes: number,
  totalComentarios: number,
  totalSucursales: number,
  terminosProhibidos: string[],
  maxPalabras: number,
  timeoutMs: number,
): Promise<ResultadoDiscurso> {
  const api = obtenerCliente();
  if (!api) {
    console.warn('⚠ ANTHROPIC_API_KEY no configurada, usando discurso de respaldo');
    return { texto: '', fuente: 'respaldo', validacion: true, tiempoMs: 0 };
  }

  const inicio = Date.now();
  try {
    const response = await Promise.race([
      api.messages.create({
        model: MODELO_REDACTAR(),
        max_tokens: 1024,
        system: `Eres Ramón Betancourt, Director de Banca al Menudeo de ETF Bank México.
Tono: impaciente pero profesional, no hostil. Hablas en primera persona.
Tu audiencia es un grupo de consultoras externas que compiten entre sí.
NUNCA reveles hallazgos, conclusiones ni causas raíz. Solo presentas el problema y el mandato.
Máximo ${maxPalabras} palabras. Español mexicano formal.`,
        messages: [{
          role: 'user',
          content: `Redacta el discurso de apertura de Ramón Betancourt para las consultoras.

Datos que debe cubrir:
- ETF Bank tiene un volumen creciente de quejas de clientes sobre el proceso de solicitud de tarjeta de crédito
- Hay una muestra de ${totalSolicitudes} solicitudes reales disponible, más un extracto histórico del sistema C.R.A.S.S.
- Hay ${totalComentarios} comentarios directos de clientes
- El flujo del proceso tiene tres actores: el cliente, el ejecutivo de sucursal, y la Oficina de Solicitud de Crédito (CrOP)
- El proceso involucra ${totalSucursales} sucursales
- Compiten varias consultoras entre sí por el mandato
- Mandato explícito: razonamiento cuidadoso y lógico, todo sustentado con datos, no opiniones ni adivinanzas

NO menciones causas, NO digas qué está mal, NO sugieras soluciones, NO menciones sucursales específicas por número. Solo describe la situación y el mandato.`,
        }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs),
      ),
    ]);

    const tiempoMs = Date.now() - inicio;
    const bloque = response.content.find(b => b.type === 'text');
    if (bloque && bloque.type === 'text') {
      const valido = validarTerminosProhibidos(bloque.text, terminosProhibidos);
      if (!valido) {
        console.warn('⚠ Discurso generado contiene términos prohibidos, usando respaldo');
        return { texto: '', fuente: 'respaldo', validacion: false, tiempoMs };
      }
      return { texto: bloque.text, fuente: 'ia', validacion: true, tiempoMs };
    }
    return { texto: '', fuente: 'respaldo', validacion: true, tiempoMs };
  } catch (err) {
    const tiempoMs = Date.now() - inicio;
    console.warn('⚠ Error generando discurso con IA:', (err as Error).message);
    return { texto: '', fuente: 'respaldo', validacion: true, tiempoMs };
  }
}

export async function generarParlamentosClientes(
  comentarios: ComentarioCliente[],
  solicitudes: Solicitud[],
  semilla: number,
  maxPalabras: number,
  timeoutMs: number,
): Promise<ParlamentoCliente[]> {
  const seleccionados = sortearComentarios(comentarios, semilla);
  const indiceSolicitud = new Map(solicitudes.map(s => [s.id, s]));

  const api = obtenerCliente();
  if (!api) {
    console.warn('⚠ ANTHROPIC_API_KEY no configurada, usando parlamentos de respaldo');
    return seleccionados.map((c, i) => parlamentoRespaldo(c, indiceSolicitud.get(c.solicitudId), i));
  }

  const resultados: ParlamentoCliente[] = [];

  for (let i = 0; i < seleccionados.length; i++) {
    const com = seleccionados[i];
    const sol = indiceSolicitud.get(com.solicitudId);
    const genero = generoDesdeBase(sol);
    const nombre = nombreFicticio(com.id, genero, i);

    const inicio = Date.now();
    try {
      const camposSolicitud = sol
        ? `- Application #: ${sol.id}
- Sucursal: ${sol.sucursal}
- Estado: ${sol.estado}
- Intentos: ${sol.intentos}
- Ventana de captura: ${sol.ventanaCaptura} días
- Último estatus: ${sol.ultimoEstatus}
- Línea otorgada: ${sol.lineaCredito ?? 'ninguna'}`
        : '';

      const response = await Promise.race([
        api.messages.create({
          model: MODELO_REDACTAR(),
          max_tokens: 512,
          system: `Conviertes un registro de comentario de cliente bancario en un parlamento hablado en primera persona.
El cliente habla de su experiencia real. Usa los datos exactos del registro (intentos, fechas, sucursal).
NO inventes ni una sola cifra. Si el registro dice tres intentos, el cliente dice tres.
Español mexicano coloquial pero respetuoso. Máximo ${maxPalabras} palabras.
Empieza directamente con el parlamento, sin comillas ni acotaciones.`,
          messages: [{
            role: 'user',
            content: `Registro del cliente:
${camposSolicitud}
- Canal: ${com.canalCaptacion}
- Categoría: ${com.categoriaPrimaria}${com.categoriaSecundaria ? ` / ${com.categoriaSecundaria}` : ''}
- Comentario original: "${com.comentario}"

Genera el parlamento en primera persona de este cliente.`,
          }],
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), timeoutMs),
        ),
      ]);

      const tiempoMs = Date.now() - inicio;
      const bloque = response.content.find(b => b.type === 'text');
      if (bloque && bloque.type === 'text') {
        resultados.push({
          nombre,
          estado: com.estado,
          sucursal: com.sucursal,
          genero,
          intentos: com.intentos,
          texto: bloque.text,
          fuente: 'ia',
          tiempoMs,
        });
      } else {
        resultados.push(parlamentoRespaldo(com, sol, i));
      }
    } catch (err) {
      console.warn(`⚠ Error generando parlamento cliente ${com.id}:`, (err as Error).message);
      resultados.push(parlamentoRespaldo(com, sol, i));
    }
  }

  return resultados;
}

export function sortearComentarios(comentarios: ComentarioCliente[], semilla: number): ComentarioCliente[] {
  const reproceso = comentarios.filter(c => {
    const cat = c.categoriaPrimaria.toLowerCase();
    return cat.includes('reproceso') || cat.includes('error de captura');
  });
  const atorado = comentarios.filter(c => {
    const cat = c.categoriaPrimaria.toLowerCase();
    return cat.includes('caso atorado');
  });
  const rechazo = comentarios.filter(c => {
    const cat = c.categoriaPrimaria.toLowerCase();
    return cat.includes('rechazo') || cat.includes('monto de l') || cat.includes('tiempo de ciclo');
  });

  let rng = semilla;
  function siguiente(): number {
    rng = (rng * 1664525 + 1013904223) & 0x7fffffff;
    return rng;
  }
  function elegir<T>(arr: T[]): T {
    return arr[siguiente() % arr.length];
  }

  const seleccion: ComentarioCliente[] = [];
  const usados = new Set<string>();

  function agregar(pool: ComentarioCliente[]): void {
    if (pool.length === 0) return;
    let intento = 0;
    while (intento < 20) {
      const c = elegir(pool);
      if (!usados.has(c.id)) {
        usados.add(c.id);
        seleccion.push(c);
        return;
      }
      intento++;
    }
    const restante = pool.find(c => !usados.has(c.id));
    if (restante) {
      usados.add(restante.id);
      seleccion.push(restante);
    }
  }

  agregar(reproceso);
  agregar(reproceso);
  agregar(atorado);
  agregar(rechazo);

  return seleccion;
}

const NOMBRES_F = ['María', 'Guadalupe', 'Ana', 'Patricia', 'Laura', 'Carmen', 'Rosa', 'Claudia'];
const NOMBRES_M = ['Carlos', 'Jorge', 'Miguel', 'Roberto', 'Fernando', 'Pedro', 'Luis', 'Antonio'];

export function nombreFicticio(commentId: string, genero: string, indice: number): string {
  const numerico = parseInt(commentId.replace(/\D/g, ''), 10) || indice;
  const nombres = genero === 'F' ? NOMBRES_F : NOMBRES_M;
  return nombres[numerico % nombres.length];
}

function generoDesdeBase(sol: Solicitud | undefined): string {
  if (!sol) return 'M';
  const g = sol.genero.toLowerCase();
  if (g.includes('female') || g.includes('femenin')) return 'F';
  return 'M';
}

export interface PreguntaConsejo {
  pregunta: string;
  angulo: string;
}

const MODELO_PENSAR = () => process.env.ANTHROPIC_MODEL_PENSAR || 'claude-sonnet-5';

const PREGUNTAS_RESPALDO: PreguntaConsejo[] = [
  {
    pregunta: '¿Qué evidencia tienen de que la ventana de captura es el verdadero cuello de botella y no simplemente un síntoma de otro problema más profundo?',
    angulo: 'causalidad',
  },
  {
    pregunta: 'Si su diagnóstico es correcto, ¿por qué no todas las sucursales muestran el mismo patrón? ¿Cómo explican la variabilidad?',
    angulo: 'generalizacion',
  },
  {
    pregunta: 'Las intervenciones que proponen tienen costos y tiempos de implementación. ¿Cuál es el riesgo de que empeoren la situación antes de mejorarla?',
    angulo: 'riesgo',
  },
];

export async function generarPreguntasConsejo(
  diagnosticoTexto: string,
  intervencionesTexto: string,
  timeoutMs: number,
): Promise<{ preguntas: PreguntaConsejo[]; fuente: 'ia' | 'respaldo' }> {
  const api = obtenerCliente();
  if (!api) {
    return { preguntas: PREGUNTAS_RESPALDO, fuente: 'respaldo' };
  }

  try {
    const response = await Promise.race([
      api.messages.create({
        model: MODELO_PENSAR(),
        max_tokens: 1024,
        system: `Eres un consejero escéptico del consejo directivo de ETF Bank México.
Un equipo de consultoras externas te presenta su diagnóstico del problema de quejas en el proceso de tarjeta de crédito.
Tu trabajo es hacer preguntas incisivas que cuestionen la solidez de su razonamiento.
NO valides ni rechaces el diagnóstico. Solo cuestiona.
Cada pregunta debe atacar desde un ángulo diferente: causalidad vs correlación, generalización vs caso particular, riesgo de las intervenciones.
Responde SOLO en JSON válido con este formato exacto:
[{"pregunta":"...","angulo":"causalidad"},{"pregunta":"...","angulo":"generalizacion"},{"pregunta":"...","angulo":"riesgo"}]
Español mexicano formal. Tres preguntas exactamente.`,
        messages: [{
          role: 'user',
          content: `El equipo consultor presenta lo siguiente:

DIAGNÓSTICO:
${diagnosticoTexto}

INTERVENCIONES APLICADAS:
${intervencionesTexto}

Genera exactamente 3 preguntas escépticas.`,
        }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs),
      ),
    ]);

    const bloque = response.content.find(b => b.type === 'text');
    if (bloque && bloque.type === 'text') {
      try {
        const jsonMatch = bloque.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as PreguntaConsejo[];
          if (Array.isArray(parsed) && parsed.length >= 3) {
            return { preguntas: parsed.slice(0, 3), fuente: 'ia' };
          }
        }
      } catch { /* parse error, use fallback */ }
    }
    return { preguntas: PREGUNTAS_RESPALDO, fuente: 'respaldo' };
  } catch (err) {
    console.warn('⚠ Error generando preguntas del consejo:', (err as Error).message);
    return { preguntas: PREGUNTAS_RESPALDO, fuente: 'respaldo' };
  }
}

function parlamentoRespaldo(com: ComentarioCliente, sol: Solicitud | undefined, indice: number): ParlamentoCliente {
  const genero = generoDesdeBase(sol);
  return {
    nombre: nombreFicticio(com.id, genero, indice),
    estado: com.estado,
    sucursal: com.sucursal,
    genero,
    intentos: com.intentos,
    texto: com.comentario,
    fuente: 'respaldo',
    tiempoMs: 0,
  };
}
