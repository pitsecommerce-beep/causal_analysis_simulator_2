import { useState, useEffect, useCallback, useRef } from 'react';
import { SalaJuntas } from './SalaJuntas';
import { VozCliente } from './VozCliente';
import { MesaRedonda } from './MesaRedonda';
import { socket } from '../lib/socket';
import type { RolEquipo, MiembroEquipo } from '../lib/tipos';

interface PiezaDirector {
  nombre: string;
  texto: string;
  fuenteTexto: 'ia' | 'respaldo';
  tieneAudio: boolean;
}

interface PiezaCliente {
  nombre: string;
  genero: string;
  estado: string;
  sucursal: number;
  intentos: number;
  texto: string;
  fuenteTexto: 'ia' | 'respaldo';
  tieneAudio: boolean;
}

interface DatosEscena {
  director: PiezaDirector;
  clientes: PiezaCliente[];
}

interface Props {
  codigoSala: string;
  nombreEquipo: string;
  tamanoEquipo: number;
  onTerminar: (miembros: MiembroEquipo[], miRol: RolEquipo, miNombre: string) => void;
}

type PantallaEscena = 'cargando' | 'director' | 'clientes' | 'mesa';

const VEL_ESCRITURA = 28;

export function EscenaApp({ codigoSala, nombreEquipo, tamanoEquipo, onTerminar }: Props) {
  const [escena, setEscena] = useState<DatosEscena | null>(null);
  const [pantalla, setPantalla] = useState<PantallaEscena>('cargando');
  const [indiceCliente, setIndiceCliente] = useState(0);
  const [subtitulo, setSubtitulo] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const pedirAudio = useCallback((rol: 'director' | 'cliente', indice?: number) => {
    limpiarAudio();
    socket.emit('escena:audio', { codigoSala, rol, indice }, (resp: any) => {
      if (resp?.audio) {
        try {
          const blob = base64ToBlob(resp.audio, 'audio/mp3');
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.play().catch(() => {});
        } catch { /* subtitles still visible */ }
      }
    });
  }, [codigoSala, limpiarAudio]);

  useEffect(() => {
    if (!escena) return;

    if (pantalla === 'director') {
      escribirTexto(escena.director.texto);
      if (escena.director.tieneAudio) pedirAudio('director');
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

    if (pantalla === 'director') {
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

  if (pantalla === 'director' && escena) {
    const personajes = [
      { nombre: escena.director.nombre, genero: 'M', rol: 'director' as const, activo: true },
      ...escena.clientes.map((c, i) => ({
        nombre: c.nombre,
        genero: c.genero,
        rol: 'cliente' as const,
        activo: false,
      })),
    ];

    return (
      <div className="escena">
        <SalaJuntas personajes={personajes} indiceActivo={0} />

        <div className="escena__subtitulos">
          <span className="escena__subtitulos-nombre">{escena.director.nombre}</span>
          <p className="escena__subtitulos-texto">
            {subtitulo}
            {escribiendo && <span className="escena__subtitulos-cursor" />}
          </p>
        </div>

        <div className="escena__controles">
          <button className="escena__boton" onClick={avanzar}>
            {escribiendo ? 'Mostrar todo' : 'Siguiente'}
          </button>
          <button className="escena__boton escena__boton--skip" onClick={saltar}>
            Saltar escena
          </button>
        </div>
      </div>
    );
  }

  if (pantalla === 'clientes' && escena) {
    const cliente = escena.clientes[indiceCliente];
    const esUltimo = indiceCliente >= escena.clientes.length - 1;

    return (
      <div className="escena">
        <VozCliente
          nombre={cliente.nombre}
          genero={cliente.genero}
          estado={cliente.estado}
          sucursal={cliente.sucursal}
          intentos={cliente.intentos}
          indice={indiceCliente}
          total={escena.clientes.length}
        />

        <div className="escena__subtitulos">
          <span className="escena__subtitulos-nombre">{cliente.nombre}</span>
          <p className="escena__subtitulos-texto">
            {subtitulo}
            {escribiendo && <span className="escena__subtitulos-cursor" />}
          </p>
        </div>

        <div className="escena__controles">
          <button className="escena__boton" onClick={avanzar}>
            {escribiendo ? 'Mostrar todo' : esUltimo ? 'Continuar' : 'Siguiente cliente'}
          </button>
          <button className="escena__boton escena__boton--skip" onClick={saltar}>
            Saltar escena
          </button>
          <span className="escena__indicador">
            {indiceCliente + 1} / {escena.clientes.length}
          </span>
        </div>
      </div>
    );
  }

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

function base64ToBlob(base64: string, mime: string): Blob {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i);
  }
  return new Blob([arr], { type: mime });
}
