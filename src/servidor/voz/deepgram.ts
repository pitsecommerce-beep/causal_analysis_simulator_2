const TIMEOUT_MS = 12_000;
const DEEPGRAM_TTS_URL = 'https://api.deepgram.com/v1/speak';

export interface OpcionesTTS {
  voz: string;
  modelo?: string;
}

export interface ResultadoAudio {
  audio: Buffer;
  fuente: 'ia' | 'respaldo';
}

const VOCES = {
  director: 'aura-2-javier-es',
  clienteF: ['aura-2-carina-es', 'aura-2-diana-es', 'aura-2-selena-es'],
  clienteM: ['aura-2-aquila-es'],
} as const;

export function vozDirector(): string {
  return VOCES.director;
}

export function vozCliente(genero: string, indice: number): string {
  if (genero === 'F') {
    return VOCES.clienteF[indice % VOCES.clienteF.length];
  }
  return VOCES.clienteM[indice % VOCES.clienteM.length];
}

export async function textoAAudio(
  texto: string,
  opciones: OpcionesTTS,
): Promise<ResultadoAudio> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    console.warn('⚠ DEEPGRAM_API_KEY no configurada, sin audio');
    return { audio: Buffer.alloc(0), fuente: 'respaldo' };
  }

  const modelo = opciones.modelo ?? 'aura-2';
  const url = `${DEEPGRAM_TTS_URL}?model=${modelo}&voice=${opciones.voz}&encoding=mp3&sample_rate=24000`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: texto }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Deepgram ${response.status}: ${body.slice(0, 200)}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return { audio: Buffer.from(arrayBuffer), fuente: 'ia' };
  } catch (err) {
    console.warn('⚠ Error generando audio TTS:', (err as Error).message);
    return { audio: Buffer.alloc(0), fuente: 'respaldo' };
  }
}
