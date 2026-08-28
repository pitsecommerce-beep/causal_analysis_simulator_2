import { useState } from 'react';
import { socket } from '../lib/socket';
import type { PropuestaIntervencion, IntervencionCatalogo, RolEquipo } from '../lib/tipos';
import { NOMBRES_ROLES } from '../lib/tipos';

interface Props {
  propuestas: PropuestaIntervencion[];
  catalogo: IntervencionCatalogo[];
  presupuesto: number;
  esPatrocinador: boolean;
  miRol: RolEquipo | null;
  miNombre: string | null;
  onMensaje: (msg: string) => void;
}

export function PanelPropuestas({
  propuestas, catalogo, presupuesto, esPatrocinador, miRol, miNombre, onMensaje,
}: Props) {
  const [justificacion, setJustificacion] = useState('');
  const [intervencionSel, setIntervencionSel] = useState<number | null>(null);
  const [inputSucs, setInputSucs] = useState('');
  const [modalSucs, setModalSucs] = useState<number | null>(null);
  const [respuesta, setRespuesta] = useState('');

  const pendientes = propuestas.filter(p => p.estado === 'pendiente');
  const resueltas = propuestas.filter(p => p.estado !== 'pendiente');
  const disponibles = catalogo.filter(c => c.disponible);

  function enviarPropuesta(id: number, sucursales?: number[]) {
    if (!justificacion.trim()) {
      onMensaje('Escribe una justificación para la propuesta.');
      return;
    }
    socket.emit('equipo:proponer_intervencion', {
      intervencionId: id,
      justificacion: justificacion.trim(),
      sucursales,
    }, (resp: any) => {
      if (resp?.error) {
        onMensaje(resp.error);
        return;
      }
      setJustificacion('');
      setIntervencionSel(null);
      onMensaje('Propuesta enviada al Patrocinador.');
    });
  }

  function responderPropuesta(propuestaId: string, decision: 'aprobada' | 'rechazada') {
    socket.emit('equipo:responder_propuesta', {
      propuestaId,
      decision,
      respuesta: respuesta.trim() || undefined,
    }, (resp: any) => {
      if (resp?.error) {
        onMensaje(resp.error);
        return;
      }
      setRespuesta('');
      onMensaje(decision === 'aprobada' ? 'Intervención aprobada y aplicada.' : 'Propuesta rechazada.');
    });
  }

  return (
    <div className="panel-propuestas">
      <h3 className="panel-propuestas__titulo">Propuestas de intervención</h3>

      {pendientes.length > 0 && (
        <div className="panel-propuestas__pendientes">
          <h4>Pendientes</h4>
          {pendientes.map(p => (
            <div key={p.id} className="propuesta propuesta--pendiente">
              <div className="propuesta__header">
                <strong>{p.intervencionNombre}</strong>
                <span className="propuesta__costo">${p.costo}</span>
              </div>
              <p className="propuesta__justificacion">"{p.justificacion}"</p>
              <p className="propuesta__autor">
                Propuesta por {p.propuestoPor} ({NOMBRES_ROLES[p.rolPropuesto]})
              </p>
              {esPatrocinador && (
                <div className="propuesta__acciones">
                  <input
                    className="propuesta__respuesta-input"
                    value={respuesta}
                    onChange={e => setRespuesta(e.target.value)}
                    placeholder="Comentario (opcional)"
                  />
                  <div className="propuesta__botones">
                    <button
                      className="propuesta__btn propuesta__btn--aprobar"
                      onClick={() => responderPropuesta(p.id, 'aprobada')}
                    >
                      Aprobar
                    </button>
                    <button
                      className="propuesta__btn propuesta__btn--rechazar"
                      onClick={() => responderPropuesta(p.id, 'rechazada')}
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              )}
              {!esPatrocinador && (
                <p className="propuesta__espera">Esperando decisión del Patrocinador...</p>
              )}
            </div>
          ))}
        </div>
      )}

      {resueltas.length > 0 && (
        <div className="panel-propuestas__resueltas">
          <details>
            <summary>Propuestas anteriores ({resueltas.length})</summary>
            {resueltas.map(p => (
              <div key={p.id} className={`propuesta propuesta--${p.estado}`}>
                <div className="propuesta__header">
                  <strong>{p.intervencionNombre}</strong>
                  <span className={`propuesta__badge propuesta__badge--${p.estado}`}>
                    {p.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'}
                  </span>
                </div>
                <p className="propuesta__justificacion">"{p.justificacion}"</p>
                {p.respuesta && <p className="propuesta__respuesta">Respuesta: {p.respuesta}</p>}
              </div>
            ))}
          </details>
        </div>
      )}

      {disponibles.length > 0 && (
        <div className="panel-propuestas__nueva">
          <h4>Proponer intervención</h4>
          <div className="panel-propuestas__campo">
            <label>Justificación (obligatoria)</label>
            <textarea
              value={justificacion}
              onChange={e => setJustificacion(e.target.value)}
              placeholder="¿Por qué propones esta intervención?"
            />
          </div>
          <div className="panel-propuestas__lista">
            {disponibles.map(item => (
              <div key={item.id} className="intervencion">
                <span className="intervencion__nombre">{item.nombre}</span>
                <span className="intervencion__costo">${item.costo}</span>
                <button
                  className="intervencion__boton"
                  disabled={!justificacion.trim()}
                  onClick={() => {
                    if (item.id === 2) {
                      setModalSucs(item.id);
                      setInputSucs('');
                    } else {
                      enviarPropuesta(item.id);
                    }
                  }}
                >
                  Proponer
                </button>
              </div>
            ))}
          </div>
          <p className="panel-propuestas__presupuesto">Presupuesto: ${presupuesto}/100</p>
        </div>
      )}

      {modalSucs !== null && (
        <div className="modal-overlay" onClick={() => setModalSucs(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Sucursales a capacitar</h3>
            <p style={{ fontSize: 13, marginBottom: 12, color: 'var(--ipd-text-secondary)' }}>
              Ingresa los números de sucursal separados por coma.
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
                enviarPropuesta(modalSucs, sucs);
                setModalSucs(null);
              }}>Proponer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
