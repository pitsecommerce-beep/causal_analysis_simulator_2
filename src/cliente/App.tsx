import { useState, useEffect, lazy, Suspense } from 'react';
import { UnirseEquipo } from './componentes/UnirseEquipo';
import { BannerConexion } from './componentes/BannerConexion';
import type { EstadoMotorCliente, EstadoReloj, IntervencionCatalogo, SolicitudCliente, ComentarioClientePublico, RolEquipo, MiembroEquipo, PropuestaIntervencion, SolicitudAccion } from './lib/tipos';
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
const AdminApp = lazy(() => import('./admin/AdminApp').then(m => ({ default: m.AdminApp })));
const ProyeccionApp = lazy(() => import('./proyeccion/ProyeccionApp').then(m => ({ default: m.ProyeccionApp })));

interface DatosSesion {
  estadoMotor: EstadoMotorCliente;
  reloj: EstadoReloj;
  catalogo: IntervencionCatalogo[];
  solicitudes: SolicitudCliente[];
  comentariosClientes: ComentarioClientePublico[];
  codigoSala: string;
  nombreEquipo: string;
  tamanoEquipo: number;
  propuestas: PropuestaIntervencion[];
  solicitudesAccion: SolicitudAccion[];
}

interface DatosRol {
  miembros: MiembroEquipo[];
  miRol: RolEquipo;
  miNombre: string;
  codigoPersonal?: string;
}

type Pantalla = 'cargando' | 'unirse' | 'reconectando' | 'escena' | 'juego' | 'consola' | 'profesor' | 'admin' | 'proyeccion';

export function App() {
  const [sesion, setSesion] = useState<DatosSesion | null>(null);
  const [pantalla, setPantalla] = useState<Pantalla>('cargando');
  const [datosRol, setDatosRol] = useState<DatosRol | null>(null);
  const [profesorCodigoSala, setProfesorCodigoSala] = useState<string | null>(null);
  const [errorReconexion, setErrorReconexion] = useState('');

  useEffect(() => {
    const path = window.location.pathname;

    if (path === '/proyeccion') {
      const params = new URLSearchParams(window.location.search);
      const sala = params.get('sala');
      fetch('/api/auth/yo')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.tipo === 'superadmin' || data?.tipo === 'profesor') {
            if (sala) setProfesorCodigoSala(sala);
            socket.connect();
            setPantalla('proyeccion');
          } else {
            setPantalla('unirse');
          }
        })
        .catch(() => setPantalla('unirse'));
      return;
    }

    if (path === '/admin') {
      fetch('/api/auth/yo')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.tipo === 'superadmin') {
            setPantalla('admin');
          } else {
            setPantalla('unirse');
          }
        })
        .catch(() => setPantalla('unirse'));
      return;
    }

    fetch('/api/auth/yo')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.tipo === 'superadmin') {
          setPantalla('admin');
        } else if (data?.tipo === 'profesor') {
          setPantalla('profesor');
        } else {
          const sesionGuardada = leerSesion();
          setPantalla(sesionGuardada ? 'reconectando' : 'unirse');
        }
      })
      .catch(() => {
        const sesionGuardada = leerSesion();
        setPantalla(sesionGuardada ? 'reconectando' : 'unirse');
      });
  }, []);

  useEffect(() => {
    const sesionGuardada = leerSesion();
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
        propuestas: resp.propuestas ?? [],
        solicitudesAccion: resp.solicitudesAccion ?? [],
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
  }, [pantalla]);

  function abandonarSesion() {
    borrarSesion();
    socket.disconnect();
    setSesion(null);
    setDatosRol(null);
    setPantalla('unirse');
  }

  async function cerrarSesionAuth() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setPantalla('unirse');
  }

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
        propuestas: resp.propuestas ?? [],
        solicitudesAccion: resp.solicitudesAccion ?? [],
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

  function onProfesorAuth() {
    socket.connect();
    socket.emit('profesor:crear_sesion', {}, (resp: any) => {
      if (resp?.error) {
        alert(resp.error);
        return;
      }
      setProfesorCodigoSala(resp.codigoSala);
      setPantalla('profesor');
    });
  }

  function onAdminAuth() {
    setPantalla('admin');
  }

  const cargando = (
    <div className="escena">
      <div className="escena__cargando">
        <div className="escena__spinner" />
        <span>Cargando...</span>
      </div>
    </div>
  );

  if (pantalla === 'cargando') {
    return cargando;
  }

  if (pantalla === 'admin') {
    return (
      <Suspense fallback={cargando}>
        <AdminApp onCerrarSesion={cerrarSesionAuth} />
      </Suspense>
    );
  }

  if (pantalla === 'proyeccion' && profesorCodigoSala) {
    return (
      <Suspense fallback={cargando}>
        <ProyeccionApp codigoSala={profesorCodigoSala} onCerrarSesion={cerrarSesionAuth} />
      </Suspense>
    );
  }

  if (pantalla === 'proyeccion') {
    socket.connect();
    socket.emit('profesor:crear_sesion', {}, (resp: any) => {
      if (resp?.error) return;
      setProfesorCodigoSala(resp.codigoSala);
    });
    return cargando;
  }

  if (pantalla === 'profesor' && profesorCodigoSala) {
    return (
      <Suspense fallback={cargando}>
        <ProfesorApp codigoSala={profesorCodigoSala} onCerrarSesion={cerrarSesionAuth} />
      </Suspense>
    );
  }

  if (pantalla === 'profesor') {
    socket.connect();
    socket.emit('profesor:crear_sesion', {}, (resp: any) => {
      if (resp?.error) return;
      setProfesorCodigoSala(resp.codigoSala);
    });
    return cargando;
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
        onProfesor={onProfesorAuth}
        onAdmin={onAdminAuth}
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
          propuestasIniciales={sesion.propuestas}
          solicitudesAccionIniciales={sesion.solicitudesAccion}
        />
      </Suspense>
    </>
  );
}
