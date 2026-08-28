import { useState } from 'react';
import { socket } from '../lib/socket';
import type { DiagnosticoForm, ResultadoPuntuacion, PreguntaConsejo } from '../lib/tipos';

interface Props {
  onResultado: (resultado: ResultadoPuntuacion) => void;
  onPreguntas: (preguntas: PreguntaConsejo[]) => void;
}

const CAUSAS_OPCIONES = [
  { key: 'edad', label: 'Edad del cliente' },
  { key: 'anios_cliente', label: 'Antigüedad del cliente' },
  { key: 'score_buro', label: 'Score del buró de crédito' },
  { key: 'score_etf', label: 'Score interno ETF' },
  { key: 'genero', label: 'Género del cliente' },
  { key: 'estado_civil', label: 'Estado civil' },
  { key: 'linea_credito', label: 'Línea de crédito otorgada' },
];

export function FormDiagnostico({ onResultado, onPreguntas }: Props) {
  const [form, setForm] = useState<DiagnosticoForm>({
    ventanaCapturaEsCuello: false,
    reprocesoEsMecanismo: false,
    fugaPlastico: false,
    trabajoPerdidoBuro: false,
    causasEspurias: [],
    concentracionSinMasa: false,
  });
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  function toggleCausa(key: string) {
    setForm(prev => {
      const causas = prev.causasEspurias.includes(key)
        ? prev.causasEspurias.filter(c => c !== key)
        : [...prev.causasEspurias, key];
      return { ...prev, causasEspurias: causas };
    });
  }

  function enviar() {
    const diagnChecked = form.ventanaCapturaEsCuello || form.reprocesoEsMecanismo ||
      form.fugaPlastico || form.trabajoPerdidoBuro || form.causasEspurias.length > 0;
    if (!diagnChecked) {
      setError('Selecciona al menos un hallazgo en tu diagnóstico.');
      return;
    }
    setError('');
    setEnviando(true);

    socket.emit('equipo:diagnostico', { diagnostico: form }, (resp: any) => {
      setEnviando(false);
      if (resp?.error) {
        setError(resp.error);
        return;
      }
      setEnviado(true);
      if (resp?.resultado) onResultado(resp.resultado);
    });
  }

  if (enviado) return null;

  return (
    <div className="diagnostico">
      <h3 className="diagnostico__titulo">Diagnóstico final</h3>
      <div className="diagnostico__seccion">
        <h4>Hallazgos causales</h4>
        <label className="diagnostico__check">
          <input type="checkbox" checked={form.ventanaCapturaEsCuello}
            onChange={e => setForm(p => ({ ...p, ventanaCapturaEsCuello: e.target.checked }))} />
          La ventana de captura es el cuello de botella del proceso
        </label>
        <label className="diagnostico__check">
          <input type="checkbox" checked={form.reprocesoEsMecanismo}
            onChange={e => setForm(p => ({ ...p, reprocesoEsMecanismo: e.target.checked }))} />
          El reproceso por errores de captura es el mecanismo principal
        </label>
        <label className="diagnostico__check">
          <input type="checkbox" checked={form.fugaPlastico}
            onChange={e => setForm(p => ({ ...p, fugaPlastico: e.target.checked }))} />
          Hay fuga de plásticos aprobados que nunca se envían
        </label>
        <label className="diagnostico__check">
          <input type="checkbox" checked={form.trabajoPerdidoBuro}
            onChange={e => setForm(p => ({ ...p, trabajoPerdidoBuro: e.target.checked }))} />
          Se pierde trabajo en casos que el buró rechazaría
        </label>
      </div>

      <div className="diagnostico__seccion">
        <h4>Concentración</h4>
        <label className="diagnostico__check">
          <input type="checkbox" checked={form.concentracionSinMasa}
            onChange={e => setForm(p => ({ ...p, concentracionSinMasa: e.target.checked }))} />
          Los errores están concentrados en pocas sucursales (sin masa real)
        </label>
      </div>

      <div className="diagnostico__seccion">
        <h4>Otras causas identificadas</h4>
        <p style={{ fontSize: 12, color: 'var(--ipd-text-tertiary)', marginBottom: 8 }}>
          Marca las que consideres causas del problema (cuidado: algunas son trampas).
        </p>
        {CAUSAS_OPCIONES.map(c => (
          <label key={c.key} className="diagnostico__check">
            <input type="checkbox" checked={form.causasEspurias.includes(c.key)}
              onChange={() => toggleCausa(c.key)} />
            {c.label}
          </label>
        ))}
      </div>

      {error && <p style={{ color: 'var(--ipd-feedback-danger-fg)', fontSize: 12, marginTop: 8 }}>{error}</p>}

      <button className="diagnostico__enviar" onClick={enviar}
        disabled={enviando}>
        {enviando ? 'Enviando...' : 'Enviar diagnóstico al consejo'}
      </button>
    </div>
  );
}
