import { useEffect, useRef, useState, useCallback } from 'react';
import { socket } from './socket';

export type EstadoPresencia =
  | 'idle'
  | 'tecleando'
  | 'consultando'
  | 'decidiendo'
  | 'esperando'
  | 'desconectado';

export interface PresenciaPar {
  participante: string;
  estado: EstadoPresencia;
}

export function usePresencia(miNombre: string | null) {
  const [pares, setPares] = useState<Map<string, EstadoPresencia>>(new Map());
  const estadoLocalRef = useRef<EstadoPresencia>('idle');
  const throttleRef = useRef(0);

  useEffect(() => {
    function onPresencia(data: PresenciaPar) {
      if (!data?.participante) return;
      setPares(prev => {
        const next = new Map(prev);
        next.set(data.participante, data.estado);
        return next;
      });
    }

    socket.on('equipo:presencia', onPresencia);
    return () => { socket.off('equipo:presencia', onPresencia); };
  }, []);

  const emitir = useCallback((estado: EstadoPresencia) => {
    if (!miNombre) return;
    if (estado === estadoLocalRef.current) return;
    const ahora = Date.now();
    if (ahora - throttleRef.current < 200) return;
    throttleRef.current = ahora;
    estadoLocalRef.current = estado;
    socket.emit('equipo:presencia', { estado });
  }, [miNombre]);

  return { pares, emitir };
}
