import type { RolEquipo } from '../lib/tipos';
import { OBJETIVOS_FASE, NOMBRES_ROLES } from '../lib/tipos';

interface Props {
  fase: string;
  miRol: RolEquipo | null;
  tieneProPendiente: boolean;
  tieneProAprobada: boolean;
}

export function PanelObjetivos({ fase, miRol, tieneProPendiente, tieneProAprobada }: Props) {
  const obj = OBJETIVOS_FASE[fase];
  if (!obj) return null;

  const rolActual = miRol ?? 'analista';
  const textoRol = obj.rol[rolActual];

  let faltante = obj.faltante;
  if (fase === 'trimestre_1' && tieneProAprobada) {
    faltante = 'Intervencion aprobada. Objetivo cumplido.';
  } else if (fase === 'trimestre_1' && tieneProPendiente) {
    faltante = 'Propuesta pendiente de aprobacion del Patrocinador.';
  }

  return (
    <div className="panel-objetivos">
      <h4 className="panel-objetivos__titulo">Objetivo de la fase</h4>
      <p className="panel-objetivos__equipo">{obj.equipo}</p>
      <div className="panel-objetivos__rol">
        <span className="panel-objetivos__rol-label">
          {miRol ? NOMBRES_ROLES[miRol] : 'Tu rol'}:
        </span>
        <span>{textoRol}</span>
      </div>
      <div className={`panel-objetivos__faltante ${tieneProAprobada && fase === 'trimestre_1' ? 'panel-objetivos__faltante--ok' : ''}`}>
        {faltante}
      </div>
    </div>
  );
}
