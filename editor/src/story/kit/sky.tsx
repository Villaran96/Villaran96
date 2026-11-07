import React from "react";
import { clamp, rand, sway } from "../util";
import { H, W } from "./water";

// Cielo y espacio: para nichos de noche, astronomía, historia, misterio…

export const StarField: React.FC<{ t: number; n?: number; seed?: number; y0?: number; y1?: number; color?: string; drift?: number }> = ({ t, n = 120, seed = 1, y0 = 0, y1 = H, color = "#fff", drift = 0 }) => (
  <g>
    {Array.from({ length: n }, (_, i) => {
      const r = (k: number) => rand(seed * 1000 + i * 5 + k);
      const tw = 0.55 + 0.45 * Math.sin(t * (0.8 + r(3) * 2.2) + r(4) * 6.28);
      return <circle key={i} cx={(r(1) * W + drift * t) % W} cy={y0 + r(2) * (y1 - y0)} r={0.8 + r(5) * 2.2} fill={color} opacity={clamp(tw * (0.3 + 0.7 * r(6)))} />;
    })}
  </g>
);

export const Moon: React.FC<{ x: number; y: number; r?: number; phase?: number; color?: string; glow?: string }> = ({ x, y, r = 90, phase = 0.28, color = "#f6efd2", glow = "#f6efd2" }) => {
  const id = `moon${Math.round(x)}${Math.round(y)}`;
  return (
    <g>
      <defs>
        <radialGradient id={`${id}g`}>
          <stop offset="0.3" stopColor={glow} stopOpacity="0.35" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}m`}>
          <rect x={x - r * 2} y={y - r * 2} width={r * 4} height={r * 4} fill="#000" />
          <circle cx={x} cy={y} r={r} fill="#fff" />
          <circle cx={x + r * 2 * phase} cy={y - r * 0.1} r={r * 0.95} fill="#000" />
        </mask>
      </defs>
      <circle cx={x} cy={y} r={r * 2.6} fill={`url(#${id}g)`} />
      <rect x={x - r * 2} y={y - r * 2} width={r * 4} height={r * 4} fill={color} mask={`url(#${id}m)`} />
    </g>
  );
};

export const Planet: React.FC<{ x: number; y: number; r?: number; color?: string; shade?: string; ring?: boolean; t?: number }> = ({ x, y, r = 120, color = "#d98b4a", shade = "#6b2f12", ring = false, t = 0 }) => {
  const id = `pl${Math.round(x)}${Math.round(y)}`;
  return (
    <g transform={`translate(${x} ${y + sway(t, 0.08, 6)})`}>
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={shade} />
        </radialGradient>
      </defs>
      {ring ? <ellipse rx={r * 1.9} ry={r * 0.45} fill="none" stroke={color} strokeWidth={r * 0.14} opacity="0.55" transform="rotate(-18)" /> : null}
      <circle r={r} fill={`url(#${id})`} />
      <path d={`M ${-r * 0.9} ${-r * 0.25} Q 0 ${-r * 0.45} ${r * 0.9} ${-r * 0.2}`} stroke="#fff" strokeOpacity="0.12" strokeWidth={r * 0.12} fill="none" />
      {ring ? <path d={`M ${-r * 1.9 * Math.cos(0.31)} ${r * 0.45 * 0.3} A ${r * 1.9} ${r * 0.45} -18 0 0 ${r * 1.9 * Math.cos(0.31)} ${-r * 0.45 * 0.3}`} fill="none" stroke={color} strokeWidth={r * 0.14} opacity="0.0" /> : null}
    </g>
  );
};
