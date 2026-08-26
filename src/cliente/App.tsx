import { useState } from 'react';
import { UnirseEquipo } from './componentes/UnirseEquipo';
import { EscenaApp } from './escena/EscenaApp';
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

type Pantalla = 'unirse' | 'escena' | 'consola';

export function App() {
  const [sesion, setSesion] = useState<DatosSesion | null>(null);
  const [pantalla, setPantalla] = useState<Pantalla>('unirse');

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

  if (pantalla === 'escena') {
    return (
      <EscenaApp
        codigoSala={sesion.codigoSala}
        onTerminar={() => setPantalla('consola')}
      />
    );
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
