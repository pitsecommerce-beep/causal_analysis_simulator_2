import { useEffect, useState, useCallback } from 'react';
import { NOMBRES_FASES } from '../lib/tipos';

interface Props {
  faseNueva: string;
  onTerminada: () => void;
}

const DURACION_MS = 1500;

export function TransicionFase({ faseNueva, onTerminada }: Props) {
  const [visible, setVisible] = useState(true);

  const saltar = useCallback(() => {
    setVisible(false);
    onTerminada();
  }, [onTerminada]);

  useEffect(() => {
    const timer = setTimeout(saltar, DURACION_MS);
    return () => clearTimeout(timer);
  }, [saltar]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        saltar();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saltar]);

  if (!visible) return null;

  const nombre = NOMBRES_FASES[faseNueva] ?? faseNueva;

  return (
    <div className="transicion-fase" onClick={saltar}>
      <div className="transicion-fase__contenido">
        <span className="transicion-fase__nombre">{nombre}</span>
      </div>
      <span className="transicion-fase__saltar">Clic o Esc para saltar</span>
    </div>
  );
}
