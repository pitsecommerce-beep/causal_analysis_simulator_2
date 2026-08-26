import { useState } from 'react';
import { socket } from '../lib/socket';
import type { EstadoMotorCliente, EstadoReloj, IntervencionCatalogo, SolicitudCliente } from '../lib/tipos';

interface Props {
  onUnido: (datos: {
    estadoMotor: EstadoMotorCliente;
    reloj: EstadoReloj;
    catalogo: IntervencionCatalogo[];
    solicitudes: SolicitudCliente[];
    codigoSala: string;
    nombreEquipo: string;
  }) => void;
}

export function UnirseEquipo({ onUnido }: Props) {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleUnirse = () => {
    if (!codigo.trim() || !nombre.trim()) {
      setError('Ingresa el código de sala y el nombre del equipo.');
      return;
    }
    setCargando(true);
    setError('');

    if (!socket.connected) socket.connect();

    socket.emit('equipo:unirse', { codigoSala: codigo.toUpperCase(), nombre: nombre.trim() }, (resp: any) => {
      setCargando(false);
      if (resp?.error) {
        setError(resp.error);
        return;
      }
      onUnido({
        estadoMotor: resp.estadoMotor,
        reloj: resp.reloj,
        catalogo: resp.intervencionesCatalogo,
        solicitudes: resp.solicitudes ?? [],
        codigoSala: codigo.toUpperCase(),
        nombreEquipo: nombre.trim(),
      });
    });
  };

  return (
    <div className="unirse">
      <div className="unirse__tarjeta">
        <h1 className="unirse__titulo">ETF Bank</h1>
        <p className="unirse__subtitulo">Simulador de Analisis Causal</p>

        <div className="unirse__campo">
          <label>Codigo de sala</label>
          <input
            className="mono"
            maxLength={6}
            value={codigo}
            onChange={e => setCodigo(e.target.value.toUpperCase())}
            placeholder="ABC123"
            onKeyDown={e => e.key === 'Enter' && handleUnirse()}
          />
        </div>

        <div className="unirse__campo">
          <label>Nombre del equipo</label>
          <input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Equipo 1"
            onKeyDown={e => e.key === 'Enter' && handleUnirse()}
          />
        </div>

        <button className="unirse__boton" onClick={handleUnirse} disabled={cargando}>
          {cargando ? 'Conectando...' : 'Unirse a la sesion'}
        </button>

        {error && <p className="unirse__error">{error}</p>}
      </div>
    </div>
  );
}
