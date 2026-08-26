interface Props {
  nombreEquipo: string;
  onIniciar: () => void;
}

export function MesaRedonda({ nombreEquipo, onIniciar }: Props) {
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
        <h2 className="escena__mesa-redonda-titulo">Su equipo ha sido asignado</h2>
        <div className="escena__mesa-redonda-equipo">{nombreEquipo}</div>
        <p className="escena__mesa-redonda-instrucciones">
          Analicen los datos con rigor. Cada consulta tiene un costo.
          Identifiquen la causa raíz y propongan intervenciones concretas.
        </p>
        <button className="escena__boton escena__boton--iniciar" onClick={onIniciar}>
          Entrar al simulador
        </button>
      </div>
    </div>
  );
}
