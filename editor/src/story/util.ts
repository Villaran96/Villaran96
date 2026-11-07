import { interpolate } from "remotion";

/** Número pseudoaleatorio estable en [0, 1) a partir de una semilla (sin Math.random: el render debe ser determinista). */
export const rand = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Oscilación senoidal: `hz` ciclos por segundo, amplitud `amp`. */
export const sway = (t: number, hz: number, amp: number, phase = 0): number => Math.sin((t * hz + phase) * Math.PI * 2) * amp;

export const clamp = (n: number, a = 0, b = 1): number => Math.min(b, Math.max(a, n));

export const mix = (a: number, b: number, p: number): number => a + (b - a) * p;

/** Módulo que respeta negativos (para que las partículas den la vuelta por arriba y por abajo). */
export const wrap = (v: number, m: number): number => ((v % m) + m) % m;

/** Progreso 0–1 de `t` entre `a` y `b`, con suavizado. */
export const ramp = (t: number, a: number, b: number): number => {
  const p = clamp((t - a) / Math.max(1e-6, b - a));
  return p * p * (3 - 2 * p);
};

/** Línea quebrada de puntos suavizada (Catmull-Rom → Bézier) para tentáculos, olas, etc. */
export const smoothPath = (pts: [number, number][]): string => {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
};

export const lerpRange = (v: number, inR: number[], outR: number[]): number =>
  interpolate(v, inR, outR, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
