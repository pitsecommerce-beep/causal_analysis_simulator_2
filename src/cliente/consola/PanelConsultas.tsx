import { useState } from 'react';
import { socket } from '../lib/socket';
import { ejecutarConsulta } from '../lib/consultas-locales';
import {
  CAMPOS_AGRUPACION, CAMPOS_MEDIDA, CAMPOS_NUMERICOS, CAMPOS_SERIE,
  type SolicitudCliente, type ResultadoConsulta, type EntradaBitacoraLocal,
  type IntervencionCatalogo,
} from '../lib/tipos';

interface Props {
  solicitudes: SolicitudCliente[];
  creditosRestantes: number;
  presupuesto: number;
  catalogo: IntervencionCatalogo[];
  onResultado: (resultado: ResultadoConsulta) => void;
  onBitacora: (entrada: EntradaBitacoraLocal) => void;
  onIntervencion: (id: number, sucursales?: number[]) => void;
}

let contadorBitacora = 0;

function TarjetaConsulta({
  nombre, costo, children, onEjecutar, disabled,
}: {
  nombre: string; costo: number; children: React.ReactNode;
  onEjecutar: () => void; disabled: boolean;
}) {
  const [abierta, setAbierta] = useState(false);
  return (
    <div className="tarjeta-consulta">
      <div className="tarjeta-consulta__header" onClick={() => setAbierta(!abierta)}>
        <span className="tarjeta-consulta__nombre">{nombre}</span>
        <span className="tarjeta-consulta__costo">{costo} cr.</span>
      </div>
      {abierta && (
        <div className="tarjeta-consulta__body">
          {children}
          <button className="tarjeta-consulta__ejecutar" onClick={onEjecutar} disabled={disabled}>
            Ejecutar consulta
          </button>
        </div>
      )}
    </div>
  );
}

export function PanelConsultas({ solicitudes, creditosRestantes, presupuesto, catalogo, onResultado, onBitacora, onIntervencion }: Props) {
  const [hipotesis, setHipotesis] = useState('');
  const [segAgrupar, setSegAgrupar] = useState('sucursal');
  const [segMedida, setSegMedida] = useState('erroresCaptura');
  const [corrX, setCorrX] = useState('intentos');
  const [corrY, setCorrY] = useState('ventanaCaptura');
  const [serieVar, setSerieVar] = useState('erroresCaptura');
  const [error, setError] = useState('');
  const [modalSucs, setModalSucs] = useState<number | null>(null);
  const [inputSucs, setInputSucs] = useState('');

  function validarYEjecutar(tipo: string, parametros: Record<string, string>, costo: number) {
    if (!hipotesis.trim()) {
      setError('Escribe la hipotesis antes de ejecutar.');
      return;
    }
    if (creditosRestantes < costo) {
      setError('Creditos insuficientes.');
      return;
    }
    setError('');

    socket.emit('equipo:consulta', { tipo, hipotesis: hipotesis.trim(), parametros }, (resp: any) => {
      if (resp?.error) {
        setError(resp.error);
        return;
      }
    });

    const resultado = ejecutarConsulta(solicitudes, tipo, parametros);
    onResultado(resultado);
    onBitacora({
      id: ++contadorBitacora,
      tipo,
      hipotesis: hipotesis.trim(),
      parametros,
      timestamp: new Date().toLocaleTimeString('es-MX'),
      resultado,
    });
    setHipotesis('');
  }

  const cfgInterv = catalogo.find(i => i.id === modalSucs);

  return (
    <div>
      <h3 className="consultas__titulo">Consultas</h3>
      <div className="consultas__creditos">
        Creditos: {creditosRestantes}/12 | Presupuesto: ${presupuesto}/100
      </div>

      <div className="tarjeta-consulta__campo">
        <label>Hipotesis (obligatoria)</label>
        <textarea
          value={hipotesis}
          onChange={e => setHipotesis(e.target.value)}
          placeholder="Que quieres probar con esta consulta?"
        />
      </div>
      {error && <p style={{ color: 'var(--rojo-600)', fontSize: 12, marginBottom: 8 }}>{error}</p>}

      <TarjetaConsulta nombre="Segmentar" costo={1} disabled={creditosRestantes < 1}
        onEjecutar={() => validarYEjecutar('segmentar', { agrupadoPor: segAgrupar, medida: segMedida }, 1)}>
        <div className="tarjeta-consulta__campo">
          <label>Agrupar por</label>
          <select value={segAgrupar} onChange={e => setSegAgrupar(e.target.value)}>
            {Object.entries(CAMPOS_AGRUPACION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="tarjeta-consulta__campo">
          <label>Medir</label>
          <select value={segMedida} onChange={e => setSegMedida(e.target.value)}>
            {Object.entries(CAMPOS_MEDIDA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </TarjetaConsulta>

      <TarjetaConsulta nombre="Correlacionar" costo={1} disabled={creditosRestantes < 1}
        onEjecutar={() => validarYEjecutar('correlacionar', { variableX: corrX, variableY: corrY }, 1)}>
        <div className="tarjeta-consulta__campo">
          <label>Variable X</label>
          <select value={corrX} onChange={e => setCorrX(e.target.value)}>
            {Object.entries(CAMPOS_NUMERICOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="tarjeta-consulta__campo">
          <label>Variable Y</label>
          <select value={corrY} onChange={e => setCorrY(e.target.value)}>
            {Object.entries(CAMPOS_NUMERICOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </TarjetaConsulta>

      <TarjetaConsulta nombre="Serie de tiempo" costo={1} disabled={creditosRestantes < 1}
        onEjecutar={() => validarYEjecutar('serie_tiempo', { variable: serieVar }, 1)}>
        <div className="tarjeta-consulta__campo">
          <label>Variable</label>
          <select value={serieVar} onChange={e => setSerieVar(e.target.value)}>
            {Object.entries(CAMPOS_SERIE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </TarjetaConsulta>

      <TarjetaConsulta nombre="Embudo" costo={1} disabled={creditosRestantes < 1}
        onEjecutar={() => validarYEjecutar('embudo', {}, 1)}>
        <p style={{ fontSize: 12, color: 'var(--gris-700)' }}>
          Muestra el conteo de solicitudes en cada etapa del proceso.
        </p>
      </TarjetaConsulta>

      <h3 className="intervenciones__titulo">Intervenciones</h3>
      {catalogo.map(item => (
        <div key={item.id} className={`intervencion ${!item.disponible ? 'intervencion--disabled' : ''}`}>
          <span className="intervencion__nombre">{item.nombre}</span>
          <span className="intervencion__costo">${item.costo}</span>
          <button
            className="intervencion__boton"
            disabled={!item.disponible}
            onClick={() => {
              if (item.id === 2) {
                setModalSucs(item.id);
                setInputSucs('');
              } else {
                onIntervencion(item.id);
              }
            }}
          >
            Aplicar
          </button>
        </div>
      ))}
      {catalogo.length > 0 && !catalogo.some(i => i.disponible) && (
        <p style={{ fontSize: 12, color: 'var(--gris-500)', marginTop: 8 }}>
          {presupuesto === 0 ? 'Presupuesto agotado.' : 'No hay intervenciones disponibles.'}
        </p>
      )}

      {modalSucs !== null && (
        <div className="modal-overlay" onClick={() => setModalSucs(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Sucursales a capacitar</h3>
            <p style={{ fontSize: 13, marginBottom: 12, color: 'var(--gris-700)' }}>
              Ingresa los numeros de sucursal separados por coma.
            </p>
            <input
              value={inputSucs}
              onChange={e => setInputSucs(e.target.value)}
              placeholder="110, 676, 728"
            />
            <div className="modal__botones">
              <button onClick={() => setModalSucs(null)}>Cancelar</button>
              <button className="primario" onClick={() => {
                const sucs = inputSucs.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
                if (sucs.length === 0) return;
                onIntervencion(modalSucs, sucs);
                setModalSucs(null);
              }}>Aplicar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
