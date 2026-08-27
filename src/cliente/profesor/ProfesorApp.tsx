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

interface EquipoConfig {
  nombre: string;
  emailsTexto: string;
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
  const [panelEquipos, setPanelEquipos] = useState(false);
  const [equiposConfig, setEquiposConfig] = useState<EquipoConfig[]>([
    { nombre: 'Equipo 1', emailsTexto: '' },
  ]);
  const [guardando, setGuardando] = useState(false);
  const [equiposGuardados, setEquiposGuardados] = useState(false);
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

    socket.emit('profesor:obtener_asignaciones', { clave, codigoSala }, (resp: any) => {
      if (resp?.equipos && resp.equipos.length > 0) {
        setEquiposConfig(resp.equipos.map((eq: any) => ({
          nombre: eq.nombre,
          emailsTexto: eq.emails.join('\n'),
        })));
        setEquiposGuardados(true);
      }
    });

    function onTick(data: EstadoReloj) {
      setReloj(data);
    }
    function onEquipoUnido(data: { nombre: string }) {
      setMensaje(`Equipo unido: ${data.nombre}`);
      setTimeout(() => setMensaje(''), 3000);
      cargarEstado();
    }
    function onParticipante(data: { equipo: string; email: string }) {
      setMensaje(`${data.email} se unio a ${data.equipo}`);
      setTimeout(() => setMensaje(''), 3000);
    }
    function onEquipoDiag(data: { equipo: string; resultado: ResultadoPuntuacion }) {
      setMensaje(`${data.equipo} diagnostico: ${data.resultado.total} pts — Final ${data.resultado.final}`);
      setTimeout(() => setMensaje(''), 5000);
      cargarEstado();
    }
    function onEquipoInterv(data: { equipo: string; intervencionNombre: string }) {
      setMensaje(`${data.equipo}: ${data.intervencionNombre}`);
      setTimeout(() => setMensaje(''), 4000);
    }

    socket.on('reloj:tick', onTick);
    socket.on('sesion:equipo_unido', onEquipoUnido);
    socket.on('sesion:participante_conectado', onParticipante);
    socket.on('sesion:equipo_diagnostico', onEquipoDiag);
    socket.on('sesion:equipo_intervencion', onEquipoInterv);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      socket.off('reloj:tick', onTick);
      socket.off('sesion:equipo_unido', onEquipoUnido);
      socket.off('sesion:participante_conectado', onParticipante);
      socket.off('sesion:equipo_diagnostico', onEquipoDiag);
      socket.off('sesion:equipo_intervencion', onEquipoInterv);
    };
  }, [cargarEstado, clave, codigoSala]);

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

  function agregarEquipo() {
    setEquiposConfig(prev => [...prev, { nombre: `Equipo ${prev.length + 1}`, emailsTexto: '' }]);
  }

  function eliminarEquipo(idx: number) {
    setEquiposConfig(prev => prev.filter((_, i) => i !== idx));
  }

  function actualizarEquipoConfig(idx: number, campo: keyof EquipoConfig, valor: string) {
    setEquiposConfig(prev => prev.map((eq, i) => i === idx ? { ...eq, [campo]: valor } : eq));
  }

  function guardarEquipos() {
    const equiposPayload = equiposConfig
      .filter(eq => eq.nombre.trim() && eq.emailsTexto.trim())
      .map(eq => ({
        nombre: eq.nombre.trim(),
        emails: eq.emailsTexto
          .split(/[\n,;]+/)
          .map(e => e.trim().toLowerCase())
          .filter(e => e.includes('@')),
      }))
      .filter(eq => eq.emails.length > 0);

    if (equiposPayload.length === 0) {
      setMensaje('Agrega al menos un equipo con emails validos');
      setTimeout(() => setMensaje(''), 3000);
      return;
    }

    setGuardando(true);
    socket.emit('profesor:configurar_equipos', { clave, codigoSala, equipos: equiposPayload }, (resp: any) => {
      setGuardando(false);
      if (resp?.error) {
        setMensaje(resp.error);
        setTimeout(() => setMensaje(''), 4000);
      } else {
        setMensaje(`${resp.totalEquipos} equipos configurados con ${resp.totalParticipantes} participantes`);
        setEquiposGuardados(true);
        setTimeout(() => setMensaje(''), 4000);
      }
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
        <button className="profesor__btn" onClick={() => setPanelEquipos(v => !v)}>
          {panelEquipos ? 'Ocultar equipos' : 'Gestionar equipos'}
        </button>
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

      {panelEquipos && (
        <div className="profesor__panel-equipos">
          <h2>Configurar equipos y participantes</h2>
          <p className="profesor__panel-desc">
            Asigna correos a cada equipo. Los participantes ingresan su correo para unirse automaticamente al equipo asignado.
          </p>

          {equiposConfig.map((eq, idx) => (
            <div key={idx} className="profesor__equipo-config">
              <div className="profesor__equipo-config-header">
                <input
                  className="profesor__equipo-nombre-input"
                  value={eq.nombre}
                  onChange={e => actualizarEquipoConfig(idx, 'nombre', e.target.value)}
                  placeholder="Nombre del equipo"
                />
                {equiposConfig.length > 1 && (
                  <button className="profesor__btn-eliminar" onClick={() => eliminarEquipo(idx)}>
                    Eliminar
                  </button>
                )}
              </div>
              <textarea
                className="profesor__emails-textarea"
                value={eq.emailsTexto}
                onChange={e => actualizarEquipoConfig(idx, 'emailsTexto', e.target.value)}
                placeholder={'correo1@ejemplo.com\ncorreo2@ejemplo.com\ncorreo3@ejemplo.com'}
                rows={4}
              />
              <span className="profesor__email-count">
                {eq.emailsTexto.split(/[\n,;]+/).filter(e => e.trim().includes('@')).length} correos
              </span>
            </div>
          ))}

          <div className="profesor__panel-acciones">
            <button className="profesor__btn" onClick={agregarEquipo}>
              + Agregar equipo
            </button>
            <button
              className="profesor__btn profesor__btn--guardar"
              onClick={guardarEquipos}
              disabled={guardando}
            >
              {guardando ? 'Guardando...' : equiposGuardados ? 'Actualizar equipos' : 'Guardar equipos'}
            </button>
          </div>
        </div>
      )}

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
