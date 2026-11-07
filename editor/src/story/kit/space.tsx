import React from "react";
import { AbsoluteFill } from "remotion";
import { F } from "../../explainer/theme";
import { clamp, rand, sway } from "../util";
import { StarField } from "./sky";
import { H, Svg, W } from "./water";

// Cuerpos celestes y anotaciones para vídeos de escala. Cada cuerpo se dibuja a partir de su centro y radio en píxeles;
// si el radio es diminuto se convierte en un punto con halo, para que se vea dónde está aunque sea microscópico.

const visible = (cx: number, cy: number, r: number) => cx + r > -80 && cx - r < W + 80 && cy + r > -80 && cy - r < H + 80;

/** Fondo de espacio profundo con nebulosa tenue y estrellas que se ensanchan un poco al alejar la cámara. */
export const SpaceBg: React.FC<{ t: number; zoom?: number }> = ({ t, zoom = 1 }) => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at 30% 25%, #131a3d 0%, #070a1d 55%, #02030a 100%)" }}>
    <Svg>
      <defs>
        <radialGradient id="neb1" cx="80%" cy="70%" r="55%">
          <stop offset="0" stopColor="#5b2a8f" stopOpacity="0.22" />
          <stop offset="1" stopColor="#5b2a8f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="neb2" cx="10%" cy="85%" r="50%">
          <stop offset="0" stopColor="#1b6fa8" stopOpacity="0.18" />
          <stop offset="1" stopColor="#1b6fa8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#neb1)" />
      <rect width={W} height={H} fill="url(#neb2)" />
      <g transform={`translate(${W / 2} ${H / 2}) scale(${zoom}) translate(${-W / 2} ${-H / 2})`}>
        <StarField t={t} n={150} seed={4} y0={0} y1={H} />
        <StarField t={t} n={40} seed={9} y0={0} y1={H} color="#ffd9a8" />
      </g>
    </Svg>
  </AbsoluteFill>
);

const dot = (cx: number, cy: number, color: string, glow: string, rMin = 3.2, pulse = 0) => (
  <g>
    <circle cx={cx} cy={cy} r={14 + pulse * 6} fill={glow} opacity={0.35} />
    <circle cx={cx} cy={cy} r={rMin} fill={color} />
  </g>
);

// ───────────────────────────────────────────────────────── Tierra

const CONT = [
  "M -0.15 -0.6 C 0.05 -0.72 0.3 -0.5 0.28 -0.2 C 0.42 0.0 0.3 0.42 0.12 0.62 C -0.05 0.52 -0.2 0.2 -0.15 -0.1 Z",
  "M -0.72 -0.42 C -0.5 -0.62 -0.34 -0.46 -0.4 -0.2 C -0.3 0.1 -0.45 0.5 -0.55 0.62 C -0.72 0.4 -0.66 0.1 -0.76 -0.1 Z",
  "M 0.4 -0.55 C 0.72 -0.5 0.86 -0.2 0.7 0.0 C 0.55 -0.1 0.45 -0.25 0.4 -0.55 Z",
  "M 0.45 0.3 C 0.65 0.28 0.75 0.45 0.62 0.58 C 0.5 0.55 0.44 0.42 0.45 0.3 Z",
];

export const Earth: React.FC<{ cx: number; cy: number; r: number; t: number; pulse?: number }> = ({ cx, cy, r, t, pulse = 0 }) => {
  if (!visible(cx, cy, r)) return null;
  if (r < 3.2) return dot(cx, cy, "#6cc2ff", "#3a9bff", 3.2, pulse);
  const drift = ((t * 0.035) % 2) * r;
  return (
    <g>
      <defs>
        <radialGradient id="earthG" cx="36%" cy="32%" r="78%">
          <stop offset="0" stopColor="#8fdcff" />
          <stop offset="0.5" stopColor="#2c82dc" />
          <stop offset="1" stopColor="#0a2a66" />
        </radialGradient>
        <radialGradient id="earthShade" cx="32%" cy="30%" r="85%">
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.62" />
        </radialGradient>
        <radialGradient id="earthAtm" cx="50%" cy="50%" r="50%">
          <stop offset="0.82" stopColor="#7cc4ff" stopOpacity="0" />
          <stop offset="0.93" stopColor="#7cc4ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#7cc4ff" stopOpacity="0" />
        </radialGradient>
        <clipPath id="earthClip">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r * 1.22} fill="url(#earthAtm)" />
      <circle cx={cx} cy={cy} r={r} fill="url(#earthG)" />
      <g clipPath="url(#earthClip)">
        {[-2, 0, 2].map((k) => (
          <g key={k} transform={`translate(${cx + k * r - drift} ${cy}) scale(${r})`}>
            {CONT.map((d, i) => (
              <path key={i} d={d} fill={i === 1 ? "#3f9c4b" : "#4fae55"} opacity="0.95" />
            ))}
            <ellipse cx="0.1" cy="-0.88" rx="0.38" ry="0.1" fill="#f2f8ff" opacity="0.9" />
            <ellipse cx="-0.2" cy="0.9" rx="0.45" ry="0.1" fill="#f2f8ff" opacity="0.9" />
            <ellipse cx="-0.3" cy="-0.1" rx="0.28" ry="0.05" fill="#fff" opacity="0.55" />
            <ellipse cx="0.5" cy="0.2" rx="0.3" ry="0.045" fill="#fff" opacity="0.5" />
          </g>
        ))}
      </g>
      <circle cx={cx} cy={cy} r={r} fill="url(#earthShade)" />
    </g>
  );
};

// ───────────────────────────────────────────────────────── Júpiter

const BANDS: [number, number, string][] = [
  [-1, -0.78, "#d9c3a0"],
  [-0.78, -0.58, "#b87a48"],
  [-0.58, -0.4, "#ecdcc0"],
  [-0.4, -0.2, "#c58a55"],
  [-0.2, -0.02, "#f0e3c8"],
  [-0.02, 0.18, "#b36d3e"],
  [0.18, 0.36, "#ead7b6"],
  [0.36, 0.55, "#c9935f"],
  [0.55, 0.76, "#e9d9bc"],
  [0.76, 1, "#b9855a"],
];

export const Jupiter: React.FC<{ cx: number; cy: number; r: number; t: number }> = ({ cx, cy, r, t }) => {
  if (!visible(cx, cy, r)) return null;
  if (r < 3.2) return dot(cx, cy, "#e4b98a", "#e4b98a", 3.2);
  return (
    <g>
      <defs>
        <clipPath id="jupClip">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
        <radialGradient id="jupShade" cx="35%" cy="32%" r="80%">
          <stop offset="0.45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#1b0d00" stopOpacity="0.6" />
        </radialGradient>
      </defs>
      <g clipPath="url(#jupClip)">
        {BANDS.map(([a, b, c], i) => (
          <rect key={i} x={cx - r} y={cy + a * r} width={r * 2} height={(b - a) * r + 1} fill={c} />
        ))}
        {BANDS.map(([a], i) => (
          <path key={`w${i}`} d={`M ${cx - r} ${cy + a * r} ${Array.from({ length: 9 }, (_, k) => `L ${cx - r + (k + 1) * r * 0.25} ${cy + a * r + Math.sin(k * 1.7 + i + t * 0.3) * r * 0.018}`).join(" ")}`} stroke="#fff" strokeOpacity="0.18" strokeWidth={r * 0.012} fill="none" />
        ))}
        <ellipse cx={cx + r * 0.32 + sway(t, 0.02, r * 0.05)} cy={cy + r * 0.3} rx={r * 0.24} ry={r * 0.14} fill="#b04a2e" stroke="#e6a07a" strokeWidth={r * 0.015} />
      </g>
      <circle cx={cx} cy={cy} r={r} fill="url(#jupShade)" />
    </g>
  );
};

// ───────────────────────────────────────────────────────── Sol

export const Sun: React.FC<{ cx: number; cy: number; r: number; t: number; dotMin?: number }> = ({ cx, cy, r, t, dotMin = 3.4 }) => {
  if (!visible(cx, cy, r * 1.8)) return null;
  if (r < dotMin) return dot(cx, cy, "#fff1a8", "#ffb21f", dotMin, 1);
  return (
    <g>
      <defs>
        <radialGradient id="sunCorona" cx="50%" cy="50%" r="50%">
          <stop offset="0.5" stopColor="#ffb21f" stopOpacity="0.55" />
          <stop offset="0.75" stopColor="#ff8a12" stopOpacity="0.18" />
          <stop offset="1" stopColor="#ff8a12" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sunG" cx="46%" cy="42%" r="62%">
          <stop offset="0" stopColor="#fffbd2" />
          <stop offset="0.55" stopColor="#ffd23f" />
          <stop offset="1" stopColor="#ff8f1c" />
        </radialGradient>
        <clipPath id="sunClip">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r * 1.7} fill="url(#sunCorona)" />
      <circle cx={cx} cy={cy} r={r} fill="url(#sunG)" />
      <g clipPath="url(#sunClip)">
        {Array.from({ length: 16 }, (_, i) => {
          const a = rand(i + 3) * 6.283;
          const d = Math.sqrt(rand(i + 40)) * r * 0.9;
          const rr = r * (0.05 + rand(i + 80) * 0.1);
          return <circle key={i} cx={cx + Math.cos(a) * d} cy={cy + Math.sin(a) * d} r={rr * (1 + 0.2 * Math.sin(t * 1.2 + i))} fill="#ff9d1a" opacity={0.28 + 0.15 * Math.sin(t * 0.9 + i * 2)} />;
        })}
      </g>
    </g>
  );
};

// ───────────────────────────────────────────────────────── Betelgeuse

export const Betelgeuse: React.FC<{ cx: number; cy: number; r: number; t: number }> = ({ cx, cy, r, t }) => {
  if (!visible(cx, cy, Math.min(r, 3000)) || r > 6000) return null;
  return (
    <g>
      <defs>
        <radialGradient id="betG" cx="44%" cy="40%" r="64%">
          <stop offset="0" stopColor="#ffb878" />
          <stop offset="0.55" stopColor="#ff6a2d" />
          <stop offset="1" stopColor="#a3200c" />
        </radialGradient>
        <radialGradient id="betGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0.7" stopColor="#ff5a1f" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
        </radialGradient>
        <clipPath id="betClip">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r * 1.18} fill="url(#betGlow)" />
      <circle cx={cx} cy={cy} r={r} fill="url(#betG)" />
      <g clipPath="url(#betClip)">
        {Array.from({ length: 22 }, (_, i) => {
          const a = rand(i * 2 + 1) * 6.283 + t * 0.02 * (i % 2 ? 1 : -1);
          const d = Math.sqrt(rand(i + 60)) * r * 0.95;
          const rr = r * (0.1 + rand(i + 120) * 0.2);
          const light = i % 2 === 0;
          return <circle key={i} cx={cx + Math.cos(a) * d} cy={cy + Math.sin(a) * d} r={rr} fill={light ? "#ffd49a" : "#7d1608"} opacity={light ? 0.3 : 0.34} />;
        })}
      </g>
    </g>
  );
};

// ───────────────────────────────────────────────────────── Anotaciones

const OUTLINE = "0 0 0 #05070d, 2px 2px 0 #05070d, -2px 2px 0 #05070d, 2px -2px 0 #05070d, -2px -2px 0 #05070d, 0 4px 14px rgba(0,0,0,.6)";

/** Regla de medida: línea con topes que se dibuja desde el centro y rótulo encima. */
export const Measure: React.FC<{ x1: number; x2: number; y: number; label: string; p: number; accent?: string; size?: number }> = ({ x1, x2, y, label, p, accent = "#ffb23f", size = 44 }) => {
  const mid = (x1 + x2) / 2;
  const a = mid + (x1 - mid) * p;
  const b = mid + (x2 - mid) * p;
  return (
    <>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <line x1={a} y1={y} x2={b} y2={y} stroke={accent} strokeWidth="5" strokeLinecap="round" />
        <line x1={a} y1={y - 16} x2={a} y2={y + 16} stroke={accent} strokeWidth="5" strokeLinecap="round" />
        <line x1={b} y1={y - 16} x2={b} y2={y + 16} stroke={accent} strokeWidth="5" strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", left: mid - 300, width: 600, top: y - size - 22, textAlign: "center", fontFamily: F.display, fontSize: size, color: "#fff", textShadow: OUTLINE, opacity: clamp(p * 2 - 0.5) }}>{label}</div>
    </>
  );
};

/** Rótulo de un cuerpo (nombre en mayúsculas) con aparición suave. */
export const BodyLabel: React.FC<{ x: number; y: number; text: string; sub?: string; p: number; accent?: string; align?: "center" | "left" | "right" }> = ({ x, y, text, sub, p, accent = "#ffb23f", align = "center" }) => (
  <div style={{ position: "absolute", left: align === "center" ? x - 300 : align === "left" ? x : x - 600, width: 600, top: y, textAlign: align, opacity: clamp(p * 2), translate: `0 ${(1 - clamp(p)) * 14}px` }}>
    <div style={{ fontFamily: F.display, fontSize: 60, color: "#fff", textShadow: OUTLINE, letterSpacing: "0.02em" }}>{text}</div>
    {sub ? <div style={{ fontFamily: F.mono, fontSize: 28, fontWeight: 600, color: accent, textShadow: OUTLINE }}>{sub}</div> : null}
  </div>
);

/** Anillo de órbita discontinuo con rótulo en el ángulo `angle` (rad, eje Y hacia abajo). */
export const OrbitRing: React.FC<{ cx: number; cy: number; r: number; label: string; p: number; hi?: boolean; accent?: string; angle?: number }> = ({ cx, cy, r, label, p, hi = false, accent = "#ffb23f", angle = -0.7 }) => {
  const col = hi ? accent : "#ffffff";
  const lx = cx + Math.cos(angle) * (r + 10);
  const ly = cy + Math.sin(angle) * (r + 10);
  return (
    <g opacity={clamp(p * 1.6)}>
      <circle cx={cx} cy={cy} r={r * clamp(p)} fill="none" stroke="#05070d" strokeWidth={hi ? 10 : 7} opacity="0.55" />
      <circle cx={cx} cy={cy} r={r * clamp(p)} fill="none" stroke={col} strokeWidth={hi ? 6 : 3.5} strokeDasharray={hi ? "none" : "12 9"} />
      {label ? (
        <text x={lx} y={ly + 8} textAnchor={Math.cos(angle) >= 0 ? "start" : "end"} fontFamily={F.mono} fontSize={hi ? 36 : 30} fontWeight={800} fill={col} stroke="#05070d" strokeWidth="7" paintOrder="stroke">
          {label}
        </text>
      ) : null}
    </g>
  );
};

/** Anillo que se expande y se repite: «mira aquí». */
export const PulseRing: React.FC<{ cx: number; cy: number; t: number; color?: string; r0?: number }> = ({ cx, cy, t, color = "#ffb23f", r0 = 10 }) => (
  <g>
    {[0, 1].map((i) => {
      const ph = (t * 0.9 + i * 0.5) % 1;
      return <circle key={i} cx={cx} cy={cy} r={r0 + ph * 60} fill="none" stroke={color} strokeWidth={5 * (1 - ph) + 1} opacity={1 - ph} />;
    })}
  </g>
);
