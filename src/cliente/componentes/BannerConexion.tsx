import { useState, useEffect } from 'react';
import { socket } from '../lib/socket';

export function BannerConexion({ onSesionTomada }: { onSesionTomada?: () => void }) {
  const [estado, setEstado] = useState<'conectado' | 'reconectando' | 'tomada'>('conectado');
  const [intentos, setIntentos] = useState(0);

  useEffect(() => {
    function onDisconnect() {
      setEstado('reconectando');
      setIntentos(0);
    }
    function onConnect() {
      setEstado('conectado');
      setIntentos(0);
    }
    function onReconnectAttempt(n: number) {
      setIntentos(n);
    }
    function onSesionTomadaEvt() {
      setEstado('tomada');
      socket.disconnect();
      onSesionTomada?.();
    }

    socket.on('disconnect', onDisconnect);
    socket.on('connect', onConnect);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.on('sesion:tomada', onSesionTomadaEvt);

    return () => {
      socket.off('disconnect', onDisconnect);
      socket.off('connect', onConnect);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.off('sesion:tomada', onSesionTomadaEvt);
    };
  }, [onSesionTomada]);

  if (estado === 'conectado') return null;

  if (estado === 'tomada') {
    return (
      <div className="banner-conexion banner-conexion--tomada">
        <span>Tu sesion fue abierta en otro dispositivo.</span>
        <button
          className="banner-conexion__btn"
          onClick={() => window.location.reload()}
        >
          Volver a entrar
        </button>
      </div>
    );
  }

  return (
    <div className="banner-conexion banner-conexion--reconectando">
      <div className="banner-conexion__spinner" />
      <span>Conexion perdida. Reconectando{intentos > 1 ? ` (intento ${intentos})` : ''}...</span>
    </div>
  );
}
