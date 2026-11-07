import { loadFont } from "@remotion/fonts";
import { Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import "../fonts"; // Inter Tight e Instrument Serif
import type { Slot } from "./types";

// Fuentes en local (public/fonts): el navegador de render no pasa por el proxy.
export const fontsReady = Promise.all([
  loadFont({ family: "Anton", url: staticFile("fonts/Anton-400.ttf"), weight: "400" }),
  loadFont({ family: "JetBrains Mono", url: staticFile("fonts/JetBrainsMono-var.woff2"), weight: "100 800" }),
]);

export const C = {
  paper: "#E4DFD4",
  card: "#FBFAF6",
  ink: "#141414",
  mute: "#78736A",
  faint: "rgba(20,20,20,0.16)",
  line: "rgba(20,20,20,0.10)",
  red: "#E2432B",
  blue: "#2C5CF0",
  green: "#2E9E5B",
  gold: "#F4C542",
};

export const F = {
  display: "Anton, 'Inter Tight', sans-serif",
  sans: "'Inter Tight', 'Inter', sans-serif",
  serif: "'Instrument Serif', Georgia, serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

export const W = 1080;
export const H = 1920;

/** Huecos de la maqueta: centro (x, y) y tamaño (w, h). El titular ocupa y ≈ 440–640; el personaje, abajo a la derecha. */
export const SLOTS: Record<Slot, { x: number; y: number; w: number; h: number }> = {
  main: { x: 540, y: 930, w: 940, h: 600 },
  callout: { x: 300, y: 1335, w: 470, h: 190 },
  left: { x: 300, y: 960, w: 470, h: 700 },
  right: { x: 790, y: 960, w: 470, h: 520 },
  free: { x: 540, y: 960, w: 600, h: 400 },
};

export const CARD_SHADOW = "0 26px 50px rgba(70,50,25,0.16), 0 3px 8px rgba(70,50,25,0.10)";

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Progreso 0–1 entre dos instantes (s) del fotograma actual. */
export const useProgress = (from: number, to: number, ease: (t: number) => number = easeOut) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return ease(clamp01((frame / fps - from) / Math.max(0.001, to - from)));
};

/** Muelle de entrada con rebote suave; 0 antes de `at` (s) y ≈1 después. */
export const usePop = (at = 0, config: { damping?: number; stiffness?: number; mass?: number } = {}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - Math.round(at * fps),
    fps,
    config: { damping: 13, stiffness: 190, mass: 0.7, ...config },
  });
};

export const lerp = (p: number, a: number, b: number) => interpolate(p, [0, 1], [a, b]);
