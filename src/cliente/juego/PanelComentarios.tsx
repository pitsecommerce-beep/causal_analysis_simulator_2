import { useState, useMemo } from 'react';
import { socket } from '../lib/socket';
import type { SolicitudCliente } from '../lib/tipos';

interface Comentario {
  id: string;
  texto: string;
  sucursal: number;
  estado: string;
}

interface Props {
  solicitudes: SolicitudCliente[];
}

export function PanelComentarios({ solicitudes }: Props) {
  const [filtro, setFiltro] = useState('');
  const [evidencias, setEvidencias] = useState<Set<string>>(new Set());
  const [hipotesis, setHipotesis] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [seleccion, setSeleccion] = useState<string | null>(null);

  const comentarios = useMemo<Comentario[]>(() => {
    return solicitudes
      .filter(s => s.comentariosRaw && s.comentariosRaw.trim())
      .map((s, i) => ({
        id: `C-${String(i + 1).padStart(3, '0')}`,
        texto: s.comentariosRaw.trim(),
        sucursal: s.sucursal,
        estado: s.estado,
      }));
  }, [solicitudes]);

  const filtrados = useMemo(() => {
    if (!filtro) return comentarios;
    const f = filtro.toLowerCase();
    return comentarios.filter(
      c =>
        c.texto.toLowerCase().includes(f) ||
        c.id.toLowerCase().includes(f) ||
        c.estado.toLowerCase().includes(f) ||
        String(c.sucursal).includes(f),
    );
  }, [comentarios, filtro]);

  function marcar(id: string) {
    if (!hipotesis.trim()) {
      setMensaje('Escribe la hipótesis antes de marcar.');
      return;
    }
    socket.emit(
      'equipo:marcar_evidencia',
      { comentarioId: id, hipotesis: hipotesis.trim() },
      (resp: any) => {
        if (resp?.error) {
          setMensaje(resp.error);
          return;
        }
        setEvidencias(prev => new Set(prev).add(id));
        setMensaje(`Evidencia registrada (${resp.totalEvidencias} total)`);
        setSeleccion(null);
        setHipotesis('');
        setTimeout(() => setMensaje(''), 3000);
      },
    );
  }

  return (
    <div className="comentarios">
      <h3 className="consultas__titulo">Comentarios de clientes</h3>
      <p className="comentarios__instrucciones">
        Selecciona un comentario y marca como evidencia la hipótesis que respalda.
      </p>
      <input
        className="comentarios__filtro"
        value={filtro}
        onChange={e => setFiltro(e.target.value)}
        placeholder="Buscar por texto, sucursal, estado..."
      />
      <div className="comentarios__lista">
        {filtrados.map(c => (
          <div
            key={c.id}
            className={`comentarios__item ${seleccion === c.id ? 'comentarios__item--sel' : ''} ${evidencias.has(c.id) ? 'comentarios__item--evidencia' : ''}`}
            onClick={() => setSeleccion(seleccion === c.id ? null : c.id)}
          >
            <div className="comentarios__item-header">
              <span className="comentarios__item-id">{c.id}</span>
              <span className="comentarios__item-meta">
                Suc {c.sucursal} · {c.estado}
              </span>
              {evidencias.has(c.id) && (
                <span className="comentarios__item-badge">Evidencia</span>
              )}
            </div>
            <p className="comentarios__item-texto">{c.texto}</p>
            {seleccion === c.id && !evidencias.has(c.id) && (
              <div className="comentarios__marcar">
                <textarea
                  className="comentarios__hipotesis"
                  value={hipotesis}
                  onChange={e => setHipotesis(e.target.value)}
                  placeholder="Este comentario evidencia que..."
                  onClick={e => e.stopPropagation()}
                />
                <button
                  className="comentarios__btn"
                  onClick={e => {
                    e.stopPropagation();
                    marcar(c.id);
                  }}
                >
                  Marcar como evidencia
                </button>
              </div>
            )}
          </div>
        ))}
        {filtrados.length === 0 && (
          <p className="comentarios__vacio">No se encontraron comentarios.</p>
        )}
      </div>
      {mensaje && <p className="comentarios__mensaje">{mensaje}</p>}
    </div>
  );
}
