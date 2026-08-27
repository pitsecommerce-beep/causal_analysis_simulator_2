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
    tamanoEquipo: number;
  }) => void;
  onProfesor: (codigoSala: string, clave: string) => void;
  onProfesorUnirse: (codigoSala: string, clave: string) => void;
}

export function UnirseEquipo({ onUnido, onProfesor, onProfesorUnirse }: Props) {
  const [modo, setModo] = useState<'equipo' | 'profesor'>('equipo');
  const [codigo, setCodigo] = useState('');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleUnirse = () => {
    if (!codigo.trim() || !email.trim()) {
      setError('Ingresa el codigo de sala y tu correo electronico.');
      return;
    }
    if (!email.includes('@')) {
      setError('Ingresa un correo electronico valido.');
      return;
    }
    setCargando(true);
    setError('');

    if (!socket.connected) socket.connect();

    socket.emit('equipo:unirse', { codigoSala: codigo.toUpperCase(), email: email.trim().toLowerCase() }, (resp: any) => {
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
        nombreEquipo: resp.nombreEquipo,
        tamanoEquipo: resp.tamanoEquipo ?? 4,
      });
    });
  };

  const handleCrearSesion = () => {
    if (!clave.trim()) {
      setError('Ingresa la clave de profesor.');
      return;
    }
    setCargando(true);
    setError('');
    onProfesor('', clave.trim());
  };

  const handleUnirseSesion = () => {
    if (!codigo.trim() || !clave.trim()) {
      setError('Ingresa el codigo de sala y la clave de profesor.');
      return;
    }
    setCargando(true);
    setError('');
    onProfesorUnirse(codigo.toUpperCase(), clave.trim());
  };

  return (
    <div className="unirse">
      <div className="unirse__tarjeta">
        <h1 className="unirse__titulo">ETF Bank</h1>
        <p className="unirse__subtitulo">Simulador de Analisis Causal</p>

        <div className="unirse__tabs">
          <button
            className={`unirse__tab ${modo === 'equipo' ? 'unirse__tab--activo' : ''}`}
            onClick={() => { setModo('equipo'); setError(''); }}
          >
            Equipo
          </button>
          <button
            className={`unirse__tab ${modo === 'profesor' ? 'unirse__tab--activo' : ''}`}
            onClick={() => { setModo('profesor'); setError(''); }}
          >
            Profesor
          </button>
        </div>

        {modo === 'equipo' ? (
          <>
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
              <label>Correo electronico</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu.correo@ejemplo.com"
                onKeyDown={e => e.key === 'Enter' && handleUnirse()}
              />
            </div>

            <button className="unirse__boton" onClick={handleUnirse} disabled={cargando}>
              {cargando ? 'Conectando...' : 'Unirse a la sesion'}
            </button>
          </>
        ) : (
          <>
            <div className="unirse__campo">
              <label>Clave de profesor</label>
              <input
                type="password"
                value={clave}
                onChange={e => setClave(e.target.value)}
                placeholder="Clave"
                onKeyDown={e => e.key === 'Enter' && handleCrearSesion()}
              />
            </div>

            <button className="unirse__boton" onClick={handleCrearSesion} disabled={cargando}>
              {cargando ? 'Creando...' : 'Crear nueva sesion'}
            </button>

            <div className="unirse__separador">
              <span>o unirse a sesion existente</span>
            </div>

            <div className="unirse__campo">
              <label>Codigo de sala</label>
              <input
                className="mono"
                maxLength={6}
                value={codigo}
                onChange={e => setCodigo(e.target.value.toUpperCase())}
                placeholder="ABC123"
                onKeyDown={e => e.key === 'Enter' && handleUnirseSesion()}
              />
            </div>

            <button className="unirse__boton unirse__boton--secundario" onClick={handleUnirseSesion} disabled={cargando}>
              {cargando ? 'Conectando...' : 'Unirse a sesion existente'}
            </button>
          </>
        )}

        {error && <p className="unirse__error">{error}</p>}
      </div>
    </div>
  );
}
