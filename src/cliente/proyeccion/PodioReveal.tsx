import { useState, useEffect, useRef, useCallback } from 'react';
import type { EquipoTablero } from '../lib/tipos';
import { NOMBRES_FINALES } from '../lib/tipos';

interface Props {
  equipos: EquipoTablero[];
  onSaltar?: () => void;
}

type PasoReveal =
  | 'oscuro'
  | 'titulo'
  | 'letras'
  | 'puntajes'
  | 'ranking'
  | 'podio'
  | 'ganador'
  | 'completo';

const DURACIONES: Record<PasoReveal, number> = {
  oscuro: 2000,
  titulo: 4000,
  letras: 12000,
  puntajes: 10000,
  ranking: 8000,
  podio: 10000,
  ganador: 12000,
  completo: 0,
};

const SECUENCIA: PasoReveal[] = [
  'oscuro', 'titulo', 'letras', 'puntajes', 'ranking', 'podio', 'ganador', 'completo',
];

export function PodioReveal({ equipos, onSaltar }: Props) {
  const [paso, setPaso] = useState<PasoReveal>('oscuro');
  const [indiceLetra, setIndiceLetra] = useState(-1);
  const [contadores, setContadores] = useState<Map<string, number>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contadorRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const terminados = equipos.filter(eq => eq.resultado != null);
  const ordenados = [...terminados].sort(
    (a, b) => (a.resultado?.total ?? 0) - (b.resultado?.total ?? 0),
  );
  const reverso = [...ordenados].reverse();
  const sinTerminar = equipos.filter(eq => eq.resultado == null);

  const avanzar = useCallback(() => {
    setPaso(prev => {
      const idx = SECUENCIA.indexOf(prev);
      if (idx < SECUENCIA.length - 1) return SECUENCIA[idx + 1];
      return prev;
    });
  }, []);

  useEffect(() => {
    if (paso === 'completo') return;
    const dur = DURACIONES[paso];
    if (dur <= 0) return;
    timerRef.current = setTimeout(avanzar, dur);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [paso, avanzar]);

  useEffect(() => {
    if (paso !== 'letras') { setIndiceLetra(-1); return; }
    if (ordenados.length === 0) { avanzar(); return; }
    let i = 0;
    setIndiceLetra(0);
    const interval = Math.min(2000, 10000 / ordenados.length);
    const id = setInterval(() => {
      i++;
      if (i >= ordenados.length) {
        clearInterval(id);
      } else {
        setIndiceLetra(i);
      }
    }, interval);
    return () => clearInterval(id);
  }, [paso, ordenados.length, avanzar]);

  useEffect(() => {
    if (paso !== 'puntajes') { setContadores(new Map()); return; }
    const targets = new Map<string, number>();
    reverso.forEach(eq => targets.set(eq.nombre, eq.resultado?.total ?? 0));
    const current = new Map<string, number>();
    reverso.forEach(eq => current.set(eq.nombre, 0));
    setContadores(new Map(current));

    const pasos = 60;
    let frame = 0;
    contadorRef.current = setInterval(() => {
      frame++;
      const next = new Map<string, number>();
      targets.forEach((target, nombre) => {
        const val = Math.round((target * Math.min(frame, pasos)) / pasos);
        next.set(nombre, val);
      });
      setContadores(new Map(next));
      if (frame >= pasos && contadorRef.current) clearInterval(contadorRef.current);
    }, 140);
    return () => { if (contadorRef.current) clearInterval(contadorRef.current); };
  }, [paso]);

  const pasoIdx = SECUENCIA.indexOf(paso);
  const mostrarLetras = pasoIdx >= SECUENCIA.indexOf('letras');
  const mostrarPuntajes = pasoIdx >= SECUENCIA.indexOf('puntajes');
  const mostrarRanking = pasoIdx >= SECUENCIA.indexOf('ranking');
  const mostrarPodio = pasoIdx >= SECUENCIA.indexOf('podio');
  const mostrarGanador = pasoIdx >= SECUENCIA.indexOf('ganador');
  const esCompleto = paso === 'completo';

  const listaOrdenada = mostrarRanking ? reverso : ordenados;

  return (
    <div className={`reveal ${paso === 'oscuro' ? 'reveal--oscuro' : ''}`}>
      {onSaltar && paso !== 'completo' && (
        <button
          className="reveal__saltar"
          onClick={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (contadorRef.current) clearInterval(contadorRef.current);
            setPaso('completo');
            onSaltar?.();
          }}
        >
          Saltar revelacion
        </button>
      )}

      <div className={`reveal__titulo ${pasoIdx >= 1 ? 'reveal__titulo--visible' : ''}`}>
        <h1>{mostrarGanador ? 'Resultados Finales' : 'El Consejo ha deliberado...'}</h1>
      </div>

      <div className="reveal__grid">
        {listaOrdenada.map((eq, idx) => {
          const pos = mostrarRanking ? idx + 1 : null;
          const esTop3 = mostrarPodio && pos != null && pos <= 3;
          const esGanadorFila = mostrarGanador && pos === 1;
          const letraVisible = mostrarLetras && (
            esCompleto || indiceLetra >= (ordenados.length - 1 - ordenados.indexOf(eq))
          );
          const puntos = esCompleto
            ? (eq.resultado?.total ?? 0)
            : (contadores.get(eq.nombre) ?? 0);
          const final_ = eq.resultado?.final ?? '';

          return (
            <div
              key={eq.nombre}
              className={`reveal__fila ${letraVisible ? 'reveal__fila--visible' : ''} ${esTop3 ? 'reveal__fila--top' : ''} ${esGanadorFila ? 'reveal__fila--ganador' : ''}`}
              style={{ animationDelay: mostrarRanking ? `${idx * 0.15}s` : '0s' }}
            >
              {pos != null && (
                <span className={`reveal__pos ${esTop3 ? 'reveal__pos--top' : ''}`}>
                  #{pos}
                </span>
              )}
              <span className="reveal__nombre">{eq.nombre}</span>
              {letraVisible && (
                <span className={`reveal__final reveal__final--${final_.toLowerCase()}`}>
                  {NOMBRES_FINALES[final_] ?? final_}
                </span>
              )}
              {mostrarPuntajes && (
                <span className="reveal__pts">{puntos} pts</span>
              )}
              {esCompleto && eq.resultado && (
                <div className="reveal__desglose">
                  <span>Diag: {eq.resultado.diagnostico}</span>
                  <span>Rigor: {eq.resultado.rigor}</span>
                  <span>Impacto: {eq.resultado.impacto}</span>
                </div>
              )}
            </div>
          );
        })}
        {sinTerminar.map(eq => (
          <div key={eq.nombre} className="reveal__fila reveal__fila--pendiente">
            <span className="reveal__nombre">{eq.nombre}</span>
            <span className="reveal__pendiente">En progreso...</span>
          </div>
        ))}
      </div>

      {mostrarGanador && reverso.length > 0 && (
        <div className={`reveal__campeon ${esCompleto ? 'reveal__campeon--final' : ''}`}>
          <div className="reveal__campeon-inner">
            <span className="reveal__campeon-label">Primer lugar</span>
            <span className="reveal__campeon-nombre">{reverso[0].nombre}</span>
            <span className="reveal__campeon-pts">{reverso[0].resultado?.total ?? 0} puntos</span>
          </div>
        </div>
      )}

      {esCompleto && (
        <div className="reveal__completo-hint">
          Puntuacion final revelada
        </div>
      )}
    </div>
  );
}
