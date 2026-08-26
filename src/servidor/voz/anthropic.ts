import Anthropic from '@anthropic-ai/sdk';
import type { ComentarioCliente } from '../datos/tipos.js';

const MODELO_PENSAR = () => process.env.ANTHROPIC_MODEL_PENSAR || 'claude-sonnet-5';
const MODELO_REDACTAR = () => process.env.ANTHROPIC_MODEL_REDACTAR || 'claude-haiku-4-5';
const TIMEOUT_MS = 12_000;

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
}

export interface ParlamentoCliente {
  nombre: string;
  estado: string;
  sucursal: number;
  genero: string;
  texto: string;
  fuente: 'ia' | 'respaldo';
}

export async function generarDiscursoDirector(
  totalSolicitudes: number,
  totalComentarios: number,
  totalSucursales: number,
): Promise<ResultadoDiscurso> {
  const api = obtenerCliente();
  if (!api) {
    console.warn('⚠ ANTHROPIC_API_KEY no configurada, usando discurso de respaldo');
    return { texto: discursoRespaldo(), fuente: 'respaldo' };
  }

  try {
    const response = await Promise.race([
      api.messages.create({
        model: MODELO_REDACTAR(),
        max_tokens: 1024,
        system: `Eres Ramón Betancourt, Director de Banca al Menudeo de ETF Bank México.
Tono: impaciente pero profesional, no hostil. Hablas en primera persona.
Tu audiencia es un equipo de consultores (los participantes del simulador).
NUNCA reveles hallazgos, conclusiones ni causas raíz. Solo presentas el problema.
Máximo 320 palabras. Español mexicano formal.`,
        messages: [{
          role: 'user',
          content: `Redacta el discurso de apertura de Ramón Betancourt para los consultores.

Datos que debe cubrir:
- ETF Bank tiene un problema grave de quejas de clientes en su proceso de tarjeta de crédito
- Se analizará una muestra de ${totalSolicitudes} solicitudes reales
- Hay ${totalComentarios} comentarios directos de clientes
- El proceso involucra ${totalSucursales} sucursales
- El flujo del proceso tiene tres actores: sucursales (captura), CrOP central (back office), y buró de crédito
- Mandato: necesita razonamiento cuidadoso y lógico, no opiniones, no adivinanzas
- Tienen tiempo limitado (50 minutos simulados en el juego)

NO menciones causas, NO digas qué está mal, NO sugieras soluciones. Solo describe la situación y el mandato.`,
        }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS),
      ),
    ]);

    const bloque = response.content.find(b => b.type === 'text');
    if (bloque && bloque.type === 'text') {
      return { texto: bloque.text, fuente: 'ia' };
    }
    return { texto: discursoRespaldo(), fuente: 'respaldo' };
  } catch (err) {
    console.warn('⚠ Error generando discurso con IA:', (err as Error).message);
    return { texto: discursoRespaldo(), fuente: 'respaldo' };
  }
}

export async function generarParlamentosClientes(
  comentarios: ComentarioCliente[],
  semilla: number,
): Promise<ParlamentoCliente[]> {
  const seleccionados = sortearComentarios(comentarios, semilla);

  const api = obtenerCliente();
  if (!api) {
    console.warn('⚠ ANTHROPIC_API_KEY no configurada, usando parlamentos de respaldo');
    return seleccionados.map(c => parlamentoRespaldo(c));
  }

  const resultados: ParlamentoCliente[] = [];

  for (const com of seleccionados) {
    try {
      const response = await Promise.race([
        api.messages.create({
          model: MODELO_REDACTAR(),
          max_tokens: 512,
          system: `Conviertes un registro de comentario de cliente bancario en un parlamento en primera persona.
El cliente habla de su experiencia real. Usa los datos exactos del registro (intentos, fechas, sucursal).
NO inventes cifras. Si el registro dice 6 intentos, el cliente dice "seis intentos".
Español mexicano coloquial pero respetuoso. Máximo 80 palabras.
Empieza directamente con el parlamento, sin comillas ni acotaciones.`,
          messages: [{
            role: 'user',
            content: `Registro del cliente:
- Solicitud #${com.solicitudId}
- Estado: ${com.estado}
- Sucursal: ${com.sucursal}
- Intentos: ${com.intentos}
- Canal: ${com.canalCaptacion}
- Categoría: ${com.categoriaPrimaria}${com.categoriaSecundaria ? ` / ${com.categoriaSecundaria}` : ''}
- Comentario original: "${com.comentario}"

Genera el parlamento en primera persona de este cliente.`,
          }],
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS),
        ),
      ]);

      const bloque = response.content.find(b => b.type === 'text');
      if (bloque && bloque.type === 'text') {
        resultados.push({
          nombre: nombreFicticio(com, resultados.length),
          estado: com.estado,
          sucursal: com.sucursal,
          genero: inferirGenero(com),
          texto: bloque.text,
          fuente: 'ia',
        });
      } else {
        resultados.push(parlamentoRespaldo(com));
      }
    } catch (err) {
      console.warn(`⚠ Error generando parlamento cliente ${com.id}:`, (err as Error).message);
      resultados.push(parlamentoRespaldo(com));
    }
  }

  return resultados;
}

function sortearComentarios(comentarios: ComentarioCliente[], semilla: number): ComentarioCliente[] {
  const reproceso = comentarios.filter(c =>
    c.categoriaPrimaria.toLowerCase().includes('reproceso')
    || c.categoriaPrimaria.toLowerCase().includes('documento')
    || c.categoriaPrimaria.toLowerCase().includes('error'),
  );
  const atorado = comentarios.filter(c =>
    c.categoriaPrimaria.toLowerCase().includes('atorad')
    || c.categoriaPrimaria.toLowerCase().includes('espera')
    || c.comentario.toLowerCase().includes('no me ha llegado'),
  );
  const rechazo = comentarios.filter(c =>
    c.categoriaPrimaria.toLowerCase().includes('rechaz')
    || c.categoriaPrimaria.toLowerCase().includes('línea')
    || c.categoriaPrimaria.toLowerCase().includes('linea')
    || c.categoriaPrimaria.toLowerCase().includes('monto'),
  );

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

function nombreFicticio(com: ComentarioCliente, indice: number): string {
  const genero = inferirGenero(com);
  const nombres = genero === 'F' ? NOMBRES_F : NOMBRES_M;
  return nombres[indice % nombres.length];
}

function inferirGenero(com: ComentarioCliente): string {
  const lower = com.comentario.toLowerCase();
  if (lower.includes('señora') || lower.includes('clienta')) return 'F';
  if (lower.includes('señor') || lower.includes('cliente')) return 'M';
  return com.solicitudId % 2 === 0 ? 'F' : 'M';
}

function discursoRespaldo(): string {
  return `Buenos días. Soy Ramón Betancourt, Director de Banca al Menudeo de ETF Bank.

Los he convocado porque tenemos un problema serio. Las quejas de clientes en nuestro proceso de tarjeta de crédito se han disparado. No estoy hablando de percepciones: tenemos datos concretos.

Frente a ustedes tienen acceso a una muestra de mil quinientas solicitudes reales de nuestro proceso. Además contamos con noventa comentarios directos de clientes que han pasado por este proceso. Son sus palabras, no las mías.

Nuestro proceso involucra tres actores principales. Primero, las sucursales donde se captura la solicitud. Segundo, nuestro centro de operaciones, el CrOP, donde se procesa la documentación. Y tercero, el buró de crédito para la evaluación crediticia. En algún punto de esta cadena, o en varios, algo está fallando.

Lo que necesito de ustedes es un diagnóstico basado en evidencia. No quiero opiniones, no quiero corazonadas, no quiero que adivinen. Quiero que analicen los datos, identifiquen las causas raíz reales y me propongan intervenciones que podamos implementar.

Tienen tiempo limitado. Úsenlo bien. Cada consulta que hagan tiene un costo, así que piensen antes de actuar. Un buen diagnóstico vale más que cien gráficas bonitas.

Adelante.`;
}

function parlamentoRespaldo(com: ComentarioCliente): ParlamentoCliente {
  return {
    nombre: nombreFicticio(com, 0),
    estado: com.estado,
    sucursal: com.sucursal,
    genero: inferirGenero(com),
    texto: com.comentario,
    fuente: 'respaldo',
  };
}
