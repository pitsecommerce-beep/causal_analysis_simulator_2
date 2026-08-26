const DEEPGRAM_TTS_URL = 'https://api.deepgram.com/v1/speak';

export interface OpcionesTTS {
  voz: string;
  modelo?: string;
}

export interface ResultadoAudio {
  audio: Buffer;
  fuente: 'ia' | 'respaldo';
  tiempoMs: number;
}

export function vozDirector(voces: { director: string }): string {
  return voces.director;
}

export function vozCliente(
  genero: string,
  indice: number,
  voces: { clienteM: string[]; clienteF: string[] },
): string {
  if (genero === 'F') {
    return voces.clienteF[indice % voces.clienteF.length];
  }
  return voces.clienteM[indice % voces.clienteM.length];
}

export async function textoAAudio(
  texto: string,
  opciones: OpcionesTTS,
  timeoutMs: number,
): Promise<ResultadoAudio> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    console.warn('⚠ DEEPGRAM_API_KEY no configurada, sin audio');
    return { audio: Buffer.alloc(0), fuente: 'respaldo', tiempoMs: 0 };
  }

  const modelo = opciones.modelo ?? 'aura-2';
  const url = `${DEEPGRAM_TTS_URL}?model=${modelo}&voice=${opciones.voz}&encoding=mp3&sample_rate=24000`;

  const inicio = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

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
    const tiempoMs = Date.now() - inicio;
    return { audio: Buffer.from(arrayBuffer), fuente: 'ia', tiempoMs };
  } catch (err) {
    const tiempoMs = Date.now() - inicio;
    console.warn('⚠ Error generando audio TTS:', (err as Error).message);
    return { audio: Buffer.alloc(0), fuente: 'respaldo', tiempoMs };
  }
}
