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
  const [animando, setAnimando] = useState<string | null>(null);

  const roles = rolesDisponibles(tamanoEquipo);
  const liderEsVoz = tamanoEquipo <= 3;

  useEffect(() => {
    function onRolesAsignados(data: { miembros: MiembroEquipo[] }) {
      setMiembros(data.miembros);
    }
    function onMiembroSentado(data: { nombre: string; rol: RolEquipo; miembros: MiembroEquipo[] }) {
      setMiembros(data.miembros);
      setAnimando(data.nombre);
      setTimeout(() => setAnimando(null), 1500);
    }
    socket.on('equipo:roles_asignados', onRolesAsignados);
    socket.on('equipo:miembro_sentado', onMiembroSentado);
    return () => {
      socket.off('equipo:roles_asignados', onRolesAsignados);
      socket.off('equipo:miembro_sentado', onMiembroSentado);
    };
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
      if (resp?.miembros) setMiembros(resp.miembros);
    });
  }

  function confirmarEquipo() {
    socket.emit('equipo:asignar_roles', { miembros }, (resp: any) => {
      if (resp?.error) { setError(resp.error); return; }
      onIniciar(resp.miembros, miRol as RolEquipo, miNombre.trim());
    });
  }

  const rolesReq = rolesDisponibles(tamanoEquipo);
  const faltantes = rolesReq.filter(r => !miembros.some(m => m.rol === r));
  const puedeIniciar = registrado && faltantes.length === 0;

  return (
    <div className="escena__mesa-redonda">
      <div className="escena__mesa-redonda-sala">
        <div className="escena__mesa-redonda-pared" />
        <div className="escena__mesa-redonda-circulo" />
        {[1, 2, 3, 4, 5].map(i => {
          const miembroEnSilla = miembros[i - 1];
          return (
            <div
              key={i}
              className={`escena__mesa-redonda-silla escena__mesa-redonda-silla--${i} ${miembroEnSilla ? 'escena__mesa-redonda-silla--ocupada' : ''} ${miembroEnSilla && animando === miembroEnSilla.nombre ? 'escena__mesa-redonda-silla--entrando' : ''}`}
            >
              {miembroEnSilla && (
                <span className="escena__silla-nombre">{miembroEnSilla.nombre.split(' ')[0]}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="escena__mesa-redonda-brief">
        <h2 className="escena__mesa-redonda-titulo">Asignacion de roles</h2>
        <div className="escena__mesa-redonda-equipo">{nombreEquipo}</div>

        {miembros.length > 0 && (
          <div className="roles__roster roles__roster--live">
            {miembros.map((m, i) => (
              <div key={i} className={`roles__roster-miembro ${animando === m.nombre ? 'roles__roster-miembro--nuevo' : ''}`}>
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
        )}

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
                        <span className="roles__opcion-nota">Tambien actua como Voz del cliente</span>
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

            {error && <p className="roles__error">{error}</p>}

            <button
              className="escena__boton escena__boton--iniciar"
              onClick={confirmarEquipo}
              disabled={!puedeIniciar}
            >
              {puedeIniciar ? 'Entrar al simulador' : 'Esperando al equipo...'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
