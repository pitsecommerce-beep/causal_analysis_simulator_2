interface Props {
  nombre: string;
  genero: string;
  estado: string;
  sucursal: number;
  indice: number;
  total: number;
}

export function VozCliente({ nombre, genero, estado, sucursal, indice, total }: Props) {
  const claseCuerpo = genero === 'F'
    ? 'escena__avatar-cuerpo escena__avatar-cuerpo--F'
    : 'escena__avatar-cuerpo escena__avatar-cuerpo--M';

  return (
    <div className="escena__voz">
      <div className="escena__voz-escenario">
        <div className="escena__avatar">
          <div className="escena__avatar-cabeza" />
          <div className={claseCuerpo} />
          <div className="escena__avatar-pulso" />
        </div>
      </div>

      <div className="escena__ficha">
        <div className="escena__ficha-nombre">{nombre}</div>
        <div className="escena__ficha-datos">
          <span className="escena__ficha-dato">
            <span className="escena__ficha-etiqueta">Sucursal</span>
            <span className="escena__ficha-valor">{sucursal}</span>
          </span>
          <span className="escena__ficha-dato">
            <span className="escena__ficha-etiqueta">Estado</span>
            <span className="escena__ficha-valor">{estado}</span>
          </span>
        </div>
        <div className="escena__ficha-contador">
          Cliente {indice + 1} de {total}
        </div>
      </div>
    </div>
  );
}
