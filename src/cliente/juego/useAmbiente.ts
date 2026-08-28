import { useState, useEffect, useRef, useCallback } from 'react';

const VOLUMEN = 0.04;
const FRECUENCIA_CORTE = 200;

export function useAmbiente(): { activo: boolean; alternar: () => void } {
  const [activo, setActivo] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodoRef = useRef<AudioBufferSourceNode | null>(null);

  const iniciar = useCallback(() => {
    if (ctxRef.current) return;

    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const duracion = 4;
    const tamano = ctx.sampleRate * duracion;
    const buffer = ctx.createBuffer(1, tamano, ctx.sampleRate);
    const datos = buffer.getChannelData(0);

    let ultimo = 0;
    for (let i = 0; i < tamano; i++) {
      const blanco = Math.random() * 2 - 1;
      ultimo = (ultimo + 0.02 * blanco) / 1.02;
      datos[i] = ultimo * 3.5;
    }

    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    fuente.loop = true;

    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = FRECUENCIA_CORTE;

    const ganancia = ctx.createGain();
    ganancia.gain.value = VOLUMEN;

    fuente.connect(filtro);
    filtro.connect(ganancia);
    ganancia.connect(ctx.destination);
    fuente.start();
    nodoRef.current = fuente;
  }, []);

  const detener = useCallback(() => {
    nodoRef.current?.stop();
    nodoRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
  }, []);

  const alternar = useCallback(() => {
    setActivo(prev => {
      if (!prev) {
        iniciar();
      } else {
        detener();
      }
      return !prev;
    });
  }, [iniciar, detener]);

  useEffect(() => {
    return () => { detener(); };
  }, [detener]);

  return { activo, alternar };
}
