import { useState, useEffect, useCallback } from 'react';
import { socket } from '../lib/socket';
import type {
  EstadoMotorCliente, EstadoReloj, IntervencionCatalogo,
  SolicitudCliente, ResultadoConsulta, EntradaBitacoraLocal,
  RolEquipo, MiembroEquipo,
} from '../lib/tipos';
import { NOMBRES_ROLES } from '../lib/tipos';
import { Reloj } from './Reloj';
import { PanelKPIs } from './PanelKPIs';
import { PanelConsultas } from './PanelConsultas';
import { GraficaResultado } from './GraficaResultado';
import { Bitacora } from './Bitacora';

interface Props {
  estadoInicial: EstadoMotorCliente;
  relojInicial: EstadoReloj;
  catalogoInicial: IntervencionCatalogo[];
  solicitudes: SolicitudCliente[];
  codigoSala: string;
  nombreEquipo: string;
  miRol: RolEquipo | null;
  miNombre: string | null;
  miembros: MiembroEquipo[];
  tamanoEquipo: number;
}

export function ConsolaApp({
  estadoInicial, relojInicial, catalogoInicial, solicitudes,
  codigoSala, nombreEquipo, miRol, miNombre, miembros, tamanoEquipo,
}: Props) {
  const [estado, setEstado] = useState<EstadoMotorCliente>(estadoInicial);
  const [reloj, setReloj] = useState<EstadoReloj>(relojInicial);
  const [catalogo, setCatalogo] = useState<IntervencionCatalogo[]>(catalogoInicial);
  const [resultado, setResultado] = useState<ResultadoConsulta | null>(null);
  const [bitacora, setBitacora] = useState<EntradaBitacoraLocal[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [roster, setRoster] = useState<MiembroEquipo[]>(miembros);

  const tieneRoles = roster.length > 0;
  const esAnalista = miRol === 'analista';
  const esPatrocinador = miRol === 'patrocinador';
  const esLider = miRol === 'lider';
  const esVozCliente = miRol === 'voz_cliente' || (tamanoEquipo <= 3 && miRol === 'lider');

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

    socket.on('reloj:tick', onTick);
    socket.on('reloj:fase_cambio', onFaseCambio);
    socket.on('reloj:pausado', onPausado);
    socket.on('sesion:estado', onEstado);
    socket.on('sesion:trimestre_avanzado', onTrimestreAvanzado);
    socket.on('equipo:roles_asignados', onRolesAsignados);

    return () => {
      socket.off('reloj:tick', onTick);
      socket.off('reloj:fase_cambio', onFaseCambio);
      socket.off('reloj:pausado', onPausado);
      socket.off('sesion:estado', onEstado);
      socket.off('sesion:trimestre_avanzado', onTrimestreAvanzado);
      socket.off('equipo:roles_asignados', onRolesAsignados);
    };
  }, []);

  const handleIntervencion = useCallback((id: number, sucursales?: number[]) => {
    socket.emit('equipo:intervenir', { intervencionId: id, sucursales }, (resp: any) => {
      if (resp?.error) {
        setMensaje(resp.error);
        setTimeout(() => setMensaje(null), 3000);
        return;
      }
      if (resp?.exito) {
        setMensaje(resp.mensaje);
        setTimeout(() => setMensaje(null), 3000);
      }
    });
  }, []);

  const handleBitacora = useCallback((entrada: EntradaBitacoraLocal) => {
    setBitacora(prev => [...prev, entrada]);
  }, []);

  const handleSeleccionarBitacora = useCallback((entrada: EntradaBitacoraLocal) => {
    if (entrada.resultado) setResultado(entrada.resultado);
  }, []);

  return (
    <div className="consola">
      <header className="consola__header">
        <h1>{nombreEquipo}</h1>
        <div className="consola__header-info">
          <span>Sala: {codigoSala}</span>
          <span>T{estado.trimestre}</span>
          <span>Creditos: {estado.creditosIndagacion}/12</span>
          <span>Presupuesto: ${estado.presupuesto}/100</span>
        </div>
        {miRol && miNombre && (
          <span className="consola__mi-rol">
            {miNombre} — {NOMBRES_ROLES[miRol]}
          </span>
        )}
        {mensaje && (
          <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 12, fontSize: 13 }}>
            {mensaje}
          </span>
        )}
        <Reloj reloj={reloj} />
      </header>

      <aside className="consola__consultas">
        <PanelConsultas
          solicitudes={solicitudes}
          creditosRestantes={estado.creditosIndagacion}
          presupuesto={estado.presupuesto}
          catalogo={catalogo}
          onResultado={setResultado}
          onBitacora={handleBitacora}
          onIntervencion={handleIntervencion}
          puedeConsultar={!tieneRoles || esAnalista}
          puedeIntervenir={!tieneRoles || esPatrocinador}
          esVozCliente={esVozCliente}
        />
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
      </aside>

      <footer className="consola__bitacora">
        <Bitacora entradas={bitacora} onSeleccionar={handleSeleccionarBitacora} />
      </footer>
    </div>
  );
}
