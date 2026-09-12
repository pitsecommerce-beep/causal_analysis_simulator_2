import { useState, useEffect, useCallback } from 'react';

interface EstadoDB {
  conectada: boolean;
  ultimoError: string | null;
  reconectando: boolean;
  intentos: number;
}

export function BannerDB() {
  const [estado, setEstado] = useState<EstadoDB | null>(null);
  const [reintentando, setReintentando] = useState(false);

  const consultar = useCallback(async () => {
    try {
      const resp = await fetch('/api/salud');
      if (!resp.ok) return;
      const data = await resp.json();
      setEstado(data.baseDatos);
    } catch {}
  }, []);

  useEffect(() => {
    consultar();
    const id = setInterval(consultar, 15000);
    return () => clearInterval(id);
  }, [consultar]);

  async function reintentar() {
    setReintentando(true);
    try {
      await fetch('/api/salud/reintentar', { method: 'POST' });
      await new Promise(r => setTimeout(r, 3000));
      await consultar();
    } finally {
      setReintentando(false);
    }
  }

  if (!estado || estado.conectada) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: 'var(--ipd-color-danger-600, #dc2626)',
      color: '#fff',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '14px',
      fontFamily: 'var(--ipd-font-sans, Inter, sans-serif)',
    }}>
      <span style={{ fontWeight: 600 }}>Sin conexion a la base de datos.</span>
      <span>Las cuentas y sesiones no se pueden guardar.</span>
      {estado.ultimoError && (
        <span style={{ opacity: 0.8, fontSize: '12px' }}>({estado.ultimoError})</span>
      )}
      <button
        onClick={reintentar}
        disabled={reintentando}
        style={{
          marginLeft: 'auto',
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.4)',
          color: '#fff',
          padding: '4px 12px',
          borderRadius: '4px',
          cursor: reintentando ? 'wait' : 'pointer',
          fontSize: '13px',
        }}
      >
        {reintentando ? 'Reintentando...' : 'Reintentar ahora'}
      </button>
    </div>
  );
}
