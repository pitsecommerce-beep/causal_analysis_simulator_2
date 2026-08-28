import { useState } from 'react';
import { socket } from '../lib/socket';
import type { EstadoMotorCliente, EstadoReloj, IntervencionCatalogo, SolicitudCliente, ComentarioClientePublico, PropuestaIntervencion, SolicitudAccion } from '../lib/tipos';

interface Props {
  onUnido: (datos: {
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
  }) => void;
  onProfesor: (codigoSala: string, clave: string) => void;
  onProfesorUnirse: (codigoSala: string, clave: string) => void;
  onReconectar: (codigoSala: string, codigoPersonal: string) => void;
  errorReconexion?: string;
}

export function UnirseEquipo({ onUnido, onProfesor, onProfesorUnirse, onReconectar, errorReconexion }: Props) {
  const [modo, setModo] = useState<'equipo' | 'profesor'>('equipo');
  const [codigo, setCodigo] = useState('');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [codigoPersonal, setCodigoPersonal] = useState('');
  const [mostrarReconexion, setMostrarReconexion] = useState(false);
  const [error, setError] = useState(errorReconexion ?? '');
  const [cargando, setCargando] = useState(false);

  const handleUnirse = () => {
    if (!codigo.trim() || !email.trim()) {
      setError('Ingresa el código de sala y tu correo electrónico.');
      return;
    }
    if (!email.includes('@')) {
      setError('Ingresa un correo electrónico válido.');
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
        comentariosClientes: resp.comentariosClientes ?? [],
        codigoSala: codigo.toUpperCase(),
        nombreEquipo: resp.nombreEquipo,
        tamanoEquipo: resp.tamanoEquipo ?? 4,
        propuestas: resp.propuestas ?? [],
        solicitudesAccion: resp.solicitudesAccion ?? [],
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

  const handleReconectar = () => {
    if (!codigo.trim() || !codigoPersonal.trim()) {
      setError('Ingresa el código de sala y tu código personal.');
      return;
    }
    if (codigoPersonal.trim().length !== 6) {
      setError('El código personal debe tener 6 caracteres.');
      return;
    }
    setCargando(true);
    setError('');
    onReconectar(codigo.toUpperCase(), codigoPersonal.toUpperCase());
  };

  const handleUnirseSesion = () => {
    if (!codigo.trim() || !clave.trim()) {
      setError('Ingresa el código de sala y la clave de profesor.');
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
        <p className="unirse__subtitulo">Simulador de Análisis Causal</p>

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
              <label>Código de sala</label>
              <input
                className="mono"
                maxLength={10}
                value={codigo}
                onChange={e => setCodigo(e.target.value.toUpperCase())}
                placeholder="IPADE-1234"
                onKeyDown={e => e.key === 'Enter' && handleUnirse()}
              />
            </div>

            <div className="unirse__campo">
              <label>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu.correo@ejemplo.com"
                onKeyDown={e => e.key === 'Enter' && handleUnirse()}
              />
            </div>

            <button className="unirse__boton" onClick={handleUnirse} disabled={cargando}>
              {cargando ? 'Conectando...' : 'Unirse a la sesión'}
            </button>

            {!mostrarReconexion ? (
              <button
                className="unirse__link"
                onClick={() => { setMostrarReconexion(true); setError(''); }}
              >
                Tengo un código de reconexión
              </button>
            ) : (
              <>
                <div className="unirse__separador">
                  <span>Reconectar</span>
                </div>
                <div className="unirse__campo">
                  <label>Código personal (6 caracteres)</label>
                  <input
                    className="mono"
                    maxLength={6}
                    value={codigoPersonal}
                    onChange={e => setCodigoPersonal(e.target.value.toUpperCase())}
                    placeholder="XYZ789"
                    onKeyDown={e => e.key === 'Enter' && handleReconectar()}
                  />
                </div>
                <button className="unirse__boton unirse__boton--secundario" onClick={handleReconectar} disabled={cargando}>
                  {cargando ? 'Reconectando...' : 'Reconectar'}
                </button>
              </>
            )}
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
              {cargando ? 'Creando...' : 'Crear nueva sesión'}
            </button>

            <div className="unirse__separador">
              <span>o unirse a sesión existente</span>
            </div>

            <div className="unirse__campo">
              <label>Código de sala</label>
              <input
                className="mono"
                maxLength={10}
                value={codigo}
                onChange={e => setCodigo(e.target.value.toUpperCase())}
                placeholder="IPADE-1234"
                onKeyDown={e => e.key === 'Enter' && handleUnirseSesion()}
              />
            </div>

            <button className="unirse__boton unirse__boton--secundario" onClick={handleUnirseSesion} disabled={cargando}>
              {cargando ? 'Conectando...' : 'Unirse a sesión existente'}
            </button>
          </>
        )}

        {error && <p className="unirse__error">{error}</p>}
      </div>
    </div>
  );
}
