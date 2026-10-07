import type React from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { H, PAL, SCALE, W } from "./pixel";

export type Assets = { card: HTMLImageElement; logo: HTMLImageElement };
export type DrawFn = (ctx: CanvasRenderingContext2D, frame: number, assets: Assets) => void;

let assetsPromise: Promise<Assets> | null = null;
const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
const loadAssets = () => {
  if (!assetsPromise) {
    assetsPromise = Promise.all([loadImg(staticFile("motion/tarjeta.png")), loadImg(staticFile("motion/logo-mark.png"))]).then(([card, logo]) => ({ card, logo }));
  }
  return assetsPromise;
};

// La foto de la tarjeta reducida a pocos píxeles y a la paleta del juego.
const pixelCache = new Map<string, HTMLCanvasElement>();
const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const pixelate = (img: HTMLImageElement, w: number, h: number, palette: string[]) => {
  const key = `${img.src}-${w}x${h}-${palette.join("")}`;
  const cached = pixelCache.get(key);
  if (cached) return cached;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const cols = palette.map((k) => hex(PAL[k]));
  for (let i = 0; i < data.data.length; i += 4) {
    if (data.data[i + 3] < 100) {
      data.data[i + 3] = 0;
      continue;
    }
    let best = 0;
    let bestD = Infinity;
    cols.forEach((col, j) => {
      const d = (col[0] - data.data[i]) ** 2 * 0.3 + (col[1] - data.data[i + 1]) ** 2 * 0.59 + (col[2] - data.data[i + 2]) ** 2 * 0.11;
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    });
    [data.data[i], data.data[i + 1], data.data[i + 2]] = cols[best];
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  pixelCache.set(key, c);
  return c;
};

// Lienzo de 180×320 dibujado en cada fotograma y ampliado ×6 sin suavizado.
export const PixelScene: React.FC<{ draw: DrawFn }> = ({ draw }) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const [assets, setAssets] = useState<Assets | null>(null);
  const [handle] = useState(() => delayRender("Cargando imágenes del juego"));
  const done = useRef(false);

  useEffect(() => {
    loadAssets().then(setAssets);
  }, []);

  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx || !assets) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    draw(ctx, frame, assets);
    if (!done.current) {
      done.current = true;
      continueRender(handle);
    }
  }, [frame, assets, draw, handle]);

  return (
    <AbsoluteFill style={{ backgroundColor: PAL.k }}>
      <canvas ref={ref} width={W} height={H} style={{ width: W * SCALE, height: H * SCALE, imageRendering: "pixelated" }} />
    </AbsoluteFill>
  );
};

// Pantalla de tubo: líneas de barrido alineadas con los píxeles y viñeta.
export const CrtOverlay: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill style={{ backgroundImage: `repeating-linear-gradient(180deg, transparent 0px, transparent ${SCALE - 2}px, rgba(0,0,0,0.22) ${SCALE - 2}px, rgba(0,0,0,0.22) ${SCALE}px)` }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 75% at 50% 50%, transparent 60%, rgba(0,0,0,0.45) 100%)" }} />
  </AbsoluteFill>
);
