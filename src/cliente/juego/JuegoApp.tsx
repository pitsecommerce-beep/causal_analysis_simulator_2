import { useState, useMemo, useCallback, useEffect } from 'react';
import { CanvasSala, type SpriteEscena } from '../escena/CanvasSala';
import { ConsolaApp } from '../consola/ConsolaApp';
import { ModalRol } from './ModalRol';
import { TransicionFase } from './TransicionFase';
import { useAmbiente } from './useAmbiente';
import { CAMARA } from '../escena/camara';
import { socket } from '../lib/socket';
import { usePresencia, type EstadoPresencia } from '../lib/presencia';
import type {
  EstadoMotorCliente,
  EstadoReloj,
  IntervencionCatalogo,
  SolicitudCliente,
  ComentarioClientePublico,
  RolEquipo,
  MiembroEquipo,
} from '../lib/tipos';

interface Props {
  estadoInicial: EstadoMotorCliente;
  relojInicial: EstadoReloj;
  catalogoInicial: IntervencionCatalogo[];
  solicitudes: SolicitudCliente[];
  comentariosClientes: ComentarioClientePublico[];
  codigoSala: string;
  nombreEquipo: string;
  miRol: RolEquipo;
  miNombre: string;
  miembros: MiembroEquipo[];
  tamanoEquipo: number;
  onAbandonar: () => void;
}

const POS = CAMARA.posiciones;
const VARIANTES = ['cf', 'cc', 'mf', 'mc'] as const;

export function JuegoApp(props: Props) {
  const [vista, setVista] = useState<'sala' | 'consola'>('sala');
  const [mostrarModal, setMostrarModal] = useState(true);
  const [animando, setAnimando] = useState(false);
  const [transicion, setTransicion] = useState<string | null>(null);

  const { pares: presenciaPares } = usePresencia(props.miNombre);
  const { activo: ambienteActivo, alternar: alternarAmbiente } = useAmbiente();

  useEffect(() => {
    function onFaseCambio(data: { faseNueva: string }) {
      setTransicion(data.faseNueva);
    }
    socket.on('reloj:fase_cambio', onFaseCambio);
    return () => { socket.off('reloj:fase_cambio', onFaseCambio); };
  }, []);

  const companeros = useMemo(() => {
    return props.miembros
      .filter(m => m.nombre !== props.miNombre)
      .map((m, i) => ({
        nombre: m.nombre,
        variante: VARIANTES[i % VARIANTES.length],
        posKey: `companero-${i}` as keyof typeof POS,
      }));
  }, [props.miembros, props.miNombre]);

  const sprites = useMemo<SpriteEscena[]>(() => {
    return companeros.map(c => {
      const estado: EstadoPresencia = presenciaPares.get(c.nombre) ?? 'idle';
      return {
        clave: `companero-${c.variante}-${estado}`,
        grados: POS[c.posKey] ?? 0,
        nombre: c.nombre,
        activo: estado !== 'idle' && estado !== 'desconectado',
      };
    });
  }, [companeros, presenciaPares]);

  const abrirConsola = useCallback(() => {
    setAnimando(true);
    setTimeout(() => {
      setVista('consola');
      setAnimando(false);
    }, 400);
  }, []);

  const volverSala = useCallback(() => {
    setAnimando(true);
    setTimeout(() => {
      setVista('sala');
      setAnimando(false);
    }, 300);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && vista === 'consola') {
        volverSala();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [vista, volverSala]);

  return (
    <div className="juego">
      <div
        className={`juego__sala ${vista === 'consola' ? 'juego__sala--oculta' : ''} ${animando && vista === 'sala' ? 'juego__sala--zoom' : ''}`}
      >
        <CanvasSala sprites={sprites} rotacionHabilitada={vista === 'sala'} />

        <div className="juego__hud">
          <div className="juego__hud-equipo">
            <span className="juego__hud-nombre">{props.nombreEquipo}</span>
            <span className="juego__hud-info">
              T{props.estadoInicial.trimestre} · Sala {props.codigoSala}
            </span>
          </div>

          <button className="juego__btn-laptop" onClick={abrirConsola}>
            <span className="juego__btn-laptop-icono" />
            Abrir laptop
          </button>

          <div className="juego__hud-controles">
            <button
              className={`juego__btn-sonido ${ambienteActivo ? 'juego__btn-sonido--activo' : ''}`}
              onClick={alternarAmbiente}
              title={ambienteActivo ? 'Silenciar ambiente' : 'Activar ambiente'}
            >
              {ambienteActivo ? '\u{1F50A}' : '\u{1F507}'}
            </button>
            <button
              className="juego__btn-abandonar"
              onClick={() => {
                if (confirm('Abandonar la sesion? Podras reconectarte con tu codigo personal.')) {
                  props.onAbandonar();
                }
              }}
              title="Abandonar sesion"
            >
              Salir
            </button>
          </div>

          <div className="juego__hud-companeros">
            {companeros.map(c => {
              const estado = presenciaPares.get(c.nombre) ?? 'idle';
              return (
                <span
                  key={c.nombre}
                  className={`juego__companero-tag juego__companero-tag--${estado}`}
                >
                  {c.nombre.split(' ')[0]}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className={`juego__terminal ${vista === 'sala' ? 'juego__terminal--oculta' : ''} ${animando && vista === 'consola' ? 'juego__terminal--zoom' : ''}`}
      >
        <div className="terminal__marco">
          <div className="terminal__barra">
            <div className="terminal__puntos">
              <span className="terminal__punto terminal__punto--r" />
              <span className="terminal__punto terminal__punto--y" />
              <span className="terminal__punto terminal__punto--g" />
            </div>
            <span className="terminal__camara" />
            <button className="terminal__btn-sala" onClick={volverSala}>
              Volver a la sala
            </button>
          </div>
          <div className="terminal__pantalla">
            <ConsolaApp
              estadoInicial={props.estadoInicial}
              relojInicial={props.relojInicial}
              catalogoInicial={props.catalogoInicial}
              solicitudes={props.solicitudes}
              comentariosClientes={props.comentariosClientes}
              codigoSala={props.codigoSala}
              nombreEquipo={props.nombreEquipo}
              miRol={props.miRol}
              miNombre={props.miNombre}
              miembros={props.miembros}
              tamanoEquipo={props.tamanoEquipo}
              onAbandonar={props.onAbandonar}
            />
          </div>
        </div>
      </div>

      {transicion && (
        <TransicionFase
          faseNueva={transicion}
          onTerminada={() => setTransicion(null)}
        />
      )}

      {mostrarModal && (
        <ModalRol
          rol={props.miRol}
          nombre={props.miNombre}
          onCerrar={() => setMostrarModal(false)}
        />
      )}
    </div>
  );
}
