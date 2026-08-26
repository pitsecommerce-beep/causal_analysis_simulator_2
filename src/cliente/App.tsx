import { useState, lazy, Suspense } from 'react';
import { UnirseEquipo } from './componentes/UnirseEquipo';
import type { EstadoMotorCliente, EstadoReloj, IntervencionCatalogo, SolicitudCliente, RolEquipo, MiembroEquipo } from './lib/tipos';

const EscenaApp = lazy(() => import('./escena/EscenaApp').then(m => ({ default: m.EscenaApp })));
const ConsolaApp = lazy(() => import('./consola/ConsolaApp').then(m => ({ default: m.ConsolaApp })));

interface DatosSesion {
  estadoMotor: EstadoMotorCliente;
  reloj: EstadoReloj;
  catalogo: IntervencionCatalogo[];
  solicitudes: SolicitudCliente[];
  codigoSala: string;
  nombreEquipo: string;
  tamanoEquipo: number;
}

interface DatosRol {
  miembros: MiembroEquipo[];
  miRol: RolEquipo;
  miNombre: string;
}

type Pantalla = 'unirse' | 'escena' | 'consola';

export function App() {
  const [sesion, setSesion] = useState<DatosSesion | null>(null);
  const [pantalla, setPantalla] = useState<Pantalla>('unirse');
  const [datosRol, setDatosRol] = useState<DatosRol | null>(null);

  function onUnido(datos: DatosSesion) {
    setSesion(datos);
    const faseActual = datos.reloj.fase;
    if (faseActual === 'sala_juntas' || faseActual === 'voz_cliente' || faseActual === 'espera') {
      setPantalla('escena');
    } else {
      setPantalla('consola');
    }
  }

  if (pantalla === 'unirse' || !sesion) {
    return <UnirseEquipo onUnido={onUnido} />;
  }

  const cargando = (
    <div className="escena">
      <div className="escena__cargando">
        <div className="escena__spinner" />
        <span>Cargando...</span>
      </div>
    </div>
  );

  if (pantalla === 'escena') {
    return (
      <Suspense fallback={cargando}>
        <EscenaApp
          codigoSala={sesion.codigoSala}
          nombreEquipo={sesion.nombreEquipo}
          tamanoEquipo={sesion.tamanoEquipo}
          onTerminar={(miembros, miRol, miNombre) => {
            setDatosRol({ miembros, miRol, miNombre });
            setPantalla('consola');
          }}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={cargando}>
      <ConsolaApp
        estadoInicial={sesion.estadoMotor}
        relojInicial={sesion.reloj}
        catalogoInicial={sesion.catalogo}
        solicitudes={sesion.solicitudes}
        codigoSala={sesion.codigoSala}
        nombreEquipo={sesion.nombreEquipo}
        miRol={datosRol?.miRol ?? null}
        miNombre={datosRol?.miNombre ?? null}
        miembros={datosRol?.miembros ?? []}
        tamanoEquipo={sesion.tamanoEquipo}
      />
    </Suspense>
  );
}
