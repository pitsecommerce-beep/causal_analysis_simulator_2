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
  { left: '10%', bottom: '45%' },
  { left: '25%', bottom: '42%' },
  { left: '65%', bottom: '42%' },
  { left: '80%', bottom: '45%' },
];

export function SalaJuntas({ personajes, indiceActivo }: Props) {
  return (
    <div className="escena__sala">
      <div className="escena__pared" />
      <div className="escena__pantalla">ETF BANK</div>
      <div className="escena__mesa" />

      {personajes.map((p, i) => {
        const esDirector = p.rol === 'director';
        const pos = esDirector
          ? { left: '45%', bottom: '48%' }
          : POSICIONES_CLIENTES[(i - 1) % POSICIONES_CLIENTES.length];

        const claseActivo = i === indiceActivo ? ' escena__personaje--activo' : '';
        const claseCuerpo = esDirector
          ? 'escena__cuerpo escena__cuerpo--director'
          : p.genero === 'F'
            ? 'escena__cuerpo escena__cuerpo--clienteF'
            : 'escena__cuerpo escena__cuerpo--clienteM';

        return (
          <div
            key={i}
            className={`escena__personaje${claseActivo}`}
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
