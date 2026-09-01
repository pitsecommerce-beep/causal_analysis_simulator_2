import { useRef, useCallback, useEffect } from 'react';

type SonidoId =
  | 'laptop-abrir'
  | 'laptop-cerrar'
  | 'publicar'
  | 'peticion'
  | 'autorizar'
  | 'fase-cambio';

const VOLUMEN = 0.12;

function generarTono(
  ctx: AudioContext,
  frecuencia: number,
  duracion: number,
  tipo: OscillatorType = 'sine',
  volumen = VOLUMEN,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = tipo;
  osc.frequency.value = frecuencia;
  gain.gain.setValueAtTime(volumen, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracion);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duracion);
}

const SONIDOS: Record<SonidoId, (ctx: AudioContext) => void> = {
  'laptop-abrir': (ctx) => {
    generarTono(ctx, 440, 0.08, 'sine', 0.06);
    setTimeout(() => generarTono(ctx, 660, 0.06, 'sine', 0.05), 60);
  },
  'laptop-cerrar': (ctx) => {
    generarTono(ctx, 520, 0.06, 'sine', 0.05);
    setTimeout(() => generarTono(ctx, 380, 0.08, 'sine', 0.04), 40);
  },
  'publicar': (ctx) => {
    generarTono(ctx, 523, 0.1, 'triangle', 0.08);
    setTimeout(() => generarTono(ctx, 659, 0.1, 'triangle', 0.07), 80);
    setTimeout(() => generarTono(ctx, 784, 0.15, 'triangle', 0.06), 160);
  },
  'peticion': (ctx) => {
    generarTono(ctx, 440, 0.12, 'sine', 0.07);
    setTimeout(() => generarTono(ctx, 554, 0.12, 'sine', 0.06), 120);
  },
  'autorizar': (ctx) => {
    generarTono(ctx, 392, 0.1, 'triangle', 0.06);
    setTimeout(() => generarTono(ctx, 523, 0.15, 'triangle', 0.06), 100);
  },
  'fase-cambio': (ctx) => {
    generarTono(ctx, 330, 0.15, 'sine', 0.08);
    setTimeout(() => generarTono(ctx, 440, 0.15, 'sine', 0.07), 150);
    setTimeout(() => generarTono(ctx, 523, 0.2, 'sine', 0.06), 300);
  },
};

export function useSonidos() {
  const ctxRef = useRef<AudioContext | null>(null);
  const silenciadoRef = useRef(false);

  function obtenerCtx(): AudioContext {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }

  const reproducir = useCallback((id: SonidoId) => {
    if (silenciadoRef.current) return;
    const fn = SONIDOS[id];
    if (!fn) return;
    try {
      fn(obtenerCtx());
    } catch { /* audio context may not be available */ }
  }, []);

  const silenciar = useCallback((valor: boolean) => {
    silenciadoRef.current = valor;
  }, []);

  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, []);

  return { reproducir, silenciar };
}
