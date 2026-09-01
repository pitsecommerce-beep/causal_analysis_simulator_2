import { useState, useEffect, useCallback } from 'react';

interface Props {
  onCerrarSesion: () => void;
}

interface Profesor {
  id: number;
  correo: string;
  nombre: string;
  activo: boolean;
  debe_cambiar_contrasena: boolean;
  creado_en: string;
  ultimo_acceso: string | null;
}

export function AdminApp({ onCerrarSesion }: Props) {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [creando, setCreando] = useState(false);

  const cargarProfesores = useCallback(async () => {
    try {
      const resp = await fetch('/api/admin/profesores');
      if (!resp.ok) throw new Error('Error al cargar profesores');
      const data = await resp.json();
      setProfesores(data);
    } catch {
      setError('No se pudieron cargar los profesores');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarProfesores();
  }, [cargarProfesores]);

  async function crearProfesor() {
    if (!nuevoCorreo.trim() || !nuevoNombre.trim() || !nuevaContrasena.trim()) {
      setError('Completa todos los campos');
      return;
    }
    if (!nuevoCorreo.includes('@')) {
      setError('Correo invalido');
      return;
    }
    if (nuevaContrasena.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres');
      return;
    }

    setCreando(true);
    setError('');
    try {
      const resp = await fetch('/api/admin/profesores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correo: nuevoCorreo.trim().toLowerCase(),
          nombre: nuevoNombre.trim(),
          contrasena: nuevaContrasena,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Error al crear profesor');
        return;
      }
      setMensaje(`Profesor ${data.nombre} creado`);
      setNuevoCorreo('');
      setNuevoNombre('');
      setNuevaContrasena('');
      setTimeout(() => setMensaje(''), 3000);
      cargarProfesores();
    } catch {
      setError('Error de conexion');
    } finally {
      setCreando(false);
    }
  }

  async function toggleActivo(prof: Profesor) {
    try {
      const resp = await fetch(`/api/admin/profesores/${prof.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !prof.activo }),
      });
      if (!resp.ok) {
        const data = await resp.json();
        setError(data.error || 'Error al actualizar');
        return;
      }
      cargarProfesores();
    } catch {
      setError('Error de conexion');
    }
  }

  if (cargando) {
    return (
      <div className="admin">
        <div className="admin__cargando">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="admin">
      <header className="admin__header">
        <h1>Panel de Administracion</h1>
        <button className="admin__btn admin__btn--cerrar" onClick={onCerrarSesion}>
          Cerrar sesion
        </button>
      </header>

      {mensaje && <div className="admin__mensaje">{mensaje}</div>}
      {error && <div className="admin__error">{error}</div>}

      <section className="admin__seccion">
        <h2>Crear profesor</h2>
        <div className="admin__form">
          <input
            type="text"
            placeholder="Nombre completo"
            value={nuevoNombre}
            onChange={e => setNuevoNombre(e.target.value)}
          />
          <input
            type="email"
            placeholder="correo@ejemplo.com"
            value={nuevoCorreo}
            onChange={e => setNuevoCorreo(e.target.value)}
          />
          <input
            type="password"
            placeholder="Contrasena (min. 8 caracteres)"
            value={nuevaContrasena}
            onChange={e => setNuevaContrasena(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && crearProfesor()}
          />
          <button
            className="admin__btn"
            onClick={crearProfesor}
            disabled={creando}
          >
            {creando ? 'Creando...' : 'Crear profesor'}
          </button>
        </div>
      </section>

      <section className="admin__seccion">
        <h2>Profesores ({profesores.length})</h2>
        {profesores.length === 0 ? (
          <p className="admin__vacio">No hay profesores registrados</p>
        ) : (
          <table className="admin__tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Estado</th>
                <th>Ultimo acceso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profesores.map(prof => (
                <tr key={prof.id} className={prof.activo ? '' : 'admin__fila--inactivo'}>
                  <td>{prof.nombre}</td>
                  <td>{prof.correo}</td>
                  <td>{prof.activo ? 'Activo' : 'Inactivo'}</td>
                  <td>
                    {prof.ultimo_acceso
                      ? new Date(prof.ultimo_acceso).toLocaleDateString('es-MX', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : 'Nunca'}
                  </td>
                  <td>
                    <button
                      className={`admin__btn admin__btn--${prof.activo ? 'desactivar' : 'activar'}`}
                      onClick={() => toggleActivo(prof)}
                    >
                      {prof.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
