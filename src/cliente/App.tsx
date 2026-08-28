import { useState, useEffect, lazy, Suspense } from 'react';
import { UnirseEquipo } from './componentes/UnirseEquipo';
import { BannerConexion } from './componentes/BannerConexion';
import type { EstadoMotorCliente, EstadoReloj, IntervencionCatalogo, SolicitudCliente, ComentarioClientePublico, RolEquipo, MiembroEquipo } from './lib/tipos';
import { socket } from './lib/socket';

const STORAGE_KEY = 'etfbank_sesion';

interface SesionGuardada {
  codigoSala: string;
  codigoPersonal: string;
  nombreEquipo: string;
  miNombre: string;
  miRol: RolEquipo;
}

function guardarSesion(datos: SesionGuardada): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(datos)); } catch (_) {}
}

function leerSesion(): SesionGuardada | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const datos = JSON.parse(raw);
    if (datos?.codigoSala && datos?.codigoPersonal) return datos;
  } catch (_) {}
  return null;
}

function borrarSesion(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}

const EscenaApp = lazy(() => import('./escena/EscenaApp').then(m => ({ default: m.EscenaApp })));
const ConsolaApp = lazy(() => import('./consola/ConsolaApp').then(m => ({ default: m.ConsolaApp })));
const JuegoApp = lazy(() => import('./juego/JuegoApp').then(m => ({ default: m.JuegoApp })));
const ProfesorApp = lazy(() => import('./profesor/ProfesorApp').then(m => ({ default: m.ProfesorApp })));

interface DatosSesion {
  estadoMotor: EstadoMotorCliente;
  reloj: EstadoReloj;
  catalogo: IntervencionCatalogo[];
  solicitudes: SolicitudCliente[];
  comentariosClientes: ComentarioClientePublico[];
  codigoSala: string;
  nombreEquipo: string;
  tamanoEquipo: number;
}

interface DatosRol {
  miembros: MiembroEquipo[];
  miRol: RolEquipo;
  miNombre: string;
  codigoPersonal?: string;
}

type Pantalla = 'unirse' | 'reconectando' | 'escena' | 'juego' | 'consola' | 'profesor';

export function App() {
  const sesionGuardada = leerSesion();
  const [sesion, setSesion] = useState<DatosSesion | null>(null);
  const [pantalla, setPantalla] = useState<Pantalla>(sesionGuardada ? 'reconectando' : 'unirse');
  const [datosRol, setDatosRol] = useState<DatosRol | null>(null);
  const [profesorData, setProfesorData] = useState<{ codigoSala: string; clave: string } | null>(null);
  const [errorReconexion, setErrorReconexion] = useState('');

  function abandonarSesion() {
    borrarSesion();
    socket.disconnect();
    setSesion(null);
    setDatosRol(null);
    setPantalla('unirse');
  }

  useEffect(() => {
    if (!sesionGuardada || pantalla !== 'reconectando') return;
    if (!socket.connected) socket.connect();

    socket.emit('equipo:reconectar', {
      codigoSala: sesionGuardada.codigoSala,
      codigoPersonal: sesionGuardada.codigoPersonal,
    }, (resp: any) => {
      if (resp?.error) {
        borrarSesion();
        setErrorReconexion(resp.error);
        setPantalla('unirse');
        return;
      }
      setSesion({
        estadoMotor: resp.estadoMotor,
        reloj: resp.reloj,
        catalogo: resp.intervencionesCatalogo,
        solicitudes: resp.solicitudes ?? [],
        comentariosClientes: resp.comentariosClientes ?? [],
        codigoSala: sesionGuardada.codigoSala,
        nombreEquipo: resp.nombreEquipo,
        tamanoEquipo: resp.tamanoEquipo ?? 4,
      });
      setDatosRol({
        miembros: resp.miembros,
        miRol: resp.miRol,
        miNombre: resp.miNombre,
        codigoPersonal: resp.codigoPersonal,
      });
      setPantalla('juego');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onReconectar(codigoSala: string, codigoPersonal: string) {
    if (!socket.connected) socket.connect();
    socket.emit('equipo:reconectar', { codigoSala, codigoPersonal }, (resp: any) => {
      if (resp?.error) {
        setErrorReconexion(resp.error);
        return;
      }
      guardarSesion({
        codigoSala,
        codigoPersonal: resp.codigoPersonal,
        nombreEquipo: resp.nombreEquipo,
        miNombre: resp.miNombre,
        miRol: resp.miRol,
      });
      setSesion({
        estadoMotor: resp.estadoMotor,
        reloj: resp.reloj,
        catalogo: resp.intervencionesCatalogo,
        solicitudes: resp.solicitudes ?? [],
        comentariosClientes: resp.comentariosClientes ?? [],
        codigoSala,
        nombreEquipo: resp.nombreEquipo,
        tamanoEquipo: resp.tamanoEquipo ?? 4,
      });
      setDatosRol({
        miembros: resp.miembros,
        miRol: resp.miRol,
        miNombre: resp.miNombre,
        codigoPersonal: resp.codigoPersonal,
      });
      setPantalla('juego');
    });
  }

  function onUnido(datos: DatosSesion) {
    setSesion(datos);
    const faseActual = datos.reloj.fase;
    if (faseActual === 'sala_juntas' || faseActual === 'voz_cliente' || faseActual === 'espera') {
      setPantalla('escena');
    } else {
      setPantalla('consola');
    }
  }

  function onProfesor(codigoSala: string, clave: string) {
    socket.connect();
    socket.emit('profesor:crear_sesion', { clave }, (resp: any) => {
      if (resp?.error) {
        alert(resp.error);
        return;
      }
      setProfesorData({ codigoSala: resp.codigoSala, clave });
      setPantalla('profesor');
    });
  }

  function onProfesorUnirse(codigoSala: string, clave: string) {
    socket.connect();
    socket.emit('profesor:estado', { clave, codigoSala }, (resp: any) => {
      if (resp?.error) {
        alert(resp.error);
        return;
      }
      socket.emit('profesor:crear_sesion', { clave }, () => {});
      setProfesorData({ codigoSala, clave });
      setPantalla('profesor');
    });
  }

  const cargando = (
    <div className="escena">
      <div className="escena__cargando">
        <div className="escena__spinner" />
        <span>Cargando...</span>
      </div>
    </div>
  );

  if (pantalla === 'profesor' && profesorData) {
    return (
      <Suspense fallback={cargando}>
        <ProfesorApp codigoSala={profesorData.codigoSala} clave={profesorData.clave} />
      </Suspense>
    );
  }

  if (pantalla === 'reconectando') {
    return (
      <div className="escena">
        <div className="escena__cargando">
          <div className="escena__spinner" />
          <span>Reconectando...</span>
        </div>
      </div>
    );
  }

  if (pantalla === 'unirse' || !sesion) {
    return (
      <UnirseEquipo
        onUnido={onUnido}
        onProfesor={onProfesor}
        onProfesorUnirse={onProfesorUnirse}
        onReconectar={onReconectar}
        errorReconexion={errorReconexion}
      />
    );
  }

  if (pantalla === 'escena') {
    return (
      <Suspense fallback={cargando}>
        <EscenaApp
          codigoSala={sesion.codigoSala}
          nombreEquipo={sesion.nombreEquipo}
          tamanoEquipo={sesion.tamanoEquipo}
          onTerminar={(miembros, miRol, miNombre, codigoPersonal) => {
            setDatosRol({ miembros, miRol, miNombre, codigoPersonal });
            if (codigoPersonal) {
              guardarSesion({
                codigoSala: sesion.codigoSala,
                codigoPersonal,
                nombreEquipo: sesion.nombreEquipo,
                miNombre,
                miRol,
              });
            }
            setPantalla('juego');
          }}
        />
      </Suspense>
    );
  }

  if (pantalla === 'juego' && datosRol) {
    return (
      <>
        <BannerConexion onSesionTomada={abandonarSesion} />
        <Suspense fallback={cargando}>
          <JuegoApp
            estadoInicial={sesion.estadoMotor}
            relojInicial={sesion.reloj}
            catalogoInicial={sesion.catalogo}
            solicitudes={sesion.solicitudes}
            comentariosClientes={sesion.comentariosClientes}
            codigoSala={sesion.codigoSala}
            nombreEquipo={sesion.nombreEquipo}
            miRol={datosRol.miRol}
            miNombre={datosRol.miNombre}
            miembros={datosRol.miembros}
            tamanoEquipo={sesion.tamanoEquipo}
            onAbandonar={abandonarSesion}
          />
        </Suspense>
      </>
    );
  }

  return (
    <>
      <BannerConexion onSesionTomada={abandonarSesion} />
      <Suspense fallback={cargando}>
        <ConsolaApp
          estadoInicial={sesion.estadoMotor}
          relojInicial={sesion.reloj}
          catalogoInicial={sesion.catalogo}
          solicitudes={sesion.solicitudes}
          comentariosClientes={sesion.comentariosClientes}
          codigoSala={sesion.codigoSala}
          nombreEquipo={sesion.nombreEquipo}
          miRol={datosRol?.miRol ?? null}
          miNombre={datosRol?.miNombre ?? null}
          miembros={datosRol?.miembros ?? []}
          tamanoEquipo={sesion.tamanoEquipo}
          onAbandonar={abandonarSesion}
        />
      </Suspense>
    </>
  );
}
