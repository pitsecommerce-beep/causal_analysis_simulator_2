import type { EstadoReloj } from '../lib/tipos';
import { NOMBRES_FASES } from '../lib/tipos';

interface Props {
  reloj: EstadoReloj;
}

function formatearTiempo(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const seg = Math.floor(segundos % 60);
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
}

export function Reloj({ reloj }: Props) {
  const nombreFase = NOMBRES_FASES[reloj.fase] ?? reloj.fase;

  return (
    <div className="reloj">
      <span className={`reloj__fase ${reloj.pausado ? 'reloj__fase--pausado' : ''}`}>
        {nombreFase}
        {reloj.pausado && ' (pausado)'}
      </span>
      <span className="reloj__tiempo">{formatearTiempo(reloj.segundoActual)}</span>
    </div>
  );
}
