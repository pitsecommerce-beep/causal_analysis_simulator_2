import { useState, useEffect, useCallback } from 'react';
import { socket } from '../lib/socket';
import type {
  EstadoMotorCliente, EstadoReloj, IntervencionCatalogo,
  SolicitudCliente, ComentarioClientePublico, ResultadoConsulta,
  EntradaBitacoraLocal, RolEquipo, MiembroEquipo, ResultadoPuntuacion,
  PreguntaConsejo, PropuestaIntervencion, SolicitudAccion,
} from '../lib/tipos';
import { NOMBRES_ROLES, DESC_ROLES } from '../lib/tipos';
import { usePresencia } from '../lib/presencia';
import { Reloj } from './Reloj';
import { PanelKPIs } from './PanelKPIs';
import { PanelConsultas } from './PanelConsultas';
import { GraficaResultado } from './GraficaResultado';
import { Bitacora } from './Bitacora';
import { FormDiagnostico } from './FormDiagnostico';
import { TableroFinal } from './TableroFinal';
import { PanelComentarios } from '../juego/PanelComentarios';
import { PanelObjetivos } from './PanelObjetivos';
import { PanelPropuestas } from './PanelPropuestas';
import { PanelSolicitudes } from './PanelSolicitudes';
import { IndicadoresListo } from './IndicadoresListo';

interface Props {
  estadoInicial: EstadoMotorCliente;
  relojInicial: EstadoReloj;
  catalogoInicial: IntervencionCatalogo[];
  solicitudes: SolicitudCliente[];
  comentariosClientes: ComentarioClientePublico[];
  codigoSala: string;
  nombreEquipo: string;
  miRol: RolEquipo | null;
  miNombre: string | null;
  miembros: MiembroEquipo[];
  tamanoEquipo: number;
  onAbandonar?: () => void;
  propuestasIniciales?: PropuestaIntervencion[];
  solicitudesAccionIniciales?: SolicitudAccion[];
}

export function ConsolaApp({
  estadoInicial, relojInicial, catalogoInicial, solicitudes, comentariosClientes,
  codigoSala, nombreEquipo, miRol, miNombre, miembros, tamanoEquipo, onAbandonar,
  propuestasIniciales, solicitudesAccionIniciales,
}: Props) {
  const [estado, setEstado] = useState<EstadoMotorCliente>(estadoInicial);
  const [reloj, setReloj] = useState<EstadoReloj>(relojInicial);
  const [catalogo, setCatalogo] = useState<IntervencionCatalogo[]>(catalogoInicial);
  const [resultado, setResultado] = useState<ResultadoConsulta | null>(null);
  const [bitacora, setBitacora] = useState<EntradaBitacoraLocal[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [roster, setRoster] = useState<MiembroEquipo[]>(miembros);
  const [puntuacion, setPuntuacion] = useState<ResultadoPuntuacion | null>(null);
  const [preguntas, setPreguntas] = useState<PreguntaConsejo[]>([]);
  const [dagRevelado, setDagRevelado] = useState(false);
  const [propuestas, setPropuestas] = useState<PropuestaIntervencion[]>(propuestasIniciales ?? []);
  const [solicitudesAccion, setSolicitudesAccion] = useState<SolicitudAccion[]>(solicitudesAccionIniciales ?? []);
  const [evidenciasCount, setEvidenciasCount] = useState(0);
  const [diagnosticoEnviado, setDiagnosticoEnviado] = useState(false);

  const tieneRoles = roster.length > 0;
  const esAnalista = miRol === 'analista';
  const esPatrocinador = miRol === 'patrocinador';
  const esLider = miRol === 'lider';
  const esVozCliente = miRol === 'voz_cliente' || (tamanoEquipo <= 3 && miRol === 'lider');
  const esConsejoOFin = reloj.fase === 'consejo' || reloj.fase === 'finalizado';
  const esTrimestre = reloj.fase.startsWith('trimestre_');

  const mostrarConsultas = !tieneRoles || esAnalista;
  const mostrarIntervenciones = !tieneRoles || esPatrocinador;
  const mostrarDiagnostico = (!tieneRoles || esLider) && (esTrimestre || esConsejoOFin);

  const tieneProPendiente = propuestas.some(p => p.estado === 'pendiente');
  const tieneProAprobada = propuestas.some(p => p.estado === 'aprobada');

  const { pares: presenciaPares, emitir: emitirPresencia } = usePresencia(miNombre);

  const mostrarMensaje = useCallback((msg: string) => {
    setMensaje(msg);
    setTimeout(() => setMensaje(null), 3000);
  }, []);

  useEffect(() => {
    function onTick(data: EstadoReloj) {
      setReloj(data);
    }
    function onFaseCambio(data: { faseNueva: string; faseAnterior: string }) {
      setMensaje(`Fase: ${data.faseNueva}`);
      setTimeout(() => setMensaje(null), 3000);
    }
    function onPausado(data: { pausado: boolean }) {
      setReloj(prev => ({ ...prev, pausado: data.pausado }));
    }
    function onEstado(data: { estadoMotor: EstadoMotorCliente; intervencionesCatalogo?: IntervencionCatalogo[] }) {
      setEstado(data.estadoMotor);
      if (data.intervencionesCatalogo) setCatalogo(data.intervencionesCatalogo);
    }
    function onTrimestreAvanzado(data: {
      trimestre: number;
      estadoMotor: EstadoMotorCliente;
      intervencionesCatalogo: IntervencionCatalogo[];
    }) {
      setEstado(data.estadoMotor);
      setCatalogo(data.intervencionesCatalogo);
      setMensaje(`Trimestre ${data.trimestre}`);
      setTimeout(() => setMensaje(null), 4000);
    }
    function onRolesAsignados(data: { miembros: MiembroEquipo[] }) {
      setRoster(data.miembros);
    }
    function onConsejoPreguntas(data: { preguntas: PreguntaConsejo[] }) {
      setPreguntas(data.preguntas);
    }
    function onDagRevelado() {
      setDagRevelado(true);
    }
    function onPropuestaNueva(data: PropuestaIntervencion) {
      setPropuestas(prev => [...prev, data]);
    }
    function onPropuestaResuelta(data: { propuestaId: string; estado: 'aprobada' | 'rechazada'; respuesta?: string }) {
      setPropuestas(prev => prev.map(p =>
        p.id === data.propuestaId
          ? { ...p, estado: data.estado, respuesta: data.respuesta }
          : p
      ));
    }
    function onSolicitudNueva(data: SolicitudAccion) {
      setSolicitudesAccion(prev => [...prev, data]);
    }
    function onSolicitudResuelta(data: { solicitudId: string; estado: 'completada' | 'descartada' }) {
      setSolicitudesAccion(prev => prev.map(s =>
        s.id === data.solicitudId
          ? { ...s, estado: data.estado }
          : s
      ));
    }

    socket.on('reloj:tick', onTick);
    socket.on('reloj:fase_cambio', onFaseCambio);
    socket.on('reloj:pausado', onPausado);
    socket.on('sesion:estado', onEstado);
    socket.on('sesion:trimestre_avanzado', onTrimestreAvanzado);
    socket.on('equipo:roles_asignados', onRolesAsignados);
    socket.on('consejo:preguntas', onConsejoPreguntas);
    socket.on('sesion:dag_revelado', onDagRevelado);
    socket.on('equipo:propuesta_nueva', onPropuestaNueva);
    socket.on('equipo:propuesta_resuelta', onPropuestaResuelta);
    socket.on('equipo:solicitud_nueva', onSolicitudNueva);
    socket.on('equipo:solicitud_resuelta', onSolicitudResuelta);

    return () => {
      socket.off('reloj:tick', onTick);
      socket.off('reloj:fase_cambio', onFaseCambio);
      socket.off('reloj:pausado', onPausado);
      socket.off('sesion:estado', onEstado);
      socket.off('sesion:trimestre_avanzado', onTrimestreAvanzado);
      socket.off('equipo:roles_asignados', onRolesAsignados);
      socket.off('consejo:preguntas', onConsejoPreguntas);
      socket.off('sesion:dag_revelado', onDagRevelado);
      socket.off('equipo:propuesta_nueva', onPropuestaNueva);
      socket.off('equipo:propuesta_resuelta', onPropuestaResuelta);
      socket.off('equipo:solicitud_nueva', onSolicitudNueva);
      socket.off('equipo:solicitud_resuelta', onSolicitudResuelta);
    };
  }, []);

  const handleIntervencion = useCallback((id: number, sucursales?: number[]) => {
    emitirPresencia('decidiendo');
    socket.emit('equipo:intervenir', { intervencionId: id, sucursales }, (resp: any) => {
      emitirPresencia('idle');
      if (resp?.error) {
        mostrarMensaje(resp.error);
        return;
      }
      if (resp?.exito) {
        mostrarMensaje(resp.mensaje);
      }
    });
  }, [emitirPresencia, mostrarMensaje]);

  const handleBitacora = useCallback((entrada: EntradaBitacoraLocal) => {
    setBitacora(prev => [...prev, entrada]);
  }, []);

  const handleSeleccionarBitacora = useCallback((entrada: EntradaBitacoraLocal) => {
    if (entrada.resultado) setResultado(entrada.resultado);
  }, []);

  const solicitudesPendientesMi = solicitudesAccion.filter(
    s => s.para === miRol && s.estado === 'pendiente'
  ).length;

  if (puntuacion) {
    return (
      <div className="consola consola--tablero">
        <header className="consola__header">
          <h1>{nombreEquipo}</h1>
          <Reloj reloj={reloj} />
        </header>
        <main className="consola__tablero-main">
          <TableroFinal
            resultado={puntuacion}
            preguntas={preguntas}
            historialKPIs={estado.historialKPIs}
            nombreEquipo={nombreEquipo}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="consola">
      <header className="consola__header">
        <h1>{nombreEquipo}</h1>
        <div className="consola__header-info">
          <span>Sala: {codigoSala}</span>
          <span>T{estado.trimestre}</span>
          <span>Créditos: {estado.creditosIndagacion}/12</span>
          <span>Presupuesto: ${estado.presupuesto}/100</span>
        </div>
        {miRol && miNombre && (
          <span className="consola__mi-rol">
            {miNombre} — {NOMBRES_ROLES[miRol]}
          </span>
        )}
        {solicitudesPendientesMi > 0 && (
          <span className="consola__badge-solicitudes">
            {solicitudesPendientesMi} solicitud{solicitudesPendientesMi > 1 ? 'es' : ''}
          </span>
        )}
        {mensaje && (
          <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 12, fontSize: 13 }}>
            {mensaje}
          </span>
        )}
        <Reloj reloj={reloj} />
        {onAbandonar && (
          <button
            className="consola__btn-abandonar"
            onClick={() => {
              if (confirm('¿Abandonar la sesión? Podrás reconectarte con tu código personal.')) {
                onAbandonar();
              }
            }}
          >
            Salir
          </button>
        )}
      </header>

      <aside className="consola__consultas">
        {esTrimestre && (
          <PanelObjetivos
            fase={reloj.fase}
            miRol={miRol}
            tieneProPendiente={tieneProPendiente}
            tieneProAprobada={tieneProAprobada}
          />
        )}

        <div className="consola__descargas" style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href="/api/descargar/solicitudes" className="consola__btn-descarga" style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
            fontSize: 12, borderRadius: 4, background: 'var(--ipd-surface-secondary, rgba(255,255,255,0.08))',
            color: 'var(--ipd-text-secondary)', textDecoration: 'none', border: '1px solid var(--ipd-border-subtle, rgba(255,255,255,0.1))',
          }}>
            Descargar base de datos (.xlsx)
          </a>
          {esVozCliente && (
            <a href="/api/descargar/comentarios" className="consola__btn-descarga" style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
              fontSize: 12, borderRadius: 4, background: 'var(--ipd-surface-secondary, rgba(255,255,255,0.08))',
              color: 'var(--ipd-text-secondary)', textDecoration: 'none', border: '1px solid var(--ipd-border-subtle, rgba(255,255,255,0.1))',
            }}>
              Descargar comentarios (.xlsx)
            </a>
          )}
        </div>

        {/* B4: Always show all sections, disabled with explanation when role doesn't match */}
        {mostrarConsultas ? (
          <PanelConsultas
            solicitudes={solicitudes}
            creditosRestantes={estado.creditosIndagacion}
            presupuesto={estado.presupuesto}
            catalogo={catalogo}
            onResultado={setResultado}
            onBitacora={handleBitacora}
            onIntervencion={handleIntervencion}
            puedeConsultar={mostrarConsultas}
            puedeIntervenir={mostrarIntervenciones}
            mostrarConsultas={true}
            mostrarIntervenciones={false}
          />
        ) : tieneRoles ? (
          <SeccionBloqueada
            titulo="Consultas"
            rolRequerido="analista"
            miRol={miRol}
            onSolicitar={(msg) => {
              socket.emit('equipo:solicitar_accion', { para: 'analista', tipo: 'consulta', mensaje: msg }, (resp: any) => {
                if (resp?.error) mostrarMensaje(resp.error);
                else mostrarMensaje('Solicitud enviada al Analista.');
              });
            }}
          />
        ) : null}

        {esTrimestre && (
          <PanelPropuestas
            propuestas={propuestas}
            catalogo={catalogo}
            presupuesto={estado.presupuesto}
            esPatrocinador={esPatrocinador || !tieneRoles}
            miRol={miRol}
            miNombre={miNombre}
            onMensaje={mostrarMensaje}
          />
        )}

        {!mostrarIntervenciones && tieneRoles && esTrimestre && (
          <SeccionBloqueada
            titulo="Autorizar intervenciones"
            rolRequerido="patrocinador"
            miRol={miRol}
            descripcion="Solo el Patrocinador puede aprobar propuestas de intervención."
          />
        )}

        {esVozCliente ? (
          <PanelComentarios comentariosClientes={comentariosClientes} onEvidenciaCount={setEvidenciasCount} />
        ) : tieneRoles ? (
          <SeccionBloqueada
            titulo="Comentarios de clientes"
            rolRequerido="voz_cliente"
            miRol={miRol}
            onSolicitar={(msg) => {
              socket.emit('equipo:solicitar_accion', { para: 'voz_cliente', tipo: 'testimonios', mensaje: msg }, (resp: any) => {
                if (resp?.error) mostrarMensaje(resp.error);
                else mostrarMensaje('Solicitud enviada a Voz del cliente.');
              });
            }}
          />
        ) : null}

        {mostrarDiagnostico && (
          <FormDiagnostico
            onResultado={(r) => {
              setPuntuacion(r);
              setDiagnosticoEnviado(true);
              setEstado(prev => ({ ...prev, trimestre: 3 }));
            }}
            onPreguntas={setPreguntas}
          />
        )}
        {!mostrarDiagnostico && (esTrimestre || esConsejoOFin) && tieneRoles && (
          <SeccionBloqueada
            titulo="Diagnóstico final"
            rolRequerido="lider"
            miRol={miRol}
            onSolicitar={(msg) => {
              socket.emit('equipo:solicitar_accion', { para: 'lider', tipo: 'diagnostico', mensaje: msg }, (resp: any) => {
                if (resp?.error) mostrarMensaje(resp.error);
                else mostrarMensaje('Solicitud enviada al Líder.');
              });
            }}
          />
        )}

        {tieneRoles && esTrimestre && (
          <PanelSolicitudes
            solicitudes={solicitudesAccion}
            miRol={miRol}
            miNombre={miNombre}
            onMensaje={mostrarMensaje}
          />
        )}
      </aside>

      <main className="consola__resultados">
        <GraficaResultado resultado={resultado} />
      </main>

      <aside className="consola__kpis">
        <PanelKPIs estado={estado} />
        {roster.length > 0 && (
          <div className="roster">
            <h4 className="roster__titulo">Equipo</h4>
            {roster.map((m, i) => (
              <div key={i} className={`roster__miembro ${m.nombre === miNombre ? 'roster__miembro--yo' : ''}`}>
                <span className="roster__nombre">{m.nombre}</span>
                <span className="roster__rol">{NOMBRES_ROLES[m.rol]}</span>
              </div>
            ))}
          </div>
        )}
        {esTrimestre && (
          <IndicadoresListo
            consultasRealizadas={bitacora.length}
            evidenciasRegistradas={evidenciasCount}
            propuestas={propuestas}
            diagnosticoEnviado={diagnosticoEnviado}
            miRol={miRol}
            tieneRoles={tieneRoles}
          />
        )}
      </aside>

      <footer className="consola__bitacora">
        <Bitacora entradas={bitacora} onSeleccionar={handleSeleccionarBitacora} />
      </footer>
    </div>
  );
}

function SeccionBloqueada({
  titulo,
  rolRequerido,
  miRol,
  descripcion,
  onSolicitar,
}: {
  titulo: string;
  rolRequerido: RolEquipo;
  miRol: RolEquipo | null;
  descripcion?: string;
  onSolicitar?: (msg: string) => void;
}) {
  const [pedirAbierto, setPedirAbierto] = useState(false);
  const [msgPedir, setMsgPedir] = useState('');

  return (
    <div className="seccion-bloqueada">
      <h3 className="seccion-bloqueada__titulo">{titulo}</h3>
      <p className="seccion-bloqueada__info">
        {descripcion ?? `Solo ${NOMBRES_ROLES[rolRequerido]} puede hacer esto.`}
      </p>
      <p className="seccion-bloqueada__desc">{DESC_ROLES[rolRequerido]}</p>
      {onSolicitar && !pedirAbierto && (
        <button className="seccion-bloqueada__btn" onClick={() => setPedirAbierto(true)}>
          Pedir a {NOMBRES_ROLES[rolRequerido]}
        </button>
      )}
      {onSolicitar && pedirAbierto && (
        <div className="seccion-bloqueada__pedir">
          <input
            value={msgPedir}
            onChange={e => setMsgPedir(e.target.value)}
            placeholder="¿Qué necesitas?"
            onKeyDown={e => {
              if (e.key === 'Enter' && msgPedir.trim()) {
                onSolicitar(msgPedir.trim());
                setMsgPedir('');
                setPedirAbierto(false);
              }
            }}
          />
          <button
            disabled={!msgPedir.trim()}
            onClick={() => {
              if (msgPedir.trim()) {
                onSolicitar(msgPedir.trim());
                setMsgPedir('');
                setPedirAbierto(false);
              }
            }}
          >
            Enviar
          </button>
        </div>
      )}
    </div>
  );
}
