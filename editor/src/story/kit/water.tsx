import React from "react";
import { AbsoluteFill, interpolateColors } from "remotion";
import { clamp, rand, ramp, smoothPath, sway, wrap } from "../util";

// Kit submarino: todo se dibuja en SVG a partir del tiempo `t` (s) y la profundidad (m), sin estado.

export const W = 1080;
export const H = 1920;

/** Lienzo SVG a pantalla completa: dentro van los <g> de criaturas y decorado. */
export const Svg: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, overflow: "visible", ...style }}>
    {children}
  </svg>
);

// ───────────────────────────────────────────────────────── Fondo con profundidad

const STOPS = [0, 60, 200, 600, 1000, 2500, 4500, 11000];
const TOP = ["#86dcf5", "#47b6e2", "#1a75ab", "#0c3f6b", "#06274b", "#041634", "#020b1f", "#01040c"];
const BOT = ["#3aa0d2", "#1c7db4", "#0e4e80", "#072f55", "#041b37", "#020e24", "#010610", "#000207"];

/** Agua que oscurece con la profundidad: rayos de sol (hasta ~600 m), burbujas (arriba) y nieve marina (abajo). */
export const DeepWater: React.FC<{ depth: number; t: number }> = ({ depth, t }) => {
  const top = interpolateColors(depth, STOPS, TOP);
  const bot = interpolateColors(depth, STOPS, BOT);
  const rays = clamp(1 - depth / 650);
  const bubbles = clamp(1 - depth / 140);
  const snow = ramp(depth, 80, 600);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${top}, ${bot})` }}>
      <Svg>
        <defs>
          <linearGradient id="ray" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.36" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="vig" cx="50%" cy="46%" r="75%">
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.55" />
          </radialGradient>
        </defs>
        {rays > 0.01
          ? Array.from({ length: 7 }, (_, i) => {
              const x0 = -60 + i * 190 + sway(t, 0.05 + i * 0.01, 34, i * 0.3);
              const wd = 50 + rand(i + 3) * 70;
              return <polygon key={i} points={`${x0},0 ${x0 + wd},0 ${x0 + 330 + wd},${H} ${x0 + 120},${H}`} fill="url(#ray)" opacity={rays * (0.45 + 0.5 * rand(i + 9))} />;
            })
          : null}
        {snow > 0.01
          ? Array.from({ length: 80 }, (_, i) => {
              const r = rand(i * 3.1 + 1);
              const parallax = 0.35 + rand(i + 50) * 0.9;
              const y = wrap(rand(i + 7) * (H + 60) + t * (5 + r * 14) - depth * parallax * 0.75, H + 60) - 30;
              const x = rand(i + 21) * W + sway(t, 0.05 + r * 0.06, 16, r);
              return <circle key={i} cx={x} cy={y} r={1.2 + r * 3.2 * parallax} fill="#cfe9ff" opacity={snow * (0.18 + 0.4 * r)} />;
            })
          : null}
        {bubbles > 0.01
          ? Array.from({ length: 26 }, (_, i) => {
              const r = rand(i * 1.7 + 4);
              const y = H + 30 - wrap(t * (70 + r * 110) + rand(i + 31) * H, H + 60);
              const x = rand(i + 11) * W + sway(t, 0.4 + r * 0.5, 14, r * 3);
              return <circle key={i} cx={x} cy={y} r={4 + r * 12} fill="none" stroke="#fff" strokeWidth={2} opacity={bubbles * 0.5} />;
            })
          : null}
        <rect width={W} height={H} fill="url(#vig)" />
      </Svg>
    </AbsoluteFill>
  );
};

// ───────────────────────────────────────────────────────── Criaturas

type Base = { x: number; y: number; s?: number; flip?: boolean; t: number; op?: number };
const place = ({ x, y, s = 1, flip }: Pick<Base, "x" | "y" | "s" | "flip">) => `translate(${x} ${y}) scale(${flip ? -s : s} ${s})`;

/** Ballena azul (vista lateral, mira a la izquierda). Longitud ≈ 640 · s. */
export const Whale: React.FC<Base & { color?: string; belly?: string }> = ({ t, op = 1, color = "#2f6192", belly = "#7fb0d4", ...b }) => {
  const tail = sway(t, 0.22, 7);
  const fin = sway(t, 0.3, 9, 0.2);
  return (
    <g transform={place(b)} opacity={op}>
      <g transform={`rotate(${tail} 290 -4)`}>
        <path d="M 288 -14 C 326 -22 360 -52 398 -84 C 386 -50 382 -28 386 -6 C 382 16 386 44 398 76 C 360 48 326 20 288 8 Z" fill={color} />
      </g>
      <path d="M -300 6 C -296 -48 -200 -86 -60 -82 C 80 -78 190 -46 296 -16 L 296 10 C 200 42 70 68 -70 66 C -190 64 -296 54 -300 6 Z" fill={color} />
      <path d="M -296 14 C -280 46 -190 64 -70 64 C 70 66 200 40 292 10 C 190 22 60 38 -60 36 C -170 34 -260 28 -296 14 Z" fill={belly} opacity="0.9" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M ${-230 + i * 36} 40 C ${-215 + i * 36} 50 ${-180 + i * 36} 54 ${-150 + i * 36} 52`} stroke={color} strokeWidth="2" fill="none" opacity="0.35" />
      ))}
      <g transform={`rotate(${fin} -80 54)`}>
        <path d="M -92 54 C -64 92 -12 112 36 106 C 4 86 -18 68 -30 54 Z" fill={color} />
      </g>
      <circle cx="-262" cy="0" r="5" fill="#0a1a2a" />
    </g>
  );
};

/** Banco de peces que se mueve en bloque. */
export const FishSchool: React.FC<Base & { w?: number; h?: number; n?: number; color?: string; seed?: number }> = ({ t, op = 1, w = 420, h = 260, n = 16, color = "#f2b544", seed = 1, ...b }) => (
  <g transform={place(b)} opacity={op}>
    {Array.from({ length: n }, (_, i) => {
      const r = (k: number) => rand(seed * 100 + i * 7 + k);
      const px = (r(1) - 0.5) * w + sway(t, 0.11, 26, r(3));
      const py = (r(2) - 0.5) * h + sway(t, 0.16, 18, r(4));
      const sc = 0.7 + r(5) * 0.7;
      const wig = sway(t, 2.4, 10, r(6));
      return (
        <g key={i} transform={`translate(${px} ${py}) scale(${sc})`}>
          <path d="M -16 0 L -36 -12 L -36 12 Z" fill={color} transform={`rotate(${wig} -16 0)`} />
          <ellipse cx="0" cy="0" rx="24" ry="11" fill={color} />
          <ellipse cx="2" cy="4" rx="18" ry="5" fill="#fff" opacity="0.28" />
          <circle cx="13" cy="-2" r="2.6" fill="#10202c" />
        </g>
      );
    })}
  </g>
);

/** Medusa luminosa. */
export const Jelly: React.FC<Base & { color?: string; glow?: number; seed?: number }> = ({ t, op = 1, color = "#7df9ff", glow = 1, seed = 0, ...b }) => {
  const pulse = 1 + sway(t, 0.65, 0.09, seed * 0.37);
  const id = `jg${seed}`;
  return (
    <g transform={place(b)} opacity={op}>
      <defs>
        <radialGradient id={id} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={color} stopOpacity={0.55 * glow} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <circle cx="0" cy="20" r="150" fill={`url(#${id})`} />
      {Array.from({ length: 7 }, (_, k) => {
        const x0 = -36 + k * 12;
        const pts: [number, number][] = Array.from({ length: 8 }, (_, j) => [x0 + sway(t, 0.5, 4 + j * 1.6, k * 0.13 - j * 0.1 + seed), 6 + j * 17]);
        return <path key={k} d={smoothPath(pts)} stroke={color} strokeWidth={3.4 - k * 0.1} strokeLinecap="round" fill="none" opacity="0.7" />;
      })}
      <g transform={`scale(${pulse} ${2 - pulse})`}>
        <path d="M -48 6 C -50 -62 50 -62 48 6 C 30 16 -30 16 -48 6 Z" fill={`url(#${id}b)`} opacity="0.92" />
        <ellipse cx="0" cy="-26" rx="22" ry="12" fill="#fff" opacity="0.5" />
      </g>
    </g>
  );
};

/** Calamar gigante (mira a la izquierda: cabeza y brazos a la izquierda, aletas a la derecha). */
export const Squid: React.FC<Base & { color?: string; fin?: string; eye?: string }> = ({ t, op = 1, color = "#b5483d", fin = "#d9705d", eye = "#ffd76a", ...b }) => (
  <g transform={place(b)} opacity={op}>
    {/* tentáculos largos con maza */}
    {[-1, 1].map((k) => {
      const pts: [number, number][] = Array.from({ length: 12 }, (_, j) => [-34 - j * 36, k * (10 + j * 1.5) + sway(t, 0.45, 12 + j * 3.2, k * 0.31 - j * 0.1)]);
      const end = pts[pts.length - 1];
      return (
        <g key={k}>
          <path d={smoothPath(pts)} stroke={color} strokeWidth="7" strokeLinecap="round" fill="none" />
          <ellipse cx={end[0]} cy={end[1]} rx="20" ry="11" fill={fin} />
        </g>
      );
    })}
    {/* ocho brazos */}
    {Array.from({ length: 8 }, (_, k) => {
      const y0 = -22 + k * 6.3;
      const pts: [number, number][] = Array.from({ length: 7 }, (_, j) => [-30 - j * 24, y0 * (1 + j * 0.22) + sway(t, 0.5, 4 + j * 1.5, k * 0.17 - j * 0.12)]);
      return <path key={k} d={smoothPath(pts)} stroke={color} strokeWidth={11 - k * 0.5} strokeLinecap="round" fill="none" />;
    })}
    <path d="M 238 -22 L 338 -70 L 312 0 L 338 70 L 238 22 Z" fill={fin} />
    <path d="M 14 -38 C 90 -62 220 -48 312 0 C 220 48 90 62 14 38 Z" fill={color} />
    <path d="M 30 -34 C 100 -52 210 -42 296 -8 C 200 -26 100 -28 30 -22 Z" fill="#fff" opacity="0.16" />
    <ellipse cx="0" cy="0" rx="36" ry="38" fill={color} />
    <circle cx="-4" cy="-6" r="22" fill={eye} opacity="0.35" />
    <circle cx="-4" cy="-6" r="17" fill={eye} />
    <circle cx="-2" cy="-6" r="9" fill="#150a0a" />
    <circle cx="-6" cy="-11" r="3.4" fill="#fff" />
  </g>
);

/** Pez abisal con señuelo luminoso (mira a la izquierda). */
export const Angler: React.FC<Base & { glow?: number }> = ({ t, op = 1, glow = 1, ...b }) => {
  const pulse = 1 + sway(t, 0.8, 0.18);
  const jaw = sway(t, 0.5, 3);
  return (
    <g transform={place(b)} opacity={op}>
      <defs>
        <radialGradient id="lure" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff7b8" stopOpacity="1" />
          <stop offset="0.35" stopColor="#ffe066" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffd23f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="anglerBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2e45" />
          <stop offset="1" stopColor="#1c1524" />
        </linearGradient>
      </defs>
      <path d="M 66 -8 L 138 -44 L 124 0 L 138 44 L 66 12 Z" fill="#2a2034" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M ${-30 + i * 24} -62 L ${-22 + i * 24} -84 L ${-10 + i * 24} -62 Z`} fill="#2a2034" />
      ))}
      <ellipse cx="0" cy="0" rx="82" ry="68" fill="url(#anglerBody)" />
      <path d="M -74 0 C -50 -8 20 -8 60 0 C 50 46 -40 56 -76 22 Z" fill="#5a1620" transform={`translate(0 ${jaw})`} />
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={`M ${-70 + i * 14} ${2 + jaw} L ${-64 + i * 14} ${20 + jaw} L ${-58 + i * 14} ${2 + jaw} Z`} fill="#f1f0e8" />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <path key={i} d={`M ${-62 + i * 16} ${34 + jaw} L ${-56 + i * 16} ${18 + jaw} L ${-50 + i * 16} ${34 + jaw} Z`} fill="#f1f0e8" />
      ))}
      <circle cx="-34" cy="-26" r="13" fill="#e9eef2" />
      <circle cx="-38" cy="-26" r="6" fill="#0b0b10" />
      <path d="M -14 -64 C -24 -128 -76 -160 -118 -138" stroke="#4a3a52" strokeWidth="6" fill="none" strokeLinecap="round" />
      <circle cx="-118" cy="-138" r={70 * pulse * glow} fill="url(#lure)" opacity={glow} />
      <circle cx="-118" cy="-138" r="9" fill="#fff9c8" />
    </g>
  );
};

/** Submarino amarillo con foco. `squeeze` 0–1 lo aprieta (presión). */
export const Sub: React.FC<Base & { light?: number; squeeze?: number }> = ({ t, op = 1, light = 1, squeeze = 0, ...b }) => {
  const bob = sway(t, 0.3, 6);
  const prop = 26 * Math.abs(Math.cos(t * 22));
  return (
    <g transform={`${place(b)} translate(0 ${bob}) scale(${1 - 0.07 * squeeze} ${1 - 0.02 * squeeze})`} opacity={op}>
      <defs>
        <linearGradient id="cone" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff6c8" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff6c8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd84a" />
          <stop offset="1" stopColor="#e0a30c" />
        </linearGradient>
      </defs>
      {light > 0 ? <polygon points="128,-6 700,-170 700,170 128,20" fill="url(#cone)" opacity={light} /> : null}
      <rect x="-30" y="-92" width="14" height="30" rx="4" fill="#c98f0a" />
      <rect x="-40" y="-100" width="46" height="12" rx="6" fill="#c98f0a" />
      <rect x="-34" y="-84" width="80" height="44" rx="16" fill="url(#hull)" />
      <polygon points="-112,-18 -150,-44 -150,-6" fill="#c98f0a" />
      <polygon points="-112,18 -150,44 -150,6" fill="#c98f0a" />
      <rect x="-124" y="-50" width="250" height="100" rx="50" fill="url(#hull)" />
      <rect x="-90" y="-44" width="170" height="10" rx="5" fill="#fff" opacity="0.35" />
      {[-62, 0, 62].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="0" r="19" fill="#9a6d06" />
          <circle cx={cx} cy="0" r="14" fill="#bfe9ff" />
          <ellipse cx={cx - 4} cy="-4" rx="6" ry="4" fill="#fff" opacity="0.8" />
        </g>
      ))}
      <ellipse cx="-134" cy="0" rx="7" ry={prop} fill="#8a5c05" />
      <circle cx="122" cy="2" r="9" fill="#fff6c8" opacity={0.4 + 0.6 * light} />
    </g>
  );
};
