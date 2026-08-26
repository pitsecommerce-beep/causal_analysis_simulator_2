import { useState } from 'react';
import { UnirseEquipo } from './componentes/UnirseEquipo';
import { ConsolaApp } from './consola/ConsolaApp';
import type { EstadoMotorCliente, EstadoReloj, IntervencionCatalogo, SolicitudCliente } from './lib/tipos';

interface DatosSesion {
  estadoMotor: EstadoMotorCliente;
  reloj: EstadoReloj;
  catalogo: IntervencionCatalogo[];
  solicitudes: SolicitudCliente[];
  codigoSala: string;
  nombreEquipo: string;
}

export function App() {
  const [sesion, setSesion] = useState<DatosSesion | null>(null);

  if (!sesion) {
    return <UnirseEquipo onUnido={setSesion} />;
  }

  return (
    <ConsolaApp
      estadoInicial={sesion.estadoMotor}
      relojInicial={sesion.reloj}
      catalogoInicial={sesion.catalogo}
      solicitudes={sesion.solicitudes}
      codigoSala={sesion.codigoSala}
      nombreEquipo={sesion.nombreEquipo}
    />
  );
}
