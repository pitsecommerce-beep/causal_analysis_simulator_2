import { NOMBRES_ROLES, DESC_ROLES, type RolEquipo } from '../lib/tipos';

interface Props {
  rol: RolEquipo;
  nombre: string;
  onCerrar: () => void;
}

const DETALLES_ROLES: Record<RolEquipo, string[]> = {
  patrocinador: [
    'Apruebas las intervenciones que proponga el equipo.',
    'Cada intervención consume presupuesto — úsalo sabiamente.',
    'Puedes seleccionar sucursales específicas para ciertas intervenciones.',
  ],
  lider: [
    'Coordinas la estrategia del equipo.',
    'Al llegar la fase de consejo, envías el diagnóstico final.',
    'Tu diagnóstico determina la mayor parte de la puntuación.',
  ],
  analista: [
    'Ejecutas consultas sobre los datos de solicitudes.',
    'Cada consulta consume un crédito de indagación.',
    'Escribe una hipótesis antes de cada consulta para ganar puntos de rigor.',
  ],
  voz_cliente: [
    'Revisas los comentarios de los clientes.',
    'Marcas comentarios como evidencia para respaldar hipótesis.',
    'Tu trabajo conecta la perspectiva del cliente con el análisis.',
  ],
};

export function ModalRol({ rol, nombre, onCerrar }: Props) {
  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal modal--rol" onClick={e => e.stopPropagation()}>
        <h3>{NOMBRES_ROLES[rol]}</h3>
        <p className="modal-rol__nombre">{nombre}</p>
        <p className="modal-rol__desc">{DESC_ROLES[rol]}</p>
        <ul className="modal-rol__detalles">
          {DETALLES_ROLES[rol].map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
        <div className="modal__botones">
          <button className="primario" onClick={onCerrar}>Entendido</button>
        </div>
      </div>
    </div>
  );
}
