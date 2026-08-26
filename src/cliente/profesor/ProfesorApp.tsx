import { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../lib/socket';
import type {
  EstadoReloj, EquipoTablero, ResultadoPuntuacion,
} from '../lib/tipos';
import { NOMBRES_FASES, NOMBRES_FINALES } from '../lib/tipos';

interface Props {
  codigoSala: string;
  clave: string;
}

function formatearTiempo(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const seg = Math.floor(segundos % 60);
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
}

export function ProfesorApp({ codigoSala, clave }: Props) {
  const [reloj, setReloj] = useState<EstadoReloj | null>(null);
  const [equipos, setEquipos] = useState<EquipoTablero[]>([]);
  const [escenaEstado, setEscenaEstado] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [muteados, setMuteados] = useState<Set<string>>(new Set());
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargarEstado = useCallback(() => {
    socket.emit('profesor:tablero', { clave, codigoSala }, (resp: any) => {
      if (resp?.error) return;
      setReloj(resp.reloj);
      setEquipos(resp.equipos);
      setEscenaEstado(resp.escena);
    });
  }, [clave, codigoSala]);

  useEffect(() => {
    cargarEstado();
    pollingRef.current = setInterval(cargarEstado, 5000);

    function onTick(data: EstadoReloj) {
      setReloj(data);
    }
    function onEquipoUnido(data: { nombre: string }) {
      setMensaje(`Equipo unido: ${data.nombre}`);
      setTimeout(() => setMensaje(''), 3000);
      cargarEstado();
    }
    function onEquipoDiag(data: { equipo: string; resultado: ResultadoPuntuacion }) {
      setMensaje(`${data.equipo} diagnosticó: ${data.resultado.total} pts — Final ${data.resultado.final}`);
      setTimeout(() => setMensaje(''), 5000);
      cargarEstado();
    }
    function onEquipoInterv(data: { equipo: string; intervencionNombre: string }) {
      setMensaje(`${data.equipo}: ${data.intervencionNombre}`);
      setTimeout(() => setMensaje(''), 4000);
    }

    socket.on('reloj:tick', onTick);
    socket.on('sesion:equipo_unido', onEquipoUnido);
    socket.on('sesion:equipo_diagnostico', onEquipoDiag);
    socket.on('sesion:equipo_intervencion', onEquipoInterv);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      socket.off('reloj:tick', onTick);
      socket.off('sesion:equipo_unido', onEquipoUnido);
      socket.off('sesion:equipo_diagnostico', onEquipoDiag);
      socket.off('sesion:equipo_intervencion', onEquipoInterv);
    };
  }, [cargarEstado]);

  function iniciarReloj() {
    socket.emit('profesor:iniciar_reloj', { clave, codigoSala }, (resp: any) => {
      if (resp?.error) { setMensaje(resp.error); setTimeout(() => setMensaje(''), 3000); }
      else cargarEstado();
    });
  }

  function pausarReloj() {
    socket.emit('profesor:pausar_reloj', { clave, codigoSala }, (resp: any) => {
      if (resp?.error) { setMensaje(resp.error); setTimeout(() => setMensaje(''), 3000); }
    });
  }

  function extenderFase(minutos: number) {
    socket.emit('profesor:extender_fase', { clave, codigoSala, minutos }, () => {
      cargarEstado();
    });
  }

  function revelarDAG() {
    socket.emit('profesor:revelar_dag', { clave, codigoSala }, (resp: any) => {
      if (resp?.error) { setMensaje(resp.error); setTimeout(() => setMensaje(''), 3000); }
      else { setMensaje('DAG revelado a todos los equipos'); setTimeout(() => setMensaje(''), 3000); }
    });
  }

  const fase = reloj ? (NOMBRES_FASES[reloj.fase] ?? reloj.fase) : 'Cargando...';
  const esConsejo = reloj?.fase === 'consejo' || reloj?.fase === 'finalizado';
  const equiposOrdenados = [...equipos].sort((a, b) => {
    const ta = a.resultado?.total ?? -1;
    const tb = b.resultado?.total ?? -1;
    return tb - ta;
  });

  return (
    <div className="profesor">
      <header className="profesor__header">
        <h1>Panel del profesor</h1>
        <span className="profesor__sala">Sala: {codigoSala}</span>
        {reloj && (
          <div className="profesor__reloj">
            <span className={`profesor__fase ${reloj.pausado ? 'profesor__fase--pausado' : ''}`}>
              {fase} {reloj.pausado ? '(pausado)' : ''}
            </span>
            <span className="profesor__tiempo">{formatearTiempo(reloj.segundoActual)}</span>
          </div>
        )}
        {mensaje && <span className="profesor__mensaje">{mensaje}</span>}
      </header>

      <div className="profesor__controles">
        {!reloj?.iniciado ? (
          <button className="profesor__btn" onClick={iniciarReloj}>Iniciar reloj</button>
        ) : (
          <button className="profesor__btn" onClick={pausarReloj}>
            {reloj?.pausado ? 'Reanudar' : 'Pausar'}
          </button>
        )}
        <button className="profesor__btn" onClick={() => extenderFase(2)}>+2 min</button>
        <button className="profesor__btn" onClick={() => extenderFase(5)}>+5 min</button>
        <button className="profesor__btn profesor__btn--revelar" onClick={revelarDAG} disabled={!esConsejo}>
          Revelar DAG
        </button>
        <span className="profesor__info-voz">
          Voz: {escenaEstado || 'desconocido'}
        </span>
      </div>

      <div className="profesor__grid">
        {equiposOrdenados.length === 0 && (
          <p className="profesor__vacio">Esperando equipos...</p>
        )}
        {equiposOrdenados.map((eq, idx) => (
          <div key={eq.nombre} className={`profesor__equipo ${eq.resultado ? 'profesor__equipo--terminado' : ''}`}>
            <div className="profesor__equipo-header">
              {eq.resultado && <span className="profesor__posicion">#{idx + 1}</span>}
              <h3>{eq.nombre}</h3>
              <span className="profesor__equipo-t">T{eq.trimestre}</span>
            </div>

            <div className="profesor__equipo-kpis">
              <div className="profesor__kpi">
                <span className="profesor__kpi-label">Captura</span>
                <span className="profesor__kpi-val">{eq.kpis.ventanaCapturaMediana.toFixed(1)}d</span>
              </div>
              <div className="profesor__kpi">
                <span className="profesor__kpi-label">Quejas</span>
                <span className="profesor__kpi-val">{eq.kpis.quejas}</span>
              </div>
              <div className="profesor__kpi">
                <span className="profesor__kpi-label">Conv.</span>
                <span className="profesor__kpi-val">{eq.kpis.conversion.toFixed(0)}%</span>
              </div>
              <div className="profesor__kpi">
                <span className="profesor__kpi-label">Pres.</span>
                <span className="profesor__kpi-val">${eq.presupuesto}</span>
              </div>
              <div className="profesor__kpi">
                <span className="profesor__kpi-label">Cred.</span>
                <span className="profesor__kpi-val">{eq.creditos}/12</span>
              </div>
            </div>

            {eq.intervenciones.length > 0 && (
              <div className="profesor__intervenciones">
                {eq.intervenciones.map((name, i) => (
                  <span key={i} className="profesor__intervencion-tag">{name.slice(0, 30)}</span>
                ))}
              </div>
            )}

            {eq.resultado && (
              <div className="profesor__resultado">
                <span className="profesor__total">{eq.resultado.total} pts</span>
                <span className={`profesor__final profesor__final--${eq.resultado.final.toLowerCase()}`}>
                  Final {eq.resultado.final}: {NOMBRES_FINALES[eq.resultado.final]}
                </span>
              </div>
            )}

            {eq.miembros.length > 0 && (
              <div className="profesor__miembros">
                {eq.miembros.map((m, i) => (
                  <span key={i} className="profesor__miembro">{m.nombre}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
