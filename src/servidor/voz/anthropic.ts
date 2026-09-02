import Anthropic from '@anthropic-ai/sdk';
import type { ComentarioCliente, Solicitud } from '../datos/tipos.js';

let cliente: Anthropic | null = null;

function obtenerCliente(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!cliente) {
    cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cliente;
}

export interface ParlamentoCliente {
  commentId: string;
  nombre: string;
  apellido: string;
  estado: string;
  sucursal: number;
  genero: string;
  intentos: number;
  texto: string;
  fuente: 'directo';
  tiempoMs: number;
}

export function validarTerminosProhibidos(texto: string, terminos: string[]): boolean {
  const lower = texto.toLowerCase();
  for (const t of terminos) {
    if (lower.includes(t.toLowerCase())) return false;
  }
  return true;
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

const NOMBRES_F = [
  'María', 'Guadalupe', 'Ana', 'Patricia', 'Laura', 'Carmen', 'Rosa', 'Claudia',
  'Sofía', 'Valentina', 'Daniela', 'Fernanda', 'Alejandra', 'Gabriela', 'Mariana', 'Lucía',
  'Regina', 'Jimena', 'Camila', 'Renata', 'Isabella', 'Andrea', 'Natalia', 'Paulina',
];
const NOMBRES_M = [
  'Carlos', 'Jorge', 'Miguel', 'Roberto', 'Fernando', 'Pedro', 'Luis', 'Antonio',
  'Andrés', 'Diego', 'Santiago', 'Sebastián', 'Emilio', 'Alejandro', 'Ricardo', 'Javier',
  'Eduardo', 'Héctor', 'Rodrigo', 'Tomás', 'Arturo', 'Martín', 'Rafael', 'Iván',
];
const APELLIDOS = [
  'Villalobos', 'Mendoza', 'Castillo', 'Herrera', 'Ríos', 'Paredes', 'Salazar', 'Navarro',
  'Delgado', 'Guzmán', 'Estrada', 'Coronado', 'Fuentes', 'Aguilar', 'Cervantes', 'Montes',
  'Tapia', 'Rangel', 'Sandoval', 'Ibarra', 'Valdez', 'Carrillo', 'Maldonado', 'Reyes',
];

export interface IdentidadAsignada {
  nombre: string;
  apellido: string;
}

export function asignarNombres(generos: string[], semilla: number): IdentidadAsignada[] {
  let rng = semilla;
  function siguiente(): number {
    rng = (rng * 1664525 + 1013904223) & 0x7fffffff;
    return rng;
  }

  const nombresUsados = new Set<string>();
  const apellidosUsados = new Set<string>();
  const resultado: IdentidadAsignada[] = [];

  for (let i = 0; i < generos.length; i++) {
    const lista = generos[i] === 'F' ? NOMBRES_F : NOMBRES_M;
    const inicio = siguiente() % lista.length;
    let nombre = lista[inicio];
    for (let j = 0; j < lista.length; j++) {
      const candidato = lista[(inicio + j) % lista.length];
      if (!nombresUsados.has(candidato)) {
        nombre = candidato;
        break;
      }
    }
    nombresUsados.add(nombre);

    const inicioAp = siguiente() % APELLIDOS.length;
    let apellido = APELLIDOS[inicioAp];
    for (let j = 0; j < APELLIDOS.length; j++) {
      const candidato = APELLIDOS[(inicioAp + j) % APELLIDOS.length];
      if (!apellidosUsados.has(candidato)) {
        apellido = candidato;
        break;
      }
    }
    apellidosUsados.add(apellido);

    resultado.push({ nombre, apellido });
  }

  return resultado;
}

function generoDesdeBase(sol: Solicitud | undefined): string {
  if (!sol) return 'M';
  const g = sol.genero.toLowerCase();
  if (g.includes('female') || g.includes('femenin')) return 'F';
  return 'M';
}

export function generarParlamentosDirectos(
  comentarios: ComentarioCliente[],
  solicitudes: Solicitud[],
  semilla: number,
): ParlamentoCliente[] {
  const seleccionados = sortearComentarios(comentarios, semilla);
  const indiceSolicitud = new Map(solicitudes.map(s => [s.id, s]));

  const generos = seleccionados.map(com => {
    const sol = indiceSolicitud.get(com.solicitudId);
    return generoDesdeBase(sol);
  });

  const identidades = asignarNombres(generos, semilla);

  return seleccionados.map((com, i) => ({
    commentId: com.id,
    nombre: `${identidades[i].nombre} ${identidades[i].apellido}`,
    apellido: identidades[i].apellido,
    estado: com.estado,
    sucursal: com.sucursal,
    genero: generos[i],
    intentos: com.intentos,
    texto: com.comentario,
    fuente: 'directo' as const,
    tiempoMs: 0,
  }));
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
