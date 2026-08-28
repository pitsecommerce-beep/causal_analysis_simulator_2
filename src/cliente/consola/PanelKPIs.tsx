import type { KPIsCliente, EstadoMotorCliente } from '../lib/tipos';

interface Props {
  estado: EstadoMotorCliente;
}

function Delta({ actual, base, mejorSiMenor = true }: { actual: number; base: number; mejorSiMenor?: boolean }) {
  const diff = actual - base;
  if (Math.abs(diff) < 0.1) return null;
  const mejor = mejorSiMenor ? diff < 0 : diff > 0;
  const signo = diff > 0 ? '+' : '';
  return (
    <span className={`kpi__delta ${mejor ? 'kpi__delta--mejor' : 'kpi__delta--peor'}`}>
      {' '}{signo}{diff.toFixed(1)}
    </span>
  );
}

export function PanelKPIs({ estado }: Props) {
  const { kpis, kpisBase } = estado;

  return (
    <div>
      <h3 className="kpis__titulo">KPIs del sistema</h3>
      <div className="kpis__lista">
        <div className="kpi">
          <div className="kpi__etiqueta">Ventana captura (mediana)</div>
          <div className="kpi__valor">
            {kpis.ventanaCapturaMediana.toFixed(1)} d
            <Delta actual={kpis.ventanaCapturaMediana} base={kpisBase.ventanaCapturaMediana} />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__etiqueta">Quejas</div>
          <div className="kpi__valor">
            {kpis.quejas}
            <Delta actual={kpis.quejas} base={kpisBase.quejas} />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__etiqueta">Conversión</div>
          <div className="kpi__valor">
            {kpis.conversion.toFixed(1)}%
            <Delta actual={kpis.conversion} base={kpisBase.conversion} mejorSiMenor={false} />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__etiqueta">Atorados</div>
          <div className="kpi__valor">
            {kpis.atorados} ({kpis.atoradosPct}%)
            <Delta actual={kpis.atorados} base={kpisBase.atorados} />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__etiqueta">Trabajo perdido</div>
          <div className="kpi__valor">
            {kpis.trabajoPerdidoDias.toLocaleString()} d
            <Delta actual={kpis.trabajoPerdidoDias} base={kpisBase.trabajoPerdidoDias} />
          </div>
        </div>

        <div className="kpi-seccion">Errores</div>
        <div className="kpi">
          <div className="kpi__etiqueta">Errores captura</div>
          <div className="kpi__valor">
            {kpis.erroresCaptura}
            <Delta actual={kpis.erroresCaptura} base={kpisBase.erroresCaptura} />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__etiqueta">Incompletos</div>
          <div className="kpi__valor">
            {kpis.incompletos}
            <Delta actual={kpis.incompletos} base={kpisBase.incompletos} />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__etiqueta">Ilegibles</div>
          <div className="kpi__valor">
            {kpis.ilegibles}
            <Delta actual={kpis.ilegibles} base={kpisBase.ilegibles} />
          </div>
        </div>

        <div className="kpi-seccion">Back office</div>
        <div className="kpi">
          <div className="kpi__etiqueta">Back office (mediana)</div>
          <div className="kpi__valor">
            {kpis.backofficeMediana} d
            <Delta actual={kpis.backofficeMediana} base={kpisBase.backofficeMediana} />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__etiqueta">Costo operativo</div>
          <div className="kpi__valor">
            {kpis.costoOperativo}
            <Delta actual={kpis.costoOperativo} base={kpisBase.costoOperativo} />
          </div>
        </div>
      </div>

      {estado.eventosActivos.length > 0 && (
        <div className="eventos">
          <div className="kpi-seccion">Eventos activos</div>
          {estado.eventosActivos.map(ev => (
            <div key={ev.id} className="evento">
              {ev.nombre} ({ev.trimestresFaltantes} trim. restante{ev.trimestresFaltantes > 1 ? 's' : ''})
            </div>
          ))}
        </div>
      )}

      {estado.penalizaciones.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="kpi-seccion">Penalizaciones</div>
          {estado.penalizaciones.map((p, i) => (
            <div key={i} className="penalizacion">
              {p.descripcion} ({p.puntos} pts)
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
