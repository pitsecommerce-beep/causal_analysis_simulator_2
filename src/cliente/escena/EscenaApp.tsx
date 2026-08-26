import { useState, useEffect, useCallback, useRef } from 'react';
import { SalaJuntas } from './SalaJuntas';
import { socket } from '../lib/socket';

interface PiezaTexto {
  nombre: string;
  genero: string;
  texto: string;
  fuenteTexto: 'ia' | 'respaldo';
  tieneAudio: boolean;
}

interface DatosEscena {
  director: PiezaTexto;
  clientes: PiezaTexto[];
}

interface Props {
  codigoSala: string;
  onTerminar: () => void;
}

const VEL_ESCRITURA = 30;

export function EscenaApp({ codigoSala, onTerminar }: Props) {
  const [escena, setEscena] = useState<DatosEscena | null>(null);
  const [cargando, setCargando] = useState(true);
  const [indicePieza, setIndicePieza] = useState(0);
  const [textoVisible, setTextoVisible] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    socket.emit('escena:solicitar', { codigoSala }, (resp: any) => {
      if (resp?.escena) {
        setEscena(resp.escena);
        setCargando(false);
      } else if (resp?.estado === 'generando') {
        const poll = setInterval(() => {
          socket.emit('escena:solicitar', { codigoSala }, (r2: any) => {
            if (r2?.escena) {
              setEscena(r2.escena);
              setCargando(false);
              clearInterval(poll);
            }
          });
        }, 2000);
        return () => clearInterval(poll);
      } else {
        setCargando(false);
      }
    });
  }, [codigoSala]);

  const piezas = escena
    ? [escena.director, ...escena.clientes]
    : [];

  const piezaActual = piezas[indicePieza] ?? null;

  const escribirTexto = useCallback((texto: string) => {
    setTextoVisible('');
    setEscribiendo(true);
    let pos = 0;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      pos++;
      if (pos >= texto.length) {
        setTextoVisible(texto);
        setEscribiendo(false);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setTextoVisible(texto.slice(0, pos));
      }
    }, VEL_ESCRITURA);
  }, []);

  useEffect(() => {
    if (!piezaActual) return;
    escribirTexto(piezaActual.texto);

    if (piezaActual.tieneAudio) {
      socket.emit(
        'escena:audio',
        {
          codigoSala,
          rol: indicePieza === 0 ? 'director' : 'cliente',
          indice: indicePieza > 0 ? indicePieza - 1 : undefined,
        },
        (resp: any) => {
          if (resp?.audio) {
            try {
              const blob = base64ToBlob(resp.audio, 'audio/mp3');
              const url = URL.createObjectURL(blob);
              const audio = new Audio(url);
              audioRef.current = audio;
              audio.play().catch(() => {});
            } catch {
              // audio failed, subtitles still visible
            }
          }
        },
      );
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [indicePieza, piezaActual, codigoSala, escribirTexto]);

  function avanzar() {
    if (escribiendo) {
      if (timerRef.current) clearInterval(timerRef.current);
      setTextoVisible(piezaActual?.texto ?? '');
      setEscribiendo(false);
      return;
    }
    if (indicePieza < piezas.length - 1) {
      setIndicePieza(i => i + 1);
    } else {
      onTerminar();
    }
  }

  function saltar() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    onTerminar();
  }

  if (cargando) {
    return (
      <div className="escena">
        <div className="escena__cargando">
          <div className="escena__spinner" />
          <span>Preparando sala de juntas...</span>
        </div>
      </div>
    );
  }

  if (!escena || piezas.length === 0) {
    return (
      <div className="escena">
        <div className="escena__cargando">
          <span>Escena no disponible</span>
          <button className="escena__boton" onClick={onTerminar}>
            Continuar al simulador
          </button>
        </div>
      </div>
    );
  }

  const personajes = piezas.map((p, i) => ({
    nombre: p.nombre,
    genero: p.genero,
    rol: (i === 0 ? 'director' : 'cliente') as 'director' | 'cliente',
    activo: i === indicePieza,
  }));

  const esUltima = indicePieza >= piezas.length - 1;
  const etiquetaBoton = escribiendo
    ? 'Mostrar todo'
    : esUltima
      ? 'Iniciar simulador'
      : 'Siguiente';

  return (
    <div className="escena">
      <SalaJuntas personajes={personajes} indiceActivo={indicePieza} />

      <div className="escena__dialogo">
        <div className="escena__dialogo-nombre">
          {piezaActual?.nombre}
        </div>
        <div className="escena__dialogo-texto">
          {textoVisible}
          {escribiendo && <span className="escena__dialogo-cursor" />}
        </div>
      </div>

      <div className="escena__controles">
        <button className="escena__boton" onClick={avanzar}>
          {etiquetaBoton}
        </button>
        <button className="escena__boton escena__boton--skip" onClick={saltar}>
          Saltar escena
        </button>
        <span className="escena__indicador">
          {indicePieza + 1} / {piezas.length}
        </span>
      </div>
    </div>
  );
}

function base64ToBlob(base64: string, mime: string): Blob {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i);
  }
  return new Blob([arr], { type: mime });
}
