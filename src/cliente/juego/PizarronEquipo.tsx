import { useState, useEffect } from 'react';
import { socket } from '../lib/socket';
import type {
  EstadoMotorCliente, PropuestaIntervencion, RolEquipo, MiembroEquipo,
} from '../lib/tipos';
import { NOMBRES_ROLES } from '../lib/tipos';

interface Props {
  estadoInicial: EstadoMotorCliente;
  miRol: RolEquipo;
  miembros: MiembroEquipo[];
}

export function PizarronEquipo({ estadoInicial, miRol, miembros }: Props) {
  const [presupuesto, setPresupuesto] = useState(estadoInicial.presupuesto);
  const [creditos, setCreditos] = useState(estadoInicial.creditosIndagacion);
  const [trimestre, setTrimestre] = useState(estadoInicial.trimestre);
  const [intervenciones, setIntervenciones] = useState(estadoInicial.intervenciones.length);
  const [propuestas, setPropuestas] = useState<PropuestaIntervencion[]>([]);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    function onEstado(data: { estadoMotor: EstadoMotorCliente }) {
      setPresupuesto(data.estadoMotor.presupuesto);
      setCreditos(data.estadoMotor.creditosIndagacion);
      setTrimestre(data.estadoMotor.trimestre);
      setIntervenciones(data.estadoMotor.intervenciones.length);
    }
    function onTrimestre(data: { estadoMotor: EstadoMotorCliente }) {
      setPresupuesto(data.estadoMotor.presupuesto);
      setCreditos(data.estadoMotor.creditosIndagacion);
      setTrimestre(data.estadoMotor.trimestre);
      setIntervenciones(data.estadoMotor.intervenciones.length);
    }
    function onPropuesta(data: PropuestaIntervencion) {
      setPropuestas(prev => [...prev, data]);
    }
    function onPropuestaResuelta(data: { propuestaId: string; estado: 'aprobada' | 'rechazada' }) {
      setPropuestas(prev => prev.map(p =>
        p.id === data.propuestaId ? { ...p, estado: data.estado } : p
      ));
    }

    socket.on('sesion:estado', onEstado);
    socket.on('sesion:trimestre_avanzado', onTrimestre);
    socket.on('equipo:propuesta_nueva', onPropuesta);
    socket.on('equipo:propuesta_resuelta', onPropuestaResuelta);
    return () => {
      socket.off('sesion:estado', onEstado);
      socket.off('sesion:trimestre_avanzado', onTrimestre);
      socket.off('equipo:propuesta_nueva', onPropuesta);
      socket.off('equipo:propuesta_resuelta', onPropuestaResuelta);
    };
  }, []);

  const pendientes = propuestas.filter(p => p.estado === 'pendiente').length;
  const aprobadas = propuestas.filter(p => p.estado === 'aprobada').length;

  return (
    <div className={`pizarron ${abierto ? 'pizarron--abierto' : ''}`}>
      <button
        className="pizarron__toggle"
        onClick={() => setAbierto(v => !v)}
        aria-label={abierto ? 'Cerrar pizarron' : 'Abrir pizarron'}
      >
        {abierto ? 'Cerrar pizarron' : 'Pizarron'}
      </button>

      {abierto && (
        <div className="pizarron__contenido">
          <h4 className="pizarron__titulo">Estado del equipo</h4>

          <div className="pizarron__metricas">
            <div className="pizarron__metrica">
              <span className="pizarron__metrica-valor">T{trimestre}</span>
              <span className="pizarron__metrica-label">Trimestre</span>
            </div>
            <div className="pizarron__metrica">
              <span className="pizarron__metrica-valor">${presupuesto}</span>
              <span className="pizarron__metrica-label">Presupuesto</span>
            </div>
            <div className="pizarron__metrica">
              <span className="pizarron__metrica-valor">{creditos}/12</span>
              <span className="pizarron__metrica-label">Creditos</span>
            </div>
            <div className="pizarron__metrica">
              <span className="pizarron__metrica-valor">{intervenciones}</span>
              <span className="pizarron__metrica-label">Intervenciones</span>
            </div>
          </div>

          {propuestas.length > 0 && (
            <div className="pizarron__propuestas">
              <h5>Propuestas</h5>
              <span>{pendientes} pendiente{pendientes !== 1 ? 's' : ''}</span>
              <span>{aprobadas} aprobada{aprobadas !== 1 ? 's' : ''}</span>
            </div>
          )}

          <div className="pizarron__equipo">
            <h5>Roles</h5>
            {miembros.map(m => (
              <div key={m.nombre} className="pizarron__miembro">
                <span>{m.nombre.split(' ')[0]}</span>
                <span className="pizarron__miembro-rol">{NOMBRES_ROLES[m.rol]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
