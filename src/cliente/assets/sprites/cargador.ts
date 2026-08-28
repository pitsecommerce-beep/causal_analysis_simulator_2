import manifiesto from './manifiesto.json';

const SPRITE_URLS = import.meta.glob('./*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export function urlSprite(archivo: string): string {
  return SPRITE_URLS[`./${archivo}`] ?? '';
}

export type ManifiestoEntry = { archivo: string; ancho: number; alto: number; anclaX: number; anclaY: number; categoria: string };

export const spriteManifiesto = manifiesto as Record<string, ManifiestoEntry>;
