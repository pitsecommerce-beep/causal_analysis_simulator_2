import { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  onCerrar: () => void;
}

interface Slide {
  titulo: string;
  lineas: string[];
  icono: JSX.Element;
}

const SLIDES: Slide[] = [
  {
    titulo: 'Tu empresa',
    lineas: [
      'ETF Bank tiene un proceso de tarjetas de crédito con problemas.',
      'Tu equipo debe diagnosticar las causas y actuar en 50 minutos.',
    ],
    icono: (
      <svg viewBox="0 0 80 80" aria-hidden="true" className="como-jugar__icono">
        <rect x="10" y="20" width="60" height="40" rx="6" fill="var(--ipd-scene-ropa-lt)" />
        <rect x="18" y="28" width="24" height="4" rx="2" fill="var(--ipd-scene-oro-lt)" />
        <rect x="18" y="36" width="16" height="3" rx="1.5" fill="var(--ipd-scene-oro-md)" />
        <rect x="50" y="42" width="12" height="10" rx="2" fill="var(--ipd-scene-oro-hi)" />
      </svg>
    ),
  },
  {
    titulo: 'Roles del equipo',
    lineas: [
      'Son 4 roles: patrocinador, líder, analista y voz del cliente.',
      'Cada uno tiene acciones distintas dentro del simulador.',
    ],
    icono: (
      <svg viewBox="0 0 80 80" aria-hidden="true" className="como-jugar__icono">
        <circle cx="25" cy="28" r="8" fill="var(--ipd-scene-skin-1-md)" />
        <circle cx="55" cy="28" r="8" fill="var(--ipd-scene-skin-2-md)" />
        <circle cx="25" cy="56" r="8" fill="var(--ipd-scene-skin-3-md)" />
        <circle cx="55" cy="56" r="8" fill="var(--ipd-scene-skin-1-lt)" />
        <rect x="19" y="38" width="12" height="4" rx="2" fill="var(--ipd-scene-ropa-lt)" />
        <rect x="49" y="38" width="12" height="4" rx="2" fill="var(--ipd-scene-ropa-md)" />
        <rect x="19" y="66" width="12" height="4" rx="2" fill="var(--ipd-scene-ropa-dk)" />
        <rect x="49" y="66" width="12" height="4" rx="2" fill="var(--ipd-scene-ropa-lt)" />
      </svg>
    ),
  },
  {
    titulo: 'Consultas de datos',
    lineas: [
      'Tienes 12 créditos de indagación para ejecutar consultas.',
      'Cada consulta cuesta 1 crédito; intervenir cuesta 3.',
    ],
    icono: (
      <svg viewBox="0 0 80 80" aria-hidden="true" className="como-jugar__icono">
        <rect x="10" y="55" width="10" height="20" rx="2" fill="var(--ipd-scene-ropa-lt)" />
        <rect x="24" y="40" width="10" height="35" rx="2" fill="var(--ipd-scene-oro-md)" />
        <rect x="38" y="25" width="10" height="50" rx="2" fill="var(--ipd-scene-ropa-md)" />
        <rect x="52" y="35" width="10" height="40" rx="2" fill="var(--ipd-scene-oro-lt)" />
        <rect x="66" y="15" width="10" height="60" rx="2" fill="var(--ipd-scene-ropa-lt)" />
      </svg>
    ),
  },
  {
    titulo: 'Presupuesto',
    lineas: [
      'El equipo tiene 100 unidades de presupuesto para intervenciones.',
      'Las intervenciones cuestan entre 5 y 100 unidades cada una.',
    ],
    icono: (
      <svg viewBox="0 0 80 80" aria-hidden="true" className="como-jugar__icono">
        <circle cx="40" cy="40" r="28" fill="none" stroke="var(--ipd-scene-oro-md)" strokeWidth="4" />
        <text x="40" y="46" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--ipd-scene-oro-dk)">$</text>
      </svg>
    ),
  },
  {
    titulo: 'Tres trimestres',
    lineas: [
      'La simulación se divide en 3 trimestres de análisis.',
      'Al final presentas tu diagnóstico ante el consejo directivo.',
    ],
    icono: (
      <svg viewBox="0 0 80 80" aria-hidden="true" className="como-jugar__icono">
        <rect x="8" y="30" width="18" height="30" rx="3" fill="var(--ipd-scene-ropa-lt)" />
        <rect x="31" y="20" width="18" height="40" rx="3" fill="var(--ipd-scene-oro-md)" />
        <rect x="54" y="10" width="18" height="50" rx="3" fill="var(--ipd-scene-ropa-md)" />
        <text x="17" y="50" textAnchor="middle" fontSize="10" fill="var(--ipd-scene-pared-hi)">1</text>
        <text x="40" y="45" textAnchor="middle" fontSize="10" fill="var(--ipd-scene-pared-hi)">2</text>
        <text x="63" y="40" textAnchor="middle" fontSize="10" fill="var(--ipd-scene-pared-hi)">3</text>
      </svg>
    ),
  },
  {
    titulo: 'Voz del cliente',
    lineas: [
      'Puedes revisar comentarios reales de clientes del banco.',
      'Marca los que consideres evidencia para tu diagnóstico.',
    ],
    icono: (
      <svg viewBox="0 0 80 80" aria-hidden="true" className="como-jugar__icono">
        <rect x="12" y="15" width="50" height="35" rx="6" fill="var(--ipd-scene-pared-lt)" />
        <polygon points="25,50 35,50 22,62" fill="var(--ipd-scene-pared-lt)" />
        <rect x="20" y="24" width="28" height="3" rx="1.5" fill="var(--ipd-scene-ropa-lt)" />
        <rect x="20" y="31" width="20" height="3" rx="1.5" fill="var(--ipd-scene-ropa-md)" />
        <rect x="20" y="38" width="24" height="3" rx="1.5" fill="var(--ipd-scene-ropa-lt)" />
      </svg>
    ),
  },
  {
    titulo: 'Diagnóstico final',
    lineas: [
      'El líder completa el diagnóstico con las causas encontradas.',
      'El puntaje evalúa diagnóstico, rigor, impacto y velocidad.',
    ],
    icono: (
      <svg viewBox="0 0 80 80" aria-hidden="true" className="como-jugar__icono">
        <rect x="15" y="10" width="50" height="60" rx="4" fill="var(--ipd-scene-pared-lt)" />
        <rect x="22" y="18" width="30" height="3" rx="1.5" fill="var(--ipd-scene-ropa-lt)" />
        <rect x="22" y="26" width="20" height="3" rx="1.5" fill="var(--ipd-scene-ropa-md)" />
        <circle cx="26" cy="38" r="3" fill="var(--ipd-feedback-success, var(--ipd-scene-oro-md))" />
        <rect x="33" y="36" width="22" height="3" rx="1.5" fill="var(--ipd-scene-ropa-lt)" />
        <circle cx="26" cy="48" r="3" fill="var(--ipd-feedback-success, var(--ipd-scene-oro-md))" />
        <rect x="33" y="46" width="18" height="3" rx="1.5" fill="var(--ipd-scene-ropa-lt)" />
        <circle cx="26" cy="58" r="3" fill="var(--ipd-scene-oro-md)" />
        <rect x="33" y="56" width="24" height="3" rx="1.5" fill="var(--ipd-scene-ropa-lt)" />
      </svg>
    ),
  },
];

export function ComoJugar({ onCerrar }: Props) {
  const [actual, setActual] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const primerBotonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    primerBotonRef.current?.focus();
  }, []);

  const ir = useCallback((dir: number) => {
    setActual(prev => {
      const next = prev + dir;
      if (next < 0) return 0;
      if (next >= SLIDES.length) return prev;
      return next;
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); ir(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); ir(-1); }
      else if (e.key === 'Escape') { e.preventDefault(); onCerrar(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ir, onCerrar]);

  const slide = SLIDES[actual];
  const esUltimo = actual === SLIDES.length - 1;

  return (
    <dialog
      ref={dialogRef}
      className="como-jugar"
      aria-label="Cómo jugar"
      onClose={onCerrar}
    >
      <div className="como-jugar__contenido">
        <button
          className="como-jugar__cerrar"
          onClick={onCerrar}
          aria-label="Cerrar"
          ref={primerBotonRef}
        >
          &times;
        </button>

        <div className="como-jugar__slide" key={actual}>
          {slide.icono}
          <h2 className="como-jugar__titulo">{slide.titulo}</h2>
          {slide.lineas.map((linea, i) => (
            <p key={i} className="como-jugar__texto">{linea}</p>
          ))}
        </div>

        <div className="como-jugar__progreso">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`como-jugar__punto ${i === actual ? 'como-jugar__punto--activo' : ''}`}
              onClick={() => setActual(i)}
              aria-label={`Slide ${i + 1} de ${SLIDES.length}`}
            />
          ))}
        </div>

        <div className="como-jugar__nav">
          <button
            className="ipd-btn ipd-btn--ghost"
            onClick={() => ir(-1)}
            disabled={actual === 0}
          >
            Anterior
          </button>
          {esUltimo ? (
            <button className="ipd-btn ipd-btn--primary" onClick={onCerrar}>
              Entendido
            </button>
          ) : (
            <button className="ipd-btn ipd-btn--primary" onClick={() => ir(1)}>
              Siguiente
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
