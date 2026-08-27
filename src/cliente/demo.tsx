import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './ipade-ds/tokens.css';
import './ipade-ds/base.css';
import './estilos.css';

import { StrictMode, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { CanvasSala, type SpriteEscena } from './escena/CanvasSala';
import { CAMARA } from './escena/camara';

const POS = CAMARA.posiciones;

const PERSONAJES = [
  { id: 'director', clave: 'director', grados: POS.director, nombre: 'Dir. Ricardo Molina' },
  { id: 'adriana', clave: 'cliente-2', grados: POS.adriana, nombre: 'Adriana Rueda' },
  { id: 'c0', clave: 'cliente-0', grados: POS['cliente-0'], nombre: 'Carlos Medina' },
  { id: 'c1', clave: 'cliente-1', grados: POS['cliente-1'], nombre: 'Laura Reyes' },
  { id: 'c2', clave: 'cliente-2', grados: POS['cliente-2'], nombre: 'Miguel Torres' },
  { id: 'c3', clave: 'cliente-3', grados: POS['cliente-3'], nombre: 'Ana Gutiérrez' },
];

function DemoApp() {
  const [activoIdx, setActivoIdx] = useState(0);

  const sprites: SpriteEscena[] = PERSONAJES.map((p, i) => ({
    clave: p.clave,
    grados: p.grados,
    nombre: p.nombre,
    activo: i === activoIdx,
  }));

  const siguiente = useCallback(() => {
    setActivoIdx(i => (i + 1) % PERSONAJES.length);
  }, []);

  const anterior = useCallback(() => {
    setActivoIdx(i => (i - 1 + PERSONAJES.length) % PERSONAJES.length);
  }, []);

  return (
    <div className="escena escena--canvas">
      <CanvasSala
        sprites={sprites}
        anguloObjetivo={PERSONAJES[activoIdx].grados}
        rotacionHabilitada={true}
      />

      <div className="escena__overlay">
        <div className="escena__subtitulos">
          <span className="escena__subtitulos-nombre">
            {PERSONAJES[activoIdx].nombre}
          </span>
          <p className="escena__subtitulos-texto">
            Demo de la sala de juntas. Usa A/D o arrastra para girar la cabeza.
            Haz clic en los botones para cambiar de personaje activo.
          </p>
        </div>

        <div className="escena__controles">
          <button className="escena__boton" onClick={anterior}>
            Anterior
          </button>
          <button className="escena__boton" onClick={siguiente}>
            Siguiente
          </button>
          <span className="escena__indicador">
            {activoIdx + 1} / {PERSONAJES.length}
          </span>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DemoApp />
  </StrictMode>,
);
