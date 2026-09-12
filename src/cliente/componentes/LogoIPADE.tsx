import logoBlanco from '../assets/marca/logo-ipade-blanco.svg';
import logoNavy from '../assets/marca/logo-ipade-navy.svg';

interface Props {
  variante?: 'blanco' | 'navy';
  alto?: number;
  enlace?: boolean;
  className?: string;
}

export function LogoIPADE({ variante = 'navy', alto = 28, enlace = false, className }: Props) {
  const src = variante === 'blanco' ? logoBlanco : logoNavy;

  const img = (
    <img
      src={src}
      alt="IPADE Business School"
      height={alto}
      style={{ width: 'auto', height: alto, display: 'block' }}
      className={className}
    />
  );

  if (enlace) {
    return <a href="/" style={{ display: 'inline-flex' }}>{img}</a>;
  }

  return img;
}
