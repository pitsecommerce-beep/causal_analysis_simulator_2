import type { ResultadoPuntuacion, PreguntaConsejo, KPIsCliente } from '../lib/tipos';
import { NOMBRES_FINALES } from '../lib/tipos';

interface Props {
  resultado: ResultadoPuntuacion;
  preguntas: PreguntaConsejo[];
  historialKPIs: KPIsCliente[];
  nombreEquipo: string;
}

const CATEGORIAS: { key: keyof ResultadoPuntuacion; label: string; max: number }[] = [
  { key: 'diagnostico', label: 'Diagnostico', max: 350 },
  { key: 'rigor', label: 'Rigor', max: 200 },
  { key: 'impacto', label: 'Impacto', max: 300 },
  { key: 'velocidad', label: 'Velocidad', max: 100 },
  { key: 'eficiencia', label: 'Eficiencia', max: 50 },
];

function BarraPuntaje({ label, valor, max }: { label: string; valor: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (valor / max) * 100));
  return (
    <div className="tablero__barra">
      <span className="tablero__barra-label">{label}</span>
      <div className="tablero__barra-track">
        <div className="tablero__barra-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="tablero__barra-valor">{valor}/{max}</span>
    </div>
  );
}

export function TableroFinal({ resultado, preguntas, historialKPIs, nombreEquipo }: Props) {
  const medallaEmoji = resultado.total >= 900 ? '1' : resultado.total >= 700 ? '2' : resultado.total >= 450 ? '3' : '';

  return (
    <div className="tablero">
      <header className="tablero__header">
        <h2>{nombreEquipo}</h2>
        <div className="tablero__total">
          {medallaEmoji && <span className="tablero__medalla">#{medallaEmoji}</span>}
          <span className="tablero__puntos">{resultado.total}</span>
          <span className="tablero__max">/ 1000 pts</span>
        </div>
        <div className={`tablero__final tablero__final--${resultado.final.toLowerCase()}`}>
          Final {resultado.final}: {NOMBRES_FINALES[resultado.final]}
        </div>
      </header>

      <section className="tablero__desglose">
        <h3>Desglose de puntuacion</h3>
        {CATEGORIAS.map(c => (
          <BarraPuntaje key={c.key} label={c.label} valor={resultado[c.key] as number} max={c.max} />
        ))}
        {resultado.penalizaciones !== 0 && (
          <div className="tablero__penalizacion">
            Penalizaciones: {resultado.penalizaciones} pts
          </div>
        )}
      </section>

      {historialKPIs.length > 1 && (
        <section className="tablero__trayectoria">
          <h3>Trayectoria KPIs</h3>
          <table className="tablero__tabla-kpis">
            <thead>
              <tr>
                <th>Trimestre</th>
                <th>Captura (med.)</th>
                <th>Quejas</th>
                <th>Conversion</th>
                <th>Errores</th>
                <th>Atorados</th>
              </tr>
            </thead>
            <tbody>
              {historialKPIs.map((k, i) => (
                <tr key={i}>
                  <td>T{i}</td>
                  <td>{k.ventanaCapturaMediana.toFixed(1)}</td>
                  <td>{k.quejas}</td>
                  <td>{k.conversion.toFixed(1)}%</td>
                  <td>{k.erroresTotales}</td>
                  <td>{k.atorados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {preguntas.length > 0 && (
        <section className="tablero__consejo">
          <h3>El consejo del banco pregunta</h3>
          {preguntas.map((p, i) => (
            <div key={i} className="tablero__pregunta">
              <span className="tablero__pregunta-num">{i + 1}</span>
              <div>
                <p className="tablero__pregunta-texto">{p.pregunta}</p>
                <span className="tablero__pregunta-angulo">{p.angulo}</span>
              </div>
            </div>
          ))}
        </section>
      )}

      {resultado.desglose && Object.keys(resultado.desglose).length > 0 && (
        <details className="tablero__detalles">
          <summary>Ver desglose detallado</summary>
          <table className="tablero__tabla-desglose">
            <tbody>
              {Object.entries(resultado.desglose).map(([key, val]) => (
                <tr key={key}>
                  <td>{key.replace(/_/g, ' ')}</td>
                  <td className={val < 0 ? 'tablero__negativo' : ''}>{val > 0 ? '+' : ''}{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
