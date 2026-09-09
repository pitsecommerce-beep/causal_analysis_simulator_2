import { useState, useEffect } from 'react';
import { socket } from '../lib/socket';
import { ComoJugar } from './ComoJugar';
import './recepcion.css';

const TUTORIAL_KEY = 'etfbank_tutorial_visto';

interface Props {
  nombreEquipo: string;
  tamanoEquipo: number;
  codigoSala: string;
  onComenzar: () => void;
}

interface ConectadoInfo {
  nombre: string;
}

function tutorialVisto(): boolean {
  try { return localStorage.getItem(TUTORIAL_KEY) === '1'; } catch { return false; }
}

function marcarTutorial(): void {
  try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch {}
}

export function Recepcion({ nombreEquipo, tamanoEquipo, codigoSala, onComenzar }: Props) {
  const [conectados, setConectados] = useState<ConectadoInfo[]>([]);
  const [mostrarTutorial, setMostrarTutorial] = useState(!tutorialVisto());

  useEffect(() => {
    function onConectados(data: { conectados: ConectadoInfo[] }) {
      setConectados(data.conectados);
    }
    socket.on('equipo:conectados', onConectados);
    socket.emit('equipo:pedir_conectados', { codigoSala });
    return () => { socket.off('equipo:conectados', onConectados); };
  }, [codigoSala]);

  function cerrarTutorial() {
    marcarTutorial();
    setMostrarTutorial(false);
  }

  function abrirTutorial() {
    setMostrarTutorial(true);
  }

  const faltantes = tamanoEquipo - conectados.length;

  return (
    <div className="recepcion">
      <div className="recepcion__contenido">
        <div className="recepcion__marca">
          <svg className="recepcion__logo" viewBox="0 0 64 64" aria-hidden="true">
            <rect x="4" y="4" width="56" height="56" rx="12" fill="var(--ipd-scene-ropa-lt)" />
            <rect x="14" y="22" width="36" height="4" rx="2" fill="var(--ipd-scene-oro-lt)" />
            <rect x="14" y="30" width="24" height="3" rx="1.5" fill="var(--ipd-scene-oro-md)" />
            <rect x="14" y="37" width="30" height="3" rx="1.5" fill="var(--ipd-scene-oro-hi)" />
          </svg>
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
          {faltantes > 0 && (
            <span className="recepcion__esperando">
              Esperando {faltantes} participante{faltantes !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="recepcion__acciones">
          <button className="ipd-btn ipd-btn--primary ipd-btn--lg" onClick={onComenzar}>
            Comenzar
          </button>
          <button className="ipd-btn ipd-btn--ghost" onClick={abrirTutorial}>
            Cómo jugar
          </button>
        </div>

        <span className="recepcion__pie">Análisis causal y mejora de procesos</span>
      </div>

      {mostrarTutorial && <ComoJugar onCerrar={cerrarTutorial} />}
    </div>
  );
}
