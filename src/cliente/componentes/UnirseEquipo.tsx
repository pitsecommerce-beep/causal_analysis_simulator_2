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
    email?: string;
  }) => void;
  onProfesor: () => void;
  onAdmin: () => void;
  onReconectar: (codigoSala: string, email: string) => void;
  errorReconexion?: string;
}

export function UnirseEquipo({ onUnido, onProfesor, onAdmin, onReconectar, errorReconexion }: Props) {
  const [modo, setModo] = useState<'equipo' | 'profesor' | 'admin'>('equipo');
  const [codigo, setCodigo] = useState('');
  const [email, setEmail] = useState('');
  const [emailProf, setEmailProf] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [claveAdmin, setClaveAdmin] = useState('');
  const [mostrarReconexion, setMostrarReconexion] = useState(false);
  const [error, setError] = useState(errorReconexion ?? '');
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
        comentariosClientes: resp.comentariosClientes ?? [],
        codigoSala: codigo.toUpperCase(),
        nombreEquipo: resp.nombreEquipo,
        tamanoEquipo: resp.tamanoEquipo ?? 4,
        propuestas: resp.propuestas ?? [],
        solicitudesAccion: resp.solicitudesAccion ?? [],
        email: email.trim().toLowerCase(),
      });
    });
  };

  const handleLoginProfesor = async () => {
    if (!emailProf.trim() || !contrasena.trim()) {
      setError('Ingresa tu correo y contrasena.');
      return;
    }
    setCargando(true);
    setError('');
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: emailProf.trim(), contrasena: contrasena }),
      });
      const data = await resp.json();
      setCargando(false);
      if (!resp.ok) {
        setError(data.error || 'Error al iniciar sesion');
        return;
      }
      onProfesor();
    } catch {
      setCargando(false);
      setError('Error de conexion');
    }
  };

  const handleLoginAdmin = async () => {
    if (!claveAdmin.trim()) {
      setError('Ingresa la clave de superadmin.');
      return;
    }
    setCargando(true);
    setError('');
    try {
      const resp = await fetch('/api/auth/superadmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave: claveAdmin.trim() }),
      });
      const data = await resp.json();
      setCargando(false);
      if (!resp.ok) {
        setError(data.error || 'Clave incorrecta');
        return;
      }
      onAdmin();
    } catch {
      setCargando(false);
      setError('Error de conexion');
    }
  };

  const handleReconectar = () => {
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
    onReconectar(codigo.toUpperCase(), email.trim().toLowerCase());
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
          <button
            className={`unirse__tab ${modo === 'admin' ? 'unirse__tab--activo' : ''}`}
            onClick={() => { setModo('admin'); setError(''); }}
          >
            Admin
          </button>
        </div>

        {modo === 'equipo' && (
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

            {!mostrarReconexion ? (
              <button
                className="unirse__link"
                onClick={() => { setMostrarReconexion(true); setError(''); }}
              >
                Ya estuve en esta sesion
              </button>
            ) : (
              <>
                <div className="unirse__separador">
                  <span>Reconectar</span>
                </div>
                <p className="unirse__ayuda">
                  Usa el mismo correo con el que te registraste para regresar a tu equipo.
                </p>
                <button className="unirse__boton unirse__boton--secundario" onClick={handleReconectar} disabled={cargando}>
                  {cargando ? 'Reconectando...' : 'Regresar a mi equipo'}
                </button>
              </>
            )}
          </>
        )}

        {modo === 'profesor' && (
          <>
            <div className="unirse__campo">
              <label>Correo electronico</label>
              <input
                type="email"
                value={emailProf}
                onChange={e => setEmailProf(e.target.value)}
                placeholder="profesor@ipade.mx"
                onKeyDown={e => e.key === 'Enter' && handleLoginProfesor()}
              />
            </div>

            <div className="unirse__campo">
              <label>Contrasena</label>
              <input
                type="password"
                value={contrasena}
                onChange={e => setContrasena(e.target.value)}
                placeholder="Contrasena"
                onKeyDown={e => e.key === 'Enter' && handleLoginProfesor()}
              />
            </div>

            <button className="unirse__boton" onClick={handleLoginProfesor} disabled={cargando}>
              {cargando ? 'Iniciando sesion...' : 'Iniciar sesion'}
            </button>
          </>
        )}

        {modo === 'admin' && (
          <>
            <div className="unirse__campo">
              <label>Clave de superadmin</label>
              <input
                type="password"
                value={claveAdmin}
                onChange={e => setClaveAdmin(e.target.value)}
                placeholder="Clave"
                onKeyDown={e => e.key === 'Enter' && handleLoginAdmin()}
              />
            </div>

            <button className="unirse__boton" onClick={handleLoginAdmin} disabled={cargando}>
              {cargando ? 'Verificando...' : 'Entrar como admin'}
            </button>
          </>
        )}

        {error && <p className="unirse__error">{error}</p>}
      </div>
    </div>
  );
}
