import { useState, useEffect, useCallback } from 'react';
import { socket } from '../lib/socket';
import type { RolEquipo, MiembroEquipo } from '../lib/tipos';
import { NOMBRES_ROLES, DESC_ROLES } from '../lib/tipos';

interface Props {
  nombreEquipo: string;
  tamanoEquipo: number;
  onIniciar: (miembros: MiembroEquipo[], miRol: RolEquipo, miNombre: string) => void;
}

const TODOS_ROLES: RolEquipo[] = ['patrocinador', 'lider', 'analista', 'voz_cliente'];

function rolesDisponibles(tamano: number): RolEquipo[] {
  if (tamano <= 3) return ['patrocinador', 'lider', 'analista'];
  return TODOS_ROLES;
}

function maxPorRol(rol: RolEquipo, tamano: number): number {
  if (rol === 'analista' && tamano >= 5) return 2;
  return 1;
}

export function MesaRedonda({ nombreEquipo, tamanoEquipo, onIniciar }: Props) {
  const [miNombre, setMiNombre] = useState('');
  const [miRol, setMiRol] = useState<RolEquipo | ''>('');
  const [miembros, setMiembros] = useState<MiembroEquipo[]>([]);
  const [error, setError] = useState('');
  const [registrado, setRegistrado] = useState(false);

  const roles = rolesDisponibles(tamanoEquipo);
  const liderEsVoz = tamanoEquipo <= 3;

  useEffect(() => {
    function onRolesAsignados(data: { miembros: MiembroEquipo[] }) {
      setMiembros(data.miembros);
    }
    socket.on('equipo:roles_asignados', onRolesAsignados);
    return () => { socket.off('equipo:roles_asignados', onRolesAsignados); };
  }, []);

  const rolOcupado = useCallback((rol: RolEquipo): boolean => {
    const conteo = miembros.filter(m => m.rol === rol).length;
    return conteo >= maxPorRol(rol, tamanoEquipo);
  }, [miembros, tamanoEquipo]);

  function registrarRol() {
    if (!miNombre.trim()) { setError('Escribe tu nombre.'); return; }
    if (!miRol) { setError('Elige un rol.'); return; }
    setError('');

    socket.emit('equipo:elegir_rol', { participante: miNombre.trim(), rol: miRol }, (resp: any) => {
      if (resp?.error) { setError(resp.error); return; }
      setRegistrado(true);
    });
  }

  function confirmarEquipo() {
    const nuevos = [...miembros];
    if (registrado && miRol) {
      const yaExiste = nuevos.some(m => m.nombre === miNombre.trim());
      if (!yaExiste) {
        nuevos.push({ nombre: miNombre.trim(), rol: miRol });
      }
    }

    socket.emit('equipo:asignar_roles', { miembros: nuevos }, (resp: any) => {
      if (resp?.error) { setError(resp.error); return; }
      onIniciar(resp.miembros, miRol as RolEquipo, miNombre.trim());
    });
  }

  const rolesReq = rolesDisponibles(tamanoEquipo);
  const miembrosActuales = registrado && miRol
    ? [...miembros, ...(miembros.some(m => m.nombre === miNombre.trim()) ? [] : [{ nombre: miNombre.trim(), rol: miRol }])]
    : miembros;
  const faltantes = rolesReq.filter(r => !miembrosActuales.some(m => m.rol === r));
  const puedeIniciar = registrado && faltantes.length === 0;

  return (
    <div className="escena__mesa-redonda">
      <div className="escena__mesa-redonda-sala">
        <div className="escena__mesa-redonda-pared" />
        <div className="escena__mesa-redonda-circulo" />
        <div className="escena__mesa-redonda-silla escena__mesa-redonda-silla--1" />
        <div className="escena__mesa-redonda-silla escena__mesa-redonda-silla--2" />
        <div className="escena__mesa-redonda-silla escena__mesa-redonda-silla--3" />
        <div className="escena__mesa-redonda-silla escena__mesa-redonda-silla--4" />
        <div className="escena__mesa-redonda-silla escena__mesa-redonda-silla--5" />
      </div>

      <div className="escena__mesa-redonda-brief">
        <h2 className="escena__mesa-redonda-titulo">Asignación de roles</h2>
        <div className="escena__mesa-redonda-equipo">{nombreEquipo}</div>

        {!registrado ? (
          <div className="roles__formulario">
            <div className="roles__campo">
              <label>Tu nombre</label>
              <input
                value={miNombre}
                onChange={e => setMiNombre(e.target.value)}
                placeholder="Nombre del participante"
                maxLength={50}
              />
            </div>

            <div className="roles__campo">
              <label>Tu rol</label>
              <div className="roles__opciones">
                {roles.map(rol => {
                  const ocupado = rolOcupado(rol);
                  return (
                    <button
                      key={rol}
                      className={`roles__opcion ${miRol === rol ? 'roles__opcion--activa' : ''} ${ocupado ? 'roles__opcion--ocupada' : ''}`}
                      onClick={() => !ocupado && setMiRol(rol)}
                      disabled={ocupado}
                    >
                      <span className="roles__opcion-nombre">{NOMBRES_ROLES[rol]}</span>
                      <span className="roles__opcion-desc">{DESC_ROLES[rol]}</span>
                      {liderEsVoz && rol === 'lider' && (
                        <span className="roles__opcion-nota">También actúa como Voz del cliente</span>
                      )}
                      {ocupado && <span className="roles__opcion-badge">Ocupado</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="roles__error">{error}</p>}

            <button className="escena__boton escena__boton--iniciar" onClick={registrarRol}>
              Confirmar mi rol
            </button>
          </div>
        ) : (
          <div className="roles__resumen">
            <p className="roles__confirmado">
              {miNombre} — {miRol ? NOMBRES_ROLES[miRol] : ''}
            </p>

            <div className="roles__roster">
              <h3>Equipo</h3>
              {miembrosActuales.map((m, i) => (
                <div key={i} className="roles__roster-miembro">
                  <span className="roles__roster-nombre">{m.nombre}</span>
                  <span className="roles__roster-rol">{NOMBRES_ROLES[m.rol]}</span>
                </div>
              ))}
              {faltantes.length > 0 && (
                <div className="roles__faltantes">
                  Esperando: {faltantes.map(r => NOMBRES_ROLES[r]).join(', ')}
                </div>
              )}
            </div>

            {error && <p className="roles__error">{error}</p>}

            <button
              className="escena__boton escena__boton--iniciar"
              onClick={confirmarEquipo}
              disabled={!puedeIniciar}
            >
              {puedeIniciar ? 'Entrar al simulador' : 'Esperando roles...'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
