export function media(valores: number[]): number {
  if (valores.length === 0) return 0;
  return valores.reduce((s, v) => s + v, 0) / valores.length;
}

export function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const sorted = [...valores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function desviacion(valores: number[]): number {
  if (valores.length < 2) return 0;
  const m = media(valores);
  const sumSq = valores.reduce((s, v) => s + (v - m) ** 2, 0);
  return Math.sqrt(sumSq / (valores.length - 1));
}

export function correlacionPearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const mx = media(xs.slice(0, n));
  const my = media(ys.slice(0, n));

  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }

  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}
