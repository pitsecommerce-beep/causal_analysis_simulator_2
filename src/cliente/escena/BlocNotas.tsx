import { useState, useEffect } from 'react';

const STORAGE_PREFIX = 'etfbank_notas_';

interface Props {
  codigoSala: string;
  nombreEquipo: string;
}

export function BlocNotas({ codigoSala, nombreEquipo }: Props) {
  const key = `${STORAGE_PREFIX}${codigoSala}_${nombreEquipo}`;
  const [texto, setTexto] = useState(() => {
    try { return localStorage.getItem(key) ?? ''; } catch { return ''; }
  });

  useEffect(() => {
    try { localStorage.setItem(key, texto); } catch { /* no-op */ }
  }, [key, texto]);

  return (
    <div className="bloc-notas">
      <h3 className="bloc-notas__titulo">Mis notas</h3>
      <textarea
        className="bloc-notas__area"
        value={texto}
        onChange={e => setTexto(e.target.value)}
        placeholder="Escribe tus observaciones mientras escuchas..."
        rows={6}
      />
    </div>
  );
}
