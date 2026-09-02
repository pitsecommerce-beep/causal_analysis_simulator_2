import { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../lib/socket';
import type { EstadoReloj, EquipoTablero } from '../lib/tipos';
import { NOMBRES_FASES } from '../lib/tipos';
import { PodioReveal } from './PodioReveal';

interface Props {
  codigoSala: string;
  onCerrarSesion?: () => void;
}

interface PiezaCliente {
  nombre: string;
  texto: string;
  genero: string;
  estado: string;
  sucursal: number;
  intentos: number;
  tieneAudio: boolean;
}

interface DatosEscena {
  director: { nombre: string; texto: string; tieneAudio: boolean };
  adriana?: { nombre: string; texto: string; tieneAudio: boolean };
  clientes: PiezaCliente[];
}

type FaseProyeccion =
  | 'esperando'
  | 'sala_juntas'
  | 'voz_cliente'
  | 'transicion'
  | 'trimestres'
  | 'consejo'
  | 'finalizado';

function formatearTiempo(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const seg = Math.floor(segundos % 60);
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
}

function mapearFase(fase: string): FaseProyeccion {
  switch (fase) {
    case 'espera': return 'esperando';
    case 'sala_juntas': return 'sala_juntas';
    case 'voz_cliente': return 'voz_cliente';
    case 'transicion': return 'transicion';
    case 'trimestre_1':
    case 'trimestre_2':
    case 'trimestre_3':
      return 'trimestres';
    case 'consejo': return 'consejo';
    case 'finalizado': return 'finalizado';
    default: return 'esperando';
  }
}

const VEL_ESCRITURA = 32;

export function ProyeccionApp({ codigoSala, onCerrarSesion }: Props) {
  const [reloj, setReloj] = useState<EstadoReloj | null>(null);
  const [equipos, setEquipos] = useState<EquipoTablero[]>([]);
  const [totalParticipantes, setTotalParticipantes] = useState(0);
  const [escena, setEscena] = useState<DatosEscena | null>(null);
  const [faseProyeccion, setFaseProyeccion] = useState<FaseProyeccion>('esperando');

  // Act 1 state
  const [indiceCliente, setIndiceCliente] = useState(0);
  const [subtitulo, setSubtitulo] = useState('');
  const [nombreActivo, setNombreActivo] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargarEstado = useCallback(() => {
    socket.emit('proyeccion:tablero', { codigoSala }, (resp: any) => {
      if (resp?.error) return;
      setReloj(resp.reloj);
      setEquipos(resp.equipos);
      setTotalParticipantes(resp.totalParticipantes ?? 0);
    });
  }, [codigoSala]);

  // Initial load + polling
  useEffect(() => {
    socket.emit('proyeccion:unirse', { codigoSala }, (resp: any) => {
      if (resp?.error) return;
      setReloj(resp.reloj);
      setEquipos(resp.equipos);
      setTotalParticipantes(resp.totalParticipantes ?? 0);
    });

    pollingRef.current = setInterval(cargarEstado, 5000);

    function onTick(data: EstadoReloj) {
      setReloj(data);
    }

    function onEquipoUnido() {
      cargarEstado();
    }

    function onEquipoDiag() {
      cargarEstado();
    }

    socket.on('reloj:tick', onTick);
    socket.on('sesion:equipo_unido', onEquipoUnido);
    socket.on('sesion:equipo_diagnostico', onEquipoDiag);
    socket.on('sesion:participante_conectado', cargarEstado);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      socket.off('reloj:tick', onTick);
      socket.off('sesion:equipo_unido', onEquipoUnido);
      socket.off('sesion:equipo_diagnostico', onEquipoDiag);
      socket.off('sesion:participante_conectado', cargarEstado);
    };
  }, [codigoSala, cargarEstado]);

  // Track phase transitions
  useEffect(() => {
    if (!reloj) return;
    const nuevaFase = mapearFase(reloj.fase);
    setFaseProyeccion(prev => {
      if (prev !== nuevaFase) return nuevaFase;
      return prev;
    });
  }, [reloj?.fase]);

  // Request scene data when entering Act 1 phases
  useEffect(() => {
    if (faseProyeccion !== 'sala_juntas' && faseProyeccion !== 'voz_cliente') return;
    if (escena) return;

    socket.emit('escena:solicitar', { codigoSala }, (resp: any) => {
      if (resp?.escena) {
        setEscena(resp.escena);
      } else if (resp?.estado === 'generando') {
        const poll = setInterval(() => {
          socket.emit('escena:solicitar', { codigoSala }, (r2: any) => {
            if (r2?.escena) {
              setEscena(r2.escena);
              clearInterval(poll);
            }
          });
        }, 2000);
        return () => clearInterval(poll);
      }
    });
  }, [faseProyeccion, codigoSala, escena]);

  // Typewriter effect
  const escribirTexto = useCallback((texto: string, nombre: string) => {
    setSubtitulo('');
    setNombreActivo(nombre);
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

  // Play audio for projection
  const reproducirAudio = useCallback((rol: 'director' | 'adriana' | 'cliente', indice?: number) => {
    socket.emit('escena:audio', { codigoSala, rol, indice }, (resp: any) => {
      if (resp?.audio) {
        try {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          const bytes = atob(resp.audio);
          const arr = new Uint8Array(bytes.length);
          for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
          const blob = new Blob([arr], { type: 'audio/mp3' });
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.play().catch(() => {});
        } catch { /* subtitles still visible */ }
      }
    });
  }, [codigoSala]);

  // Director speech during sala_juntas
  useEffect(() => {
    if (faseProyeccion !== 'sala_juntas' || !escena) return;
    escribirTexto(escena.director.texto, escena.director.nombre);
    if (escena.director.tieneAudio) reproducirAudio('director');

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [faseProyeccion, escena, escribirTexto, reproducirAudio]);

  // Client testimonials during voz_cliente
  useEffect(() => {
    if (faseProyeccion !== 'voz_cliente' || !escena) return;
    const c = escena.clientes[indiceCliente];
    if (!c) return;
    escribirTexto(c.texto, c.nombre);
    if (c.tieneAudio) reproducirAudio('cliente', indiceCliente);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [faseProyeccion, indiceCliente, escena, escribirTexto, reproducirAudio]);

  // Auto-advance clients when text finishes
  useEffect(() => {
    if (faseProyeccion !== 'voz_cliente' || escribiendo || !escena) return;
    if (indiceCliente >= escena.clientes.length - 1) return;
    const timer = setTimeout(() => {
      setIndiceCliente(i => i + 1);
    }, 4000);
    return () => clearTimeout(timer);
  }, [faseProyeccion, escribiendo, indiceCliente, escena]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const fase = reloj ? (NOMBRES_FASES[reloj.fase] ?? reloj.fase) : '';
  const equiposOrdenados = [...equipos].sort((a, b) => {
    const ta = a.resultado?.total ?? -1;
    const tb = b.resultado?.total ?? -1;
    return tb - ta;
  });

  return (
    <div className="proy" data-fase={faseProyeccion}>
      {/* Waiting for participants */}
      {faseProyeccion === 'esperando' && (
        <div className="proy__espera">
          <h1 className="proy__codigo">{codigoSala}</h1>
          <p className="proy__instruccion">Ingresa este codigo en tu dispositivo</p>
          <div className="proy__contadores">
            <div className="proy__contador">
              <span className="proy__contador-numero">{equipos.length}</span>
              <span className="proy__contador-label">equipos</span>
            </div>
            <div className="proy__contador">
              <span className="proy__contador-numero">{totalParticipantes}</span>
              <span className="proy__contador-label">participantes</span>
            </div>
          </div>
          {equipos.length > 0 && (
            <div className="proy__equipos-formando">
              {equipos.map(eq => (
                <div key={eq.nombre} className="proy__equipo-chip">
                  <span className="proy__equipo-chip-nombre">{eq.nombre}</span>
                  <span className="proy__equipo-chip-count">{eq.miembros.length}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Director speech - Act 1 */}
      {faseProyeccion === 'sala_juntas' && (
        <div className="proy__acto1">
          <div className="proy__personaje">
            <div className="proy__personaje-avatar">
              <div className="proy__personaje-icono">RB</div>
            </div>
            <h2 className="proy__personaje-nombre">{nombreActivo}</h2>
            <span className="proy__personaje-cargo">Director General, ETF Bank</span>
          </div>
          <div className="proy__subtitulos">
            <p className="proy__subtitulos-texto">
              {subtitulo}
              {escribiendo && <span className="proy__cursor" />}
            </p>
          </div>
        </div>
      )}

      {/* Client testimonials - Act 1 */}
      {faseProyeccion === 'voz_cliente' && escena && (
        <div className="proy__acto1">
          <div className="proy__cliente-ficha">
            <div className="proy__cliente-avatar">
              <div className="proy__personaje-icono">
                {escena.clientes[indiceCliente]?.nombre?.charAt(0) ?? 'C'}
              </div>
            </div>
            <h2 className="proy__personaje-nombre">
              {escena.clientes[indiceCliente]?.nombre ?? 'Cliente'}
            </h2>
            <div className="proy__cliente-datos">
              <span>Estado: {escena.clientes[indiceCliente]?.estado}</span>
              <span>Sucursal: {escena.clientes[indiceCliente]?.sucursal}</span>
              <span>Intentos: {escena.clientes[indiceCliente]?.intentos}</span>
            </div>
            <span className="proy__cliente-indicador">
              {indiceCliente + 1} / {escena.clientes.length}
            </span>
          </div>
          <div className="proy__subtitulos">
            <p className="proy__subtitulos-texto">
              {subtitulo}
              {escribiendo && <span className="proy__cursor" />}
            </p>
          </div>
        </div>
      )}

      {/* Transition */}
      {faseProyeccion === 'transicion' && (
        <div className="proy__transicion">
          <h2 className="proy__transicion-titulo">Asignacion de roles</h2>
          <p className="proy__transicion-desc">
            Cada equipo asigna sus roles: Patrocinador, Lider de Mejora,
            Analista de Datos y Voz del Cliente.
          </p>
        </div>
      )}

      {/* Trimestres - live scoreboard */}
      {faseProyeccion === 'trimestres' && (
        <div className="proy__marcador">
          <div className="proy__marcador-header">
            <span className="proy__marcador-hcol" />
            <span className="proy__marcador-hcol">Equipo</span>
            <span className="proy__marcador-hcol">T</span>
            <span className="proy__marcador-hcol">Captura</span>
            <span className="proy__marcador-hcol">Quejas</span>
            <span className="proy__marcador-hcol">Conv.</span>
            <span className="proy__marcador-hcol">Errores</span>
            <span className="proy__marcador-hcol">Interv.</span>
            <span className="proy__marcador-hcol">Pres.</span>
          </div>
          <div className="proy__marcador-grid">
            {equiposOrdenados.map((eq, idx) => (
              <div key={eq.nombre} className="proy__marcador-fila">
                <span className="proy__marcador-pos">{idx + 1}</span>
                <span className="proy__marcador-nombre">{eq.nombre}</span>
                <span className="proy__marcador-trim">T{eq.trimestre}</span>
                <span className="proy__marcador-kpi">{eq.kpis.ventanaCapturaMediana.toFixed(1)}d</span>
                <span className="proy__marcador-kpi">{eq.kpis.quejas}</span>
                <span className="proy__marcador-kpi">{eq.kpis.conversion.toFixed(0)}%</span>
                <span className="proy__marcador-kpi">{eq.kpis.erroresTotales}</span>
                <span className="proy__marcador-kpi">{eq.intervenciones.length}</span>
                <span className="proy__marcador-pres">${eq.presupuesto}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consejo + Podio — animated reveal */}
      {(faseProyeccion === 'consejo' || faseProyeccion === 'finalizado') && (
        <PodioReveal equipos={equipos} />
      )}

      {/* Persistent clock bar */}
      {reloj && faseProyeccion !== 'esperando' && (
        <div className="proy__barra">
          <span className="proy__barra-sala">{codigoSala}</span>
          <span className={`proy__barra-fase ${reloj.pausado ? 'proy__barra-fase--pausado' : ''}`}>
            {fase} {reloj.pausado ? '(pausado)' : ''}
          </span>
          <span className="proy__barra-reloj">{formatearTiempo(reloj.segundoActual)}</span>
          <span className="proy__barra-equipos">{equipos.length} equipos</span>
        </div>
      )}
    </div>
  );
}
