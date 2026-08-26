import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, LineChart, Line,
} from 'recharts';
import type { ResultadoConsulta } from '../lib/tipos';
import { CAMPOS_AGRUPACION, CAMPOS_MEDIDA, CAMPOS_NUMERICOS, CAMPOS_SERIE } from '../lib/tipos';

interface Props {
  resultado: ResultadoConsulta | null;
}

export function GraficaResultado({ resultado }: Props) {
  if (!resultado) {
    return (
      <div className="resultado__vacio">
        <span style={{ fontSize: 32 }}>&#128202;</span>
        <span>Ejecuta una consulta para ver los resultados</span>
      </div>
    );
  }

  switch (resultado.tipo) {
    case 'segmentar':
      return (
        <div>
          <h2 className="resultado__titulo">
            {CAMPOS_MEDIDA[resultado.medida] ?? resultado.medida} por {CAMPOS_AGRUPACION[resultado.agrupadoPor] ?? resultado.agrupadoPor}
          </h2>
          <ResponsiveContainer width="100%" height={Math.max(300, resultado.datos.length * 32)}>
            <BarChart data={resultado.datos} layout="vertical" margin={{ left: 80, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="categoria" width={70} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => [v, CAMPOS_MEDIDA[resultado.medida] ?? resultado.medida]} />
              <Bar dataKey="valor" fill="#3182ce" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );

    case 'correlacionar':
      return (
        <div>
          <h2 className="resultado__titulo">
            {CAMPOS_NUMERICOS[resultado.variableX] ?? resultado.variableX} vs {CAMPOS_NUMERICOS[resultado.variableY] ?? resultado.variableY}
          </h2>
          <div className="resultado__stats">
            <div className="resultado__stat">
              <strong>r = </strong>{resultado.pearson.toFixed(3)}
            </div>
            <div className="resultado__stat">
              <strong>n = </strong>{resultado.n}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ left: 20, right: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name={CAMPOS_NUMERICOS[resultado.variableX] ?? resultado.variableX} tick={{ fontSize: 12 }} />
              <YAxis type="number" dataKey="y" name={CAMPOS_NUMERICOS[resultado.variableY] ?? resultado.variableY} tick={{ fontSize: 12 }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={resultado.datos} fill="#3182ce" fillOpacity={0.5} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      );

    case 'serie_tiempo':
      return (
        <div>
          <h2 className="resultado__titulo">
            {CAMPOS_SERIE[resultado.variable] ?? resultado.variable} por mes
          </h2>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={resultado.datos} margin={{ left: 20, right: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, angle: -45 }} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="valor" stroke="#3182ce" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );

    case 'embudo':
      const maxVal = resultado.etapas[0]?.cantidad ?? 1;
      return (
        <div>
          <h2 className="resultado__titulo">Embudo del proceso</h2>
          <div className="embudo">
            {resultado.etapas.map((etapa, i) => (
              <div key={i} className="embudo__etapa">
                <span className="embudo__nombre">{etapa.nombre}</span>
                <div className="embudo__barra-fondo">
                  <div
                    className="embudo__barra"
                    style={{
                      width: `${(etapa.cantidad / maxVal) * 100}%`,
                      opacity: 1 - i * 0.12,
                    }}
                  />
                </div>
                <span className="embudo__valor">{etapa.cantidad} ({etapa.porcentaje}%)</span>
              </div>
            ))}
          </div>
        </div>
      );
  }
}
