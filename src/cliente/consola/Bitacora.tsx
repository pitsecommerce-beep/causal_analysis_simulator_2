import type { EntradaBitacoraLocal } from '../lib/tipos';

interface Props {
  entradas: EntradaBitacoraLocal[];
  onSeleccionar: (entrada: EntradaBitacoraLocal) => void;
}

const NOMBRES_TIPO: Record<string, string> = {
  segmentar: 'Segmentar',
  correlacionar: 'Correlacionar',
  serie_tiempo: 'Serie de tiempo',
  embudo: 'Embudo',
  intervenir: 'Intervenir',
};

export function Bitacora({ entradas, onSeleccionar }: Props) {
  return (
    <div>
      <h3 className="bitacora__titulo">Bitácora de consultas</h3>
      {entradas.length === 0 ? (
        <p className="bitacora__vacia">Aún no has ejecutado consultas.</p>
      ) : (
        <table className="bitacora__tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Hora</th>
              <th>Tipo</th>
              <th>Hipótesis</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {[...entradas].reverse().map(e => (
              <tr key={e.id} onClick={() => onSeleccionar(e)} style={{ cursor: 'pointer' }}>
                <td className="mono">{e.id}</td>
                <td className="mono">{e.timestamp}</td>
                <td>{NOMBRES_TIPO[e.tipo] ?? e.tipo}</td>
                <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.hipotesis}
                </td>
                <td className="mono" style={{ fontSize: 11 }}>
                  {resumenResultado(e)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function resumenResultado(e: EntradaBitacoraLocal): string {
  if (!e.resultado) return '-';
  switch (e.resultado.tipo) {
    case 'segmentar':
      return `${e.resultado.datos.length} cat.`;
    case 'correlacionar':
      return `r=${e.resultado.pearson.toFixed(3)}, n=${e.resultado.n}`;
    case 'serie_tiempo':
      return `${e.resultado.datos.length} meses`;
    case 'embudo':
      return `${e.resultado.etapas.length} etapas`;
    default:
      return '-';
  }
}
