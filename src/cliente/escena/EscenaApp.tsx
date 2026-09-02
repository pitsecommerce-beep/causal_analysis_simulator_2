import { useState, useEffect, useCallback, useRef } from 'react';
import { CanvasSala, type SpriteEscena } from './CanvasSala';
import { MesaRedonda } from './MesaRedonda';
import { BlocNotas } from './BlocNotas';
import { CAMARA } from './camara';
import { socket } from '../lib/socket';
import type { RolEquipo, MiembroEquipo } from '../lib/tipos';

interface PiezaPersonaje {
  nombre: string;
  texto: string;
  fuenteTexto: 'fijo' | 'directo' | 'respaldo';
  tieneAudio: boolean;
}

interface PiezaCliente extends PiezaPersonaje {
  genero: string;
  estado: string;
  sucursal: number;
  intentos: number;
}

interface DatosEscena {
  director: PiezaPersonaje;
  adriana?: PiezaPersonaje;
  clientes: PiezaCliente[];
}

interface Props {
  codigoSala: string;
  nombreEquipo: string;
  tamanoEquipo: number;
  onTerminar: (miembros: MiembroEquipo[], miRol: RolEquipo, miNombre: string, codigoPersonal: string) => void;
}

type PantallaEscena = 'cargando' | 'director' | 'adriana' | 'clientes' | 'mesa';

const VEL_ESCRITURA = 28;
const POS = CAMARA.posiciones;

export function EscenaApp({ codigoSala, nombreEquipo, tamanoEquipo, onTerminar }: Props) {
  const [escena, setEscena] = useState<DatosEscena | null>(null);
  const [pantalla, setPantalla] = useState<PantallaEscena>('cargando');
  const [indiceCliente, setIndiceCliente] = useState(0);
  const [subtitulo, setSubtitulo] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const [audioBloqueado, setAudioBloqueado] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioPendienteRef = useRef<{ rol: 'director' | 'adriana' | 'cliente'; indice?: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Request scene data
  useEffect(() => {
    socket.emit('escena:solicitar', { codigoSala }, (resp: any) => {
      if (resp?.escena) {
        setEscena(resp.escena);
        setPantalla('director');
      } else if (resp?.estado === 'generando') {
        const poll = setInterval(() => {
          socket.emit('escena:solicitar', { codigoSala }, (r2: any) => {
            if (r2?.escena) {
              setEscena(r2.escena);
              setPantalla('director');
              clearInterval(poll);
            }
          });
        }, 2000);
        return () => clearInterval(poll);
      } else {
        setPantalla('mesa');
      }
    });
  }, [codigoSala]);

  const limpiarAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const escribirTexto = useCallback((texto: string) => {
    setSubtitulo('');
    setEscribiendo(true);
    let pos = 0;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      pos++;
      if (pos >= texto.length) {
        setSubtitulo(texto);
        setEscribiendo(false);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setSubtitulo(texto.slice(0, pos));
      }
    }, VEL_ESCRITURA);
  }, []);

  const reproducirBlob = useCallback((blob: Blob) => {
    limpiarAudio();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play().then(() => {
      setAudioBloqueado(false);
    }).catch(() => {
      setAudioBloqueado(true);
    });
  }, [limpiarAudio]);

  const pedirAudio = useCallback((rol: 'director' | 'adriana' | 'cliente', indice?: number) => {
    audioPendienteRef.current = { rol, indice };
    socket.emit('escena:audio', { codigoSala, rol, indice }, (resp: any) => {
      if (resp?.audio) {
        try {
          const blob = base64ToBlob(resp.audio, 'audio/mp3');
          reproducirBlob(blob);
        } catch { /* subtitles still visible */ }
      }
    });
  }, [codigoSala, reproducirBlob]);

  function desbloquearAudio() {
    setAudioBloqueado(false);
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    } else if (audioPendienteRef.current) {
      pedirAudio(audioPendienteRef.current.rol, audioPendienteRef.current.indice);
    }
  }

  // Start text + audio when phase changes
  useEffect(() => {
    if (!escena) return;

    if (pantalla === 'director') {
      escribirTexto(escena.director.texto);
      if (escena.director.tieneAudio) pedirAudio('director');
    } else if (pantalla === 'adriana' && escena.adriana) {
      escribirTexto(escena.adriana.texto);
      if (escena.adriana.tieneAudio) pedirAudio('adriana');
    } else if (pantalla === 'clientes') {
      const c = escena.clientes[indiceCliente];
      if (c) {
        escribirTexto(c.texto);
        if (c.tieneAudio) pedirAudio('cliente', indiceCliente);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pantalla, indiceCliente, escena, escribirTexto, pedirAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      limpiarAudio();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [limpiarAudio]);

  function completarTexto() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pantalla === 'director' && escena) {
      setSubtitulo(escena.director.texto);
    } else if (pantalla === 'adriana' && escena?.adriana) {
      setSubtitulo(escena.adriana.texto);
    } else if (pantalla === 'clientes' && escena) {
      setSubtitulo(escena.clientes[indiceCliente]?.texto ?? '');
    }
    setEscribiendo(false);
  }

  function avanzar() {
    if (escribiendo) {
      completarTexto();
      return;
    }

    limpiarAudio();
    setAudioBloqueado(false);

    if (pantalla === 'director') {
      if (escena?.adriana) {
        setPantalla('adriana');
      } else if (escena && escena.clientes.length > 0) {
        setIndiceCliente(0);
        setPantalla('clientes');
      } else {
        setPantalla('mesa');
      }
    } else if (pantalla === 'adriana') {
      if (escena && escena.clientes.length > 0) {
        setIndiceCliente(0);
        setPantalla('clientes');
      } else {
        setPantalla('mesa');
      }
    } else if (pantalla === 'clientes' && escena) {
      if (indiceCliente < escena.clientes.length - 1) {
        setIndiceCliente(i => i + 1);
      } else {
        setPantalla('mesa');
      }
    }
  }

  function saltar() {
    limpiarAudio();
    if (timerRef.current) clearInterval(timerRef.current);
    setPantalla('mesa');
  }

  // --- Build sprite list for Canvas ---
  const { spritesCanvas, anguloObjetivo, nombreActivo } = buildSprites(
    escena, pantalla, indiceCliente,
  );

  // --- Render ---

  if (pantalla === 'cargando') {
    return (
      <div className="escena">
        <div className="escena__cargando">
          <div className="escena__spinner" />
          <span>Preparando sala de juntas...</span>
        </div>
      </div>
    );
  }

  if (pantalla === 'mesa') {
    return (
      <div className="escena">
        <MesaRedonda nombreEquipo={nombreEquipo} tamanoEquipo={tamanoEquipo} onIniciar={onTerminar} />
      </div>
    );
  }

  const esClienteUltimo = pantalla === 'clientes' && escena
    ? indiceCliente >= escena.clientes.length - 1
    : false;

  const textoBoton = escribiendo
    ? 'Mostrar todo'
    : pantalla === 'clientes'
      ? esClienteUltimo ? 'Continuar' : 'Siguiente cliente'
      : 'Siguiente';

  return (
    <div className="escena escena--canvas">
      <CanvasSala
        sprites={spritesCanvas}
        anguloObjetivo={anguloObjetivo}
        rotacionHabilitada={true}
      />

      <div className="escena__overlay">
        <div className="escena__subtitulos">
          <span className="escena__subtitulos-nombre">{nombreActivo}</span>
          <p className="escena__subtitulos-texto">
            {subtitulo}
            {escribiendo && <span className="escena__subtitulos-cursor" />}
          </p>
        </div>

        <div className="escena__controles">
          {audioBloqueado && (
            <button className="escena__boton escena__boton--audio" onClick={desbloquearAudio}>
              Activar audio
            </button>
          )}
          <button className="escena__boton" onClick={avanzar}>
            {textoBoton}
          </button>
          <button className="escena__boton escena__boton--skip" onClick={saltar}>
            Saltar escena
          </button>
          {pantalla === 'clientes' && escena && (
            <span className="escena__indicador">
              {indiceCliente + 1} / {escena.clientes.length}
            </span>
          )}
        </div>

        <BlocNotas codigoSala={codigoSala} nombreEquipo={nombreEquipo} />
      </div>
    </div>
  );
}

function buildSprites(
  escena: DatosEscena | null,
  pantalla: PantallaEscena,
  indiceCliente: number,
): { spritesCanvas: SpriteEscena[]; anguloObjetivo: number; nombreActivo: string } {
  if (!escena) return { spritesCanvas: [], anguloObjetivo: 0, nombreActivo: '' };

  const list: SpriteEscena[] = [];
  let anguloObjetivo = 0;
  let nombreActivo = '';

  const dirActivo = pantalla === 'director';
  list.push({
    clave: 'director',
    grados: POS.director,
    nombre: escena.director.nombre,
    activo: dirActivo,
  });
  if (dirActivo) {
    anguloObjetivo = POS.director;
    nombreActivo = escena.director.nombre;
  }

  if (escena.adriana) {
    const adriActivo = pantalla === 'adriana';
    list.push({
      clave: 'cliente-2',
      grados: POS.adriana,
      nombre: escena.adriana.nombre,
      activo: adriActivo,
    });
    if (adriActivo) {
      anguloObjetivo = POS.adriana;
      nombreActivo = escena.adriana.nombre;
    }
  }

  for (let i = 0; i < escena.clientes.length; i++) {
    const c = escena.clientes[i];
    const key = `cliente-${i}` as keyof typeof POS;
    const grados = POS[key] ?? (i - 1.5) * 25;
    const activo = pantalla === 'clientes' && i === indiceCliente;
    list.push({
      clave: `cliente-${i}`,
      grados,
      nombre: c.nombre,
      activo,
    });
    if (activo) {
      anguloObjetivo = grados;
      nombreActivo = c.nombre;
    }
  }

  return { spritesCanvas: list, anguloObjetivo, nombreActivo };
}

function base64ToBlob(base64: string, mime: string): Blob {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i);
  }
  return new Blob([arr], { type: mime });
}
