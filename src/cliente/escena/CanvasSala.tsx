import { useRef, useEffect, useState, useCallback } from 'react';
import { CAMARA, PANORAMA_ANCHO, PANORAMA_ALTO } from './camara';
import manifiesto from '../assets/sprites/manifiesto.json';

const SPRITE_URLS = import.meta.glob('../assets/sprites/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function urlSprite(archivo: string): string {
  return SPRITE_URLS[`../assets/sprites/${archivo}`] ?? '';
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export interface SpriteEscena {
  clave: string;
  grados: number;
  nombre?: string;
  activo?: boolean;
}

interface Props {
  sprites: SpriteEscena[];
  anguloObjetivo?: number;
  rotacionHabilitada?: boolean;
}

interface Dimensiones {
  w: number;
  h: number;
  dpr: number;
}

interface EstadoCamara {
  angulo: number;
  velocidad: number;
  teclaIzq: boolean;
  teclaDer: boolean;
  arrastrando: boolean;
  arrastrarX: number;
  panObjetivo: number | null;
  ultimoFrame: number;
}

export function CanvasSala({
  sprites,
  anguloObjetivo,
  rotacionHabilitada = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<Dimensiones>({ w: 960, h: 540, dpr: 1 });
  const estadoRef = useRef<EstadoCamara>({
    angulo: anguloObjetivo ?? 0,
    velocidad: 0,
    teclaIzq: false,
    teclaDer: false,
    arrastrando: false,
    arrastrarX: 0,
    panObjetivo: null,
    ultimoFrame: 0,
  });
  const imagenesRef = useRef(new Map<string, HTMLImageElement>());
  const [cargado, setCargado] = useState(false);
  const reducidoRef = useRef(false);

  const halfArc = CAMARA.arcoGrados / 2;

  // prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducidoRef.current = mq.matches;
    const h = (e: MediaQueryListEvent) => { reducidoRef.current = e.matches; };
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  // Auto-pan when anguloObjetivo changes
  useEffect(() => {
    if (anguloObjetivo === undefined) return;
    const st = estadoRef.current;
    if (reducidoRef.current) {
      st.angulo = clamp(anguloObjetivo, -halfArc, halfArc);
      st.panObjetivo = null;
      st.velocidad = 0;
    } else {
      st.panObjetivo = clamp(anguloObjetivo, -halfArc, halfArc);
    }
  }, [anguloObjetivo, halfArc]);

  // Load images
  useEffect(() => {
    const cache = imagenesRef.current;
    const needed = new Set<string>();
    needed.add('panorama.png');

    for (const sp of sprites) {
      const entry = (manifiesto as Record<string, { archivo: string }>)[sp.clave];
      if (entry) needed.add(entry.archivo);
    }

    let montado = true;
    let pendientes = 0;

    for (const archivo of needed) {
      if (cache.has(archivo)) continue;
      pendientes++;
      const url = urlSprite(archivo);
      if (!url) { pendientes--; continue; }
      const img = new Image();
      img.src = url;
      img.onload = () => {
        if (!montado) return;
        cache.set(archivo, img);
        pendientes--;
        if (pendientes <= 0) setCargado(true);
      };
      img.onerror = () => {
        if (!montado) return;
        pendientes--;
        if (pendientes <= 0) setCargado(true);
      };
    }

    if (pendientes === 0) setCargado(true);
    return () => { montado = false; };
  }, [sprites]);

  // Resize observer
  useEffect(() => {
    const container = contenedorRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    function resize() {
      const w = container!.clientWidth;
      const h = container!.clientHeight;
      if (w === 0 || h === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      dimRef.current = { w, h, dpr };
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Keyboard
  useEffect(() => {
    if (!rotacionHabilitada) return;
    const st = estadoRef.current;

    function onDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        st.teclaIzq = true;
        st.panObjetivo = null;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        st.teclaDer = true;
        st.panObjetivo = null;
      }
    }
    function onUp(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') st.teclaIzq = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') st.teclaDer = false;
    }

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      st.teclaIzq = false;
      st.teclaDer = false;
    };
  }, [rotacionHabilitada]);

  // Mouse + touch drag
  useEffect(() => {
    if (!rotacionHabilitada) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const st = estadoRef.current;

    function startDrag(x: number) {
      st.arrastrando = true;
      st.arrastrarX = x;
      st.panObjetivo = null;
    }
    function moveDrag(x: number) {
      if (!st.arrastrando) return;
      const dx = x - st.arrastrarX;
      st.arrastrarX = x;
      const grados = -dx * (CAMARA.arcoGrados / (dimRef.current.w || 960));
      st.angulo = clamp(st.angulo + grados, -halfArc, halfArc);
    }
    function endDrag() { st.arrastrando = false; }

    function onMouseDown(e: MouseEvent) { startDrag(e.clientX); }
    function onMouseMove(e: MouseEvent) { moveDrag(e.clientX); }
    function onMouseUp() { endDrag(); }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 1) startDrag(e.touches[0].clientX);
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 1) {
        e.preventDefault();
        moveDrag(e.touches[0].clientX);
      }
    }
    function onTouchEnd() { endDrag(); }

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [rotacionHabilitada, halfArc]);

  // Render loop
  const spritesRef = useRef(sprites);
  spritesRef.current = sprites;

  useEffect(() => {
    if (!cargado) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;

    function frame(timestamp: number) {
      const st = estadoRef.current;
      const dt = st.ultimoFrame ? Math.min((timestamp - st.ultimoFrame) / 1000, 0.1) : 0;
      st.ultimoFrame = timestamp;

      // --- Physics ---
      const dir = (st.teclaDer ? 1 : 0) - (st.teclaIzq ? 1 : 0);

      if (dir !== 0) {
        st.velocidad += dir * CAMARA.aceleracionGrados * dt;
        st.velocidad = clamp(st.velocidad, -CAMARA.velocidadMaxGrados, CAMARA.velocidadMaxGrados);
      } else if (st.panObjetivo !== null) {
        const diff = st.panObjetivo - st.angulo;
        if (Math.abs(diff) < 0.5) {
          st.angulo = st.panObjetivo;
          st.panObjetivo = null;
          st.velocidad = 0;
        } else {
          st.velocidad = diff * 5;
          st.velocidad = clamp(st.velocidad, -CAMARA.velocidadMaxGrados, CAMARA.velocidadMaxGrados);
        }
      } else {
        if (Math.abs(st.velocidad) < 5) {
          st.velocidad = 0;
        } else {
          st.velocidad *= Math.max(0, 1 - 8 * dt);
        }
      }

      if (!st.arrastrando) {
        st.angulo = clamp(st.angulo + st.velocidad * dt, -halfArc, halfArc);
      }

      // --- Drawing ---
      const { w: W, h: H, dpr } = dimRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, W, H);

      const cache = imagenesRef.current;

      // Panorama
      const panoramaImg = cache.get('panorama.png');
      if (panoramaImg) {
        const srcH = PANORAMA_ALTO;
        const srcW = Math.min(PANORAMA_ANCHO, W * srcH / H);
        const centerFrac = (st.angulo + halfArc) / CAMARA.arcoGrados;
        const srcX = clamp(
          centerFrac * PANORAMA_ANCHO - srcW / 2,
          0,
          PANORAMA_ANCHO - srcW,
        );
        ctx.drawImage(panoramaImg, srcX, 0, srcW, srcH, 0, 0, W, H);
      }

      // Sprites
      const currentSprites = spritesRef.current;
      const srcW = Math.min(PANORAMA_ANCHO, W * PANORAMA_ALTO / H);
      const centerFrac = (st.angulo + halfArc) / CAMARA.arcoGrados;
      const srcX = clamp(
        centerFrac * PANORAMA_ANCHO - srcW / 2,
        0,
        PANORAMA_ANCHO - srcW,
      );

      for (const sp of currentSprites) {
        const entry = (manifiesto as Record<string, { archivo: string }>)[sp.clave];
        if (!entry) continue;
        const img = cache.get(entry.archivo);
        if (!img) continue;

        const spritePanoX = (sp.grados + halfArc) / CAMARA.arcoGrados * PANORAMA_ANCHO;
        if (spritePanoX < srcX - 100 || spritePanoX > srcX + srcW + 100) continue;

        const screenX = (spritePanoX - srcX) / srcW * W;
        const spriteH = CAMARA.spriteEscalaAlto * H;
        const spriteW = spriteH * (img.naturalWidth / img.naturalHeight);
        const screenY = CAMARA.spriteBaseY * H - spriteH;

        ctx.globalAlpha = sp.activo ? 1.0 : 0.45;
        ctx.drawImage(img, screenX - spriteW / 2, screenY, spriteW, spriteH);
        ctx.globalAlpha = 1.0;

        // Active glow
        if (sp.activo) {
          ctx.save();
          ctx.shadowColor = 'rgba(212, 175, 55, 0.6)';
          ctx.shadowBlur = 12;
          ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
          ctx.lineWidth = 2;
          ctx.strokeRect(
            screenX - spriteW / 2 - 2,
            screenY - 2,
            spriteW + 4,
            spriteH + 4,
          );
          ctx.restore();
        }

        // Name label
        if (sp.nombre) {
          const fontSize = Math.max(11, Math.round(H * 0.024));
          ctx.font = `bold ${fontSize}px 'Inter', sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = sp.activo ? '#d4af37' : 'rgba(255,255,255,0.7)';
          ctx.strokeStyle = 'rgba(0,0,0,0.7)';
          ctx.lineWidth = 3;
          const labelY = screenY - 6;
          ctx.strokeText(sp.nombre, screenX, labelY);
          ctx.fillText(sp.nombre, screenX, labelY);
        }
      }

      // Compass
      dibujarBrujula(ctx, W, H, st.angulo);

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [cargado, halfArc]);

  return (
    <div ref={contenedorRef} className="canvas-sala">
      <canvas ref={canvasRef} className="canvas-sala__lienzo" />
      {!cargado && (
        <div className="canvas-sala__cargando">
          <div className="escena__spinner" />
          <span>Cargando sala de juntas...</span>
        </div>
      )}
    </div>
  );
}

function dibujarBrujula(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  angulo: number,
) {
  const barH = CAMARA.brujulaAlto;
  const barW = W * 0.25;
  const barX = (W - barW) / 2;
  const barY = H - barH - 8;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  roundRect(ctx, barX, barY, barW, barH, 4);
  ctx.fill();

  const halfArc = CAMARA.arcoGrados / 2;
  const frac = (angulo + halfArc) / CAMARA.arcoGrados;
  const indicatorW = Math.max(6, barW * 0.05);
  const indicatorX = barX + frac * (barW - indicatorW);

  ctx.fillStyle = 'rgba(212, 175, 55, 0.8)';
  roundRect(ctx, indicatorX, barY + 2, indicatorW, barH - 4, 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  roundRect(ctx, barX, barY, barW, barH, 4);
  ctx.stroke();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
