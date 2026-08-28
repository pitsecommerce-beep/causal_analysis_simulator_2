import { useState } from 'react';
import { socket } from '../lib/socket';
import type { SolicitudAccion, RolEquipo } from '../lib/tipos';
import { NOMBRES_ROLES } from '../lib/tipos';

interface Props {
  solicitudes: SolicitudAccion[];
  miRol: RolEquipo | null;
  miNombre: string | null;
  onMensaje: (msg: string) => void;
}

const ROLES_DEST: RolEquipo[] = ['patrocinador', 'lider', 'analista', 'voz_cliente'];

export function PanelSolicitudes({ solicitudes, miRol, miNombre, onMensaje }: Props) {
  const [para, setPara] = useState<RolEquipo | ''>('');
  const [mensaje, setMensaje] = useState('');
  const [tipo, setTipo] = useState<'consulta' | 'testimonios' | 'diagnostico' | 'general'>('general');

  const parasMi = solicitudes.filter(s => s.para === miRol && s.estado === 'pendiente');
  const misEnviadas = solicitudes.filter(s => s.de === miNombre && s.estado === 'pendiente');
  const resueltas = solicitudes.filter(s => s.estado !== 'pendiente');

  function enviar() {
    if (!para) {
      onMensaje('Selecciona a quien va dirigida la solicitud.');
      return;
    }
    if (!mensaje.trim()) {
      onMensaje('Escribe un mensaje para la solicitud.');
      return;
    }
    socket.emit('equipo:solicitar_accion', { para, tipo, mensaje: mensaje.trim() }, (resp: any) => {
      if (resp?.error) {
        onMensaje(resp.error);
        return;
      }
      setMensaje('');
      setPara('');
      onMensaje('Solicitud enviada.');
    });
  }

  function resolver(id: string, accion: 'completada' | 'descartada') {
    socket.emit('equipo:resolver_solicitud', { solicitudId: id, accion }, (resp: any) => {
      if (resp?.error) {
        onMensaje(resp.error);
      }
    });
  }

  const destinatarios = ROLES_DEST.filter(r => r !== miRol);

  return (
    <div className="panel-solicitudes">
      {parasMi.length > 0 && (
        <div className="panel-solicitudes__recibidas">
          <h4 className="panel-solicitudes__subtitulo">Te pidieron</h4>
          {parasMi.map(s => (
            <div key={s.id} className="solicitud-accion solicitud-accion--recibida">
              <p className="solicitud-accion__msg">{s.mensaje}</p>
              <p className="solicitud-accion__de">
                De {s.de} ({NOMBRES_ROLES[s.rolDe]})
              </p>
              <div className="solicitud-accion__btns">
                <button className="solicitud-accion__btn solicitud-accion__btn--ok" onClick={() => resolver(s.id, 'completada')}>
                  Hecho
                </button>
                <button className="solicitud-accion__btn solicitud-accion__btn--no" onClick={() => resolver(s.id, 'descartada')}>
                  Descartar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {misEnviadas.length > 0 && (
        <div className="panel-solicitudes__enviadas">
          <h4 className="panel-solicitudes__subtitulo">Esperando respuesta</h4>
          {misEnviadas.map(s => (
            <div key={s.id} className="solicitud-accion solicitud-accion--enviada">
              <p className="solicitud-accion__msg">{s.mensaje}</p>
              <p className="solicitud-accion__de">Para {NOMBRES_ROLES[s.para]}</p>
            </div>
          ))}
        </div>
      )}

      <div className="panel-solicitudes__nueva">
        <h4 className="panel-solicitudes__subtitulo">Pedir accion</h4>
        <div className="panel-solicitudes__campo">
          <select value={para} onChange={e => setPara(e.target.value as RolEquipo)}>
            <option value="">Seleccionar rol...</option>
            {destinatarios.map(r => (
              <option key={r} value={r}>{NOMBRES_ROLES[r]}</option>
            ))}
          </select>
        </div>
        <div className="panel-solicitudes__campo">
          <select value={tipo} onChange={e => setTipo(e.target.value as any)}>
            <option value="general">General</option>
            <option value="consulta">Ejecutar consulta</option>
            <option value="testimonios">Buscar testimonios</option>
            <option value="diagnostico">Completar diagnostico</option>
          </select>
        </div>
        <div className="panel-solicitudes__campo">
          <textarea
            value={mensaje}
            onChange={e => setMensaje(e.target.value)}
            placeholder="Que necesitas?"
          />
        </div>
        <button className="panel-solicitudes__btn-enviar" onClick={enviar} disabled={!para || !mensaje.trim()}>
          Enviar solicitud
        </button>
      </div>

      {resueltas.length > 0 && (
        <details className="panel-solicitudes__historial">
          <summary>Historial ({resueltas.length})</summary>
          {resueltas.map(s => (
            <div key={s.id} className={`solicitud-accion solicitud-accion--${s.estado}`}>
              <p className="solicitud-accion__msg">{s.mensaje}</p>
              <span className="solicitud-accion__badge">
                {s.estado === 'completada' ? 'Completada' : 'Descartada'}
              </span>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
