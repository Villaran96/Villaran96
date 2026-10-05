import { noise2D } from "@remotion/noise";
import { Easing, interpolate, spring } from "remotion";

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 0→1 con muelle, empezando en `at`.
export const springAt = (
  frame: number,
  fps: number,
  at: number,
  config: { damping?: number; stiffness?: number; mass?: number } = {},
) =>
  spring({
    frame: frame - at,
    fps,
    config: { damping: 14, stiffness: 160, mass: 0.7, ...config },
  });

export const progress = (frame: number, from: number, to: number, easing = EASE_OUT) =>
  interpolate(frame, [from, to], [0, 1], { ...clamp, easing });

// Vibración de cámara orgánica que decae tras un golpe.
export const shake = (frame: number, hitAt: number, strength: number, seed = "shake") => {
  const t = frame - hitAt;
  if (t < 0) return { x: 0, y: 0, r: 0 };
  const decay = Math.exp(-t / 6);
  return {
    x: noise2D(seed + "x", t * 0.6, 0) * strength * decay,
    y: noise2D(seed + "y", 0, t * 0.6) * strength * decay,
    r: noise2D(seed + "r", t * 0.4, t * 0.4) * strength * 0.08 * decay,
  };
};

// Pequeño "punch" de escala en un golpe de música.
export const punch = (frame: number, fps: number, at: number, amount = 0.06) => {
  if (frame < at) return 1;
  const s = spring({ frame: frame - at, fps, config: { damping: 9, stiffness: 220 } });
  return 1 + amount * Math.sin(s * Math.PI);
};

// Flotación suave basada en ruido (idle de objetos).
export const float = (frame: number, seed: string, amp = 10, speed = 0.012) => ({
  x: noise2D(seed + "fx", frame * speed, 0) * amp,
  y: noise2D(seed + "fy", 0, frame * speed) * amp,
  r: noise2D(seed + "fr", frame * speed * 0.7, 3) * amp * 0.25,
});
