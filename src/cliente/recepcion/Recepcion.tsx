import { useState, useEffect } from 'react';
import { socket } from '../lib/socket';
import './recepcion.css';

interface Props {
  nombreEquipo: string;
  tamanoEquipo: number;
  codigoSala: string;
  onComenzar: () => void;
}

interface ConectadoInfo {
  nombre: string;
}

export function Recepcion({ nombreEquipo, tamanoEquipo, codigoSala, onComenzar }: Props) {
  const [conectados, setConectados] = useState<ConectadoInfo[]>([]);

  useEffect(() => {
    function onConectados(data: { conectados: ConectadoInfo[] }) {
      setConectados(data.conectados);
    }
    socket.on('equipo:conectados', onConectados);
    socket.emit('equipo:pedir_conectados', { codigoSala });
    return () => { socket.off('equipo:conectados', onConectados); };
  }, [codigoSala]);

  return (
    <div className="recepcion">
      <div className="recepcion__contenido">
        <div className="recepcion__marca">
          <span className="recepcion__institucion">IPADE Business School</span>
        </div>

        <h1 className="recepcion__titulo">Simulador ETF Bank</h1>

        <div className="recepcion__equipo">
          <span className="recepcion__equipo-nombre">{nombreEquipo}</span>
          {conectados.length > 0 && (
            <div className="recepcion__conectados">
              {conectados.map((c, i) => (
                <span key={i} className="recepcion__conectado">
                  <span className="recepcion__conectado-indicador" />
                  {c.nombre}
                </span>
              ))}
            </div>
          )}
          {conectados.length < tamanoEquipo && (
            <span className="recepcion__esperando">
              Esperando {tamanoEquipo - conectados.length} participante{tamanoEquipo - conectados.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="recepcion__acciones">
          <button className="ipd-btn ipd-btn--primary ipd-btn--lg" onClick={onComenzar}>
            Comenzar
          </button>
        </div>

        <span className="recepcion__pie">Análisis causal y mejora de procesos</span>
      </div>
    </div>
  );
}
