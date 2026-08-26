interface Personaje {
  nombre: string;
  genero: string;
  rol: 'director' | 'cliente';
  activo: boolean;
}

interface Props {
  personajes: Personaje[];
  indiceActivo: number;
}

const POSICIONES_CLIENTES = [
  { left: '12%', bottom: '45%' },
  { left: '27%', bottom: '42%' },
  { left: '63%', bottom: '42%' },
  { left: '78%', bottom: '45%' },
];

export function SalaJuntas({ personajes, indiceActivo }: Props) {
  return (
    <div className="escena__sala">
      <div className="escena__pared" />
      <div className="escena__ventanales">
        <div className="escena__ventanal" />
        <div className="escena__ventanal" />
        <div className="escena__ventanal" />
      </div>
      <div className="escena__pantalla">
        <span className="escena__pantalla-logo">ETF BANK</span>
        <span className="escena__pantalla-sub">CRASS — Sala de juntas</span>
      </div>
      <div className="escena__mesa" />

      {personajes.map((p, i) => {
        const esDirector = p.rol === 'director';
        const pos = esDirector
          ? { left: '46%', bottom: '50%' }
          : POSICIONES_CLIENTES[(i - 1) % POSICIONES_CLIENTES.length];

        const clases = [
          'escena__personaje',
          i === indiceActivo ? 'escena__personaje--activo' : '',
          esDirector ? 'escena__personaje--director' : '',
        ].filter(Boolean).join(' ');

        const claseCuerpo = esDirector
          ? 'escena__cuerpo escena__cuerpo--director'
          : p.genero === 'F'
            ? 'escena__cuerpo escena__cuerpo--clienteF'
            : 'escena__cuerpo escena__cuerpo--clienteM';

        return (
          <div
            key={i}
            className={clases}
            style={{ left: pos.left, bottom: pos.bottom }}
          >
            <div className="escena__cabeza" />
            <div className={claseCuerpo} />
            <span className="escena__nombre-personaje">{p.nombre}</span>
          </div>
        );
      })}
    </div>
  );
}
