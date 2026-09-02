import type { RolEquipo, PropuestaIntervencion } from '../lib/tipos';
import { NOMBRES_ROLES } from '../lib/tipos';

interface Props {
  consultasRealizadas: number;
  evidenciasRegistradas: number;
  propuestas: PropuestaIntervencion[];
  diagnosticoEnviado: boolean;
  miRol: RolEquipo | null;
  tieneRoles: boolean;
}

interface IndicadorRol {
  rol: RolEquipo;
  nombre: string;
  listo: boolean;
  detalle: string;
}

export function IndicadoresListo({
  consultasRealizadas,
  evidenciasRegistradas,
  propuestas,
  diagnosticoEnviado,
  miRol,
  tieneRoles,
}: Props) {
  if (!tieneRoles) return null;

  const aprobadas = propuestas.filter(p => p.estado === 'aprobada').length;

  const indicadores: IndicadorRol[] = [
    {
      rol: 'analista',
      nombre: NOMBRES_ROLES.analista,
      listo: consultasRealizadas >= 2,
      detalle: `${consultasRealizadas}/2 consultas`,
    },
    {
      rol: 'voz_cliente',
      nombre: NOMBRES_ROLES.voz_cliente,
      listo: evidenciasRegistradas >= 3,
      detalle: `${evidenciasRegistradas}/3 evidencias`,
    },
    {
      rol: 'patrocinador',
      nombre: NOMBRES_ROLES.patrocinador,
      listo: aprobadas >= 1,
      detalle: aprobadas >= 1 ? `${aprobadas} aprobada${aprobadas > 1 ? 's' : ''}` : 'Sin decision',
    },
    {
      rol: 'lider',
      nombre: NOMBRES_ROLES.lider,
      listo: diagnosticoEnviado,
      detalle: diagnosticoEnviado ? 'Enviado' : 'Pendiente',
    },
  ];

  return (
    <div className="indicadores" role="status" aria-label="Indicadores de progreso del equipo">
      <h4 className="indicadores__titulo">Progreso del equipo</h4>
      <div className="indicadores__grid">
        {indicadores.map(ind => (
          <div
            key={ind.rol}
            className={`indicadores__item ${ind.listo ? 'indicadores__item--listo' : ''} ${ind.rol === miRol ? 'indicadores__item--yo' : ''}`}
          >
            <span className="indicadores__check" aria-hidden="true">
              {ind.listo ? '✓' : '○'}
            </span>
            <span className="indicadores__nombre">{ind.nombre}</span>
            <span className="indicadores__detalle">{ind.detalle}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
