import { makeStar } from "@remotion/shapes";
import type React from "react";
import { Easing, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BANDS, CARD_IMAGE, MG } from "./theme";

// Piezas de motion graphics planas: estrellas, ondas de esquina, trazos que se dibujan, móvil plano y cortinillas.

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN = Easing.bezier(0.7, 0, 0.84, 0);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

// Muelle con rebote (entradas "pop").
export const bounce = (frame: number, fps: number, at: number, config: { damping?: number; stiffness?: number; mass?: number } = {}) =>
  spring({ frame: frame - at, fps, config: { damping: 11, stiffness: 170, mass: 0.7, ...config } });

// Muelle sin rebote (movimientos de colocación).
export const glide = (frame: number, fps: number, at: number, config: { damping?: number; stiffness?: number; mass?: number } = {}) =>
  spring({ frame: frame - at, fps, config: { damping: 22, stiffness: 120, mass: 0.9, ...config } });

export const ramp = (frame: number, from: number, to: number, easing = EASE_OUT) => interpolate(frame, [from, to], [0, 1], { ...clamp, easing });

const STAR = makeStar({ points: 5, innerRadius: 46, outerRadius: 100, cornerRadius: 9 });

export const Star: React.FC<{ size: number; fill?: string; stroke?: string; strokeWidth?: number; style?: React.CSSProperties }> = ({
  size,
  fill = MG.yellow,
  stroke = "none",
  strokeWidth = 0,
  style,
}) => {
  const pad = strokeWidth;
  return (
    <svg
      width={size}
      height={(size * STAR.height) / STAR.width}
      viewBox={`${-pad} ${-pad} ${STAR.width + pad * 2} ${STAR.height + pad * 2}`}
      style={{ overflow: "visible", ...style }}
    >
      <path d={STAR.path} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );
};

// Ondas de color en una esquina, como las de la tarjeta: bandas anidadas que respiran.
export const CornerWaves: React.FC<{
  corner: "tl" | "tr" | "bl" | "br";
  size: number;
  grow: number;
  phase: number;
  colors?: string[];
  style?: React.CSSProperties;
}> = ({ corner, size, grow, phase, colors = BANDS, style }) => {
  const box = size * 1.25;
  const paths = colors.map((color, i) => {
    const r0 = size * (1 - i * 0.19) * grow;
    if (r0 <= 1) return null;
    let d = "M0 0";
    for (let k = 0; k <= 36; k++) {
      const th = (k / 36) * (Math.PI / 2);
      const r = r0 * (1 + 0.09 * Math.sin(th * 5 + phase * 0.05 + i * 1.7) + 0.035 * Math.sin(th * 12 - phase * 0.035 + i));
      d += ` L${(r * Math.cos(th)).toFixed(1)} ${(r * Math.sin(th)).toFixed(1)}`;
    }
    return <path key={color + i} d={`${d} Z`} fill={color} />;
  });
  const t = { tl: "", tr: `translate(${box} 0) scale(-1 1)`, bl: `translate(0 ${box}) scale(1 -1)`, br: `translate(${box} ${box}) scale(-1 -1)` }[corner];
  const pos = { tl: { left: 0, top: 0 }, tr: { right: 0, top: 0 }, bl: { left: 0, bottom: 0 }, br: { right: 0, bottom: 0 } }[corner];
  return (
    <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} style={{ position: "absolute", overflow: "visible", ...pos, ...style }}>
      <g transform={t}>{paths}</g>
    </svg>
  );
};

// Trazo que se dibuja (0 → 1).
export const Draw: React.FC<{ d: string; p: number; stroke: string; width: number }> = ({ d, p, stroke, width }) =>
  p <= 0.001 ? null : (
    <path d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - Math.min(1, p)} stroke={stroke} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  );

// Rayos de "golpe" que salen de un punto.
export const Burst: React.FC<{ at: number; x: number; y: number; radius?: number; count?: number; thickness?: number; colors?: string[]; seed?: string }> = ({
  at,
  x,
  y,
  radius = 220,
  count = 10,
  thickness = 14,
  colors = BANDS,
  seed = "burst",
}) => {
  const frame = useCurrentFrame();
  const t = (frame - at) / 18;
  if (t < 0 || t > 1) return null;
  const e = EASE_OUT(t);
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }} width={1} height={1}>
      {new Array(count).fill(0).map((_, i) => {
        const a = (i / count) * Math.PI * 2 + random(`${seed}-a`) * 6;
        const r2 = radius * (0.45 + 0.75 * e);
        const r1 = radius * (0.3 + 0.75 * Math.pow(t, 0.6));
        return (
          <line
            key={i}
            x1={x + Math.cos(a) * r1}
            y1={y + Math.sin(a) * r1}
            x2={x + Math.cos(a) * r2}
            y2={y + Math.sin(a) * r2}
            stroke={colors[i % colors.length]}
            strokeWidth={thickness * (1 - t)}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
};

const SPARK = "M0 -1 C0.12 -0.12 0.12 -0.12 1 0 C0.12 0.12 0.12 0.12 0 1 C-0.12 0.12 -0.12 0.12 -1 0 C-0.12 -0.12 -0.12 -0.12 0 -1 Z";

// Destello de cuatro puntas que aparece y se va girando.
export const Sparkle: React.FC<{ at: number; x: number; y: number; size?: number; color?: string }> = ({ at, x, y, size = 60, color = MG.yellow }) => {
  const frame = useCurrentFrame();
  const t = (frame - at) / 20;
  if (t < 0 || t > 1) return null;
  const s = Math.sin(t * Math.PI);
  return (
    <svg style={{ position: "absolute", left: x - size, top: y - size, overflow: "visible" }} width={size * 2} height={size * 2} viewBox="-1 -1 2 2">
      <path d={SPARK} fill={color} transform={`rotate(${t * 90}) scale(${s})`} />
    </svg>
  );
};

// Confeti plano: círculos, rectángulos, triángulos y garabatos con gravedad.
export const FlatConfetti: React.FC<{ at: number; x: number; y: number; count?: number; seed?: string }> = ({ at, x, y, count = 40, seed = "conf" }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > 70) return null;
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
      {new Array(count).fill(0).map((_, i) => {
        const a = -Math.PI / 2 + (random(`${seed}a${i}`) - 0.5) * Math.PI * 1.5;
        const v = 22 + random(`${seed}v${i}`) * 26;
        const px = x + Math.cos(a) * v * t * 0.9;
        const py = y + Math.sin(a) * v * t * 0.9 + 0.9 * t * t;
        const rot = t * (random(`${seed}r${i}`) - 0.5) * 40;
        const s = 14 + random(`${seed}s${i}`) * 18;
        const color = BANDS[i % 4];
        const fade = interpolate(t, [45, 70], [1, 0], clamp);
        const kind = i % 4;
        return (
          <g key={i} transform={`translate(${px} ${py}) rotate(${rot})`} opacity={fade}>
            {kind === 0 ? <circle r={s / 2} fill={color} /> : null}
            {kind === 1 ? <rect x={-s / 2} y={-s / 4} width={s} height={s / 2} rx={s / 8} fill={color} /> : null}
            {kind === 2 ? <path d={`M0 ${-s / 2} L${s / 2} ${s / 2} L${-s / 2} ${s / 2} Z`} fill={color} /> : null}
            {kind === 3 ? <path d={`M${-s} 0 q${s / 2} ${-s / 2} ${s} 0 t${s} 0`} stroke={color} strokeWidth={s / 3} fill="none" strokeLinecap="round" /> : null}
          </g>
        );
      })}
    </svg>
  );
};

// Móvil plano (sin modelo concreto): cuerpo negro, pantalla blanca e isla.
export const FlatPhone: React.FC<{ width: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({ width, children, style }) => (
  <div
    style={{
      position: "absolute",
      width,
      height: width * 2,
      borderRadius: width * 0.16,
      background: MG.ink,
      padding: width * 0.045,
      boxShadow: `${width * 0.06}px ${width * 0.07}px 0 rgba(21,23,28,0.14)`,
      ...style,
    }}
  >
    <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: width * 0.12, overflow: "hidden", background: MG.paper }}>
      {children}
      <div style={{ position: "absolute", top: width * 0.05, left: "50%", width: width * 0.3, height: width * 0.075, translate: "-50% 0", borderRadius: 999, background: MG.ink }} />
    </div>
  </div>
);

// La tarjeta real (la foto de referencia) con esquinas redondeadas y sombra plana.
export const CardFace: React.FC<{ size: number; shadow?: boolean; style?: React.CSSProperties }> = ({ size, shadow = true, style }) => (
  <Img
    src={staticFile(CARD_IMAGE)}
    style={{
      position: "absolute",
      width: size,
      height: size,
      borderRadius: size * 0.06,
      boxShadow: shadow ? `${size * 0.035}px ${size * 0.045}px 0 rgba(21,23,28,0.16)` : undefined,
      ...style,
    }}
  />
);

// Rotulador: bloque de color que barre detrás del texto.
export const Marker: React.FC<{ p: number; color: string; style?: React.CSSProperties }> = ({ p, color, style }) => (
  <div
    style={{
      position: "absolute",
      left: "-0.12em",
      right: "-0.12em",
      top: "18%",
      bottom: "6%",
      borderRadius: "0.14em",
      background: color,
      transformOrigin: "left center",
      scale: `${Math.max(0, p)} 1`,
      zIndex: -1,
      ...style,
    }}
  />
);

// Cortinilla de bandas onduladas en los cuatro colores (cubre la pantalla a mitad, en el corte).
export const WaveWipe: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const diag = Math.hypot(width, height);
  const bandW = diag * 1.15;
  const span = bandW + diag * 0.1;
  const band = (k: number) => {
    let left = "";
    let right = "";
    const steps = 40;
    for (let s = 0; s <= steps; s++) {
      const y = -diag + (2 * diag * s) / steps;
      const w1 = 46 * Math.sin(y * 0.006 + k * 1.3 + frame * 0.25);
      const w2 = 46 * Math.sin(y * 0.0055 - k * 0.9 + frame * 0.2);
      left += `${s === 0 ? "M" : "L"}${(-bandW / 2 + w1).toFixed(1)} ${y.toFixed(1)} `;
      right = `L${(bandW / 2 + w2).toFixed(1)} ${y.toFixed(1)} ` + right;
    }
    return `${left}${right}Z`;
  };
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
      {BANDS.map((color, k) => {
        const enter = interpolate(frame, [k * 2, k * 2 + 12], [-1, 0], { ...clamp, easing: EASE_IN_OUT });
        const exit = interpolate(frame, [18 + (3 - k) * 2, 30 + (3 - k) * 2], [0, 1], { ...clamp, easing: EASE_IN_OUT });
        const x = (enter + exit) * span;
        return (
          <g key={color} transform={`translate(${width / 2} ${height / 2}) rotate(-28) translate(${x.toFixed(1)} 0)`}>
            <path d={band(k)} fill={color} />
          </g>
        );
      })}
    </svg>
  );
};

// Iris de anillos de color que se cierra con el color de la escena siguiente.
export const IrisWipe: React.FC<{ color: string; x?: number; y?: number }> = ({ color, x, y }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;
  const maxR = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy)) + 40;
  const rings = [MG.yellow, MG.red, MG.blue, MG.green, color];
  if (frame >= 20) return null;
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
      {rings.map((c, k) => (
        <circle key={c + k} cx={cx} cy={cy} r={interpolate(frame, [k * 1.2, k * 1.2 + 9], [0, maxR], { ...clamp, easing: EASE_IN })} fill={c} />
      ))}
    </svg>
  );
};

// Iconos de línea (viewBox 0 0 100 100) para dibujar con <Draw>.
export const ICONS = {
  noApp: ["M28 22h44a8 8 0 0 1 8 8v40a8 8 0 0 1-8 8H28a8 8 0 0 1-8-8V30a8 8 0 0 1 8-8z", "M36 40h8M56 40h8M36 58h8M56 58h8", "M16 84L84 16"],
  noBattery: ["M18 34h56a6 6 0 0 1 6 6v20a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6V40a6 6 0 0 1 6-6z", "M86 44v12", "M14 86L86 14"],
  phones: ["M22 12h22a6 6 0 0 1 6 6v58a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6V18a6 6 0 0 1 6-6z", "M29 72h8", "M60 24h20a6 6 0 0 1 6 6v54a6 6 0 0 1-6 6H60a6 6 0 0 1-6-6V30a6 6 0 0 1 6-6z", "M66 80h8"],
  logo: ["M22 18h56a6 6 0 0 1 6 6v52a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6V24a6 6 0 0 1 6-6z", "M50 32l5.6 11.4 12.6 1.8-9.1 8.9 2.2 12.5L50 60.7l-11.3 5.9 2.2-12.5-9.1-8.9 12.6-1.8z"],
  nfc: ["M34 34c8 9 8 23 0 32", "M46 26c12 13 12 35 0 48", "M58 18c16 18 16 46 0 64"],
  check: ["M28 52l15 15 30-32"],
};
