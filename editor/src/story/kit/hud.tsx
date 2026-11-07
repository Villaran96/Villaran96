import React from "react";
import { spring, useVideoConfig } from "remotion";
import { F } from "../../explainer/theme";
import { clamp, lerpRange, ramp, sway } from "../util";

// Elementos de interfaz sobre la escena: cifras grandes, medidores, etiquetas.

const SHADOW = "0 4px 0 rgba(0,0,0,0.35), 0 10px 30px rgba(0,0,0,0.45)";
const OUTLINE = Array.from({ length: 12 }, (_, i) => `${(Math.cos((i / 12) * 6.283) * 6).toFixed(1)}px ${(Math.sin((i / 12) * 6.283) * 6).toFixed(1)}px 0 #05070d`).join(", ");
const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Pop de entrada con muelle a partir de `at` (s). */
export const usePopAt = (t: number, at: number, damping = 11) => {
  const { fps } = useVideoConfig();
  return spring({ frame: Math.round((t - at) * fps), fps, config: { damping, stiffness: 210, mass: 0.6 } });
};

export const zoneName = (depth: number): string =>
  depth < 200 ? "ZONA SOLEADA" : depth < 1000 ? "ZONA CREPUSCULAR" : depth < 4000 ? "ZONA DE MEDIANOCHE" : depth < 6000 ? "ZONA ABISAL" : "ZONA HADAL";

/** Profundidad actual arriba a la derecha y regla vertical con el marcador (escala raíz: ordena bien 0–11.000 m). */
export const DepthMeter: React.FC<{ depth: number; accent?: string; opacity?: number }> = ({ depth, accent = "#ffd34d", opacity = 1 }) => {
  const marks = [0, 200, 1000, 4000, 11000];
  const pos = (d: number) => Math.sqrt(clamp(d / 11000));
  const top = 330;
  const len = 640;
  return (
    <div style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none" }}>
      <div style={{ position: "absolute", right: 56, top: 84, textAlign: "right", fontFamily: F.display, color: "#fff", textShadow: SHADOW }}>
        <div style={{ fontSize: 96, lineHeight: 1, letterSpacing: "0.01em" }}>
          {fmt(depth)}
          <span style={{ fontSize: 46, marginLeft: 8 }}>m</span>
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 25, color: accent, fontWeight: 600, marginTop: 6, textShadow: "0 2px 6px rgba(0,0,0,.6)" }}>{zoneName(depth)}</div>
      </div>
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
        <line x1="1000" y1={top} x2="1000" y2={top + len} stroke="#fff" strokeOpacity="0.4" strokeWidth="4" strokeLinecap="round" />
        {marks.map((m) => (
          <g key={m}>
            <line x1="988" y1={top + pos(m) * len} x2="1012" y2={top + pos(m) * len} stroke="#fff" strokeOpacity="0.7" strokeWidth="3" />
            <text x="976" y={top + pos(m) * len + 8} textAnchor="end" fontFamily={F.mono} fontSize="22" fill="#fff" fillOpacity="0.75">
              {fmt(m)}
            </text>
          </g>
        ))}
        <circle cx="1000" cy={top + pos(depth) * len} r="13" fill={accent} stroke="#000" strokeOpacity="0.4" strokeWidth="3" />
      </svg>
    </div>
  );
};

/** Cifra enorme con etiqueta. Si `to` es un número, cuenta desde `from`; si no, muestra `text`. */
export const BigStat: React.FC<{
  t: number;
  at?: number;
  text?: string;
  from?: number;
  to?: number;
  unit?: string;
  label: string;
  x?: number;
  y?: number;
  accent?: string;
  size?: number;
  countFor?: number;
  labelColor?: string;
}> = ({ t, at = 0, text, from = 0, to, unit, label, x = 540, y = 600, accent = "#ffd34d", size = 250, countFor = 1.6, labelColor }) => {
  const p = usePopAt(t, at);
  const v = to === undefined ? undefined : from + (to - from) * ramp(t, at + 0.1, at + 0.1 + countFor);
  const shown = text ?? (v === undefined ? "" : fmt(v));
  return (
    <div style={{ position: "absolute", left: x - 480, width: 960, top: y, textAlign: "center", opacity: clamp(p * 2.5), scale: String(0.7 + 0.3 * p), translate: `0 ${(1 - p) * 40}px` }}>
      <div style={{ fontFamily: F.display, fontSize: size, lineHeight: 1, color: "#fff", textShadow: `${OUTLINE}, ${SHADOW}` }}>
        {shown}
        {unit ? <span style={{ fontSize: size * 0.4, marginLeft: 12, color: accent }}>{unit}</span> : null}
      </div>
      <div style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 44, letterSpacing: "0.04em", textTransform: "uppercase", color: labelColor ?? accent, textShadow: `${OUTLINE.replace(/6\.0px|-6\.0px/g, "3px")}, 0 3px 10px rgba(0,0,0,.6)`, marginTop: 6 }}>{label}</div>
    </div>
  );
};

/** Etiqueta con línea guía que apunta a (px, py). La etiqueta se coloca en (lx, ly). */
export const Callout: React.FC<{ t: number; at?: number; px: number; py: number; lx: number; ly: number; title: string; sub?: string; accent?: string; align?: "left" | "right" }> = ({
  t,
  at = 0,
  px,
  py,
  lx,
  ly,
  title,
  sub,
  accent = "#ffd34d",
  align = "left",
}) => {
  const p = usePopAt(t, at, 14);
  const line = ramp(t, at, at + 0.4);
  return (
    <>
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <line x1={lx} y1={ly} x2={lx + (px - lx) * line} y2={ly + (py - ly) * line} stroke={accent} strokeWidth="4" strokeLinecap="round" />
        <circle cx={px} cy={py} r={9 * line} fill={accent} />
      </svg>
      <div style={{ position: "absolute", left: align === "left" ? lx : undefined, right: align === "right" ? 1080 - lx : undefined, top: ly - 34, opacity: clamp(p * 2), scale: String(0.8 + 0.2 * p), transformOrigin: align === "left" ? "left center" : "right center", textAlign: align }}>
        <div style={{ display: "inline-block", padding: "8px 20px", background: "rgba(8,12,24,0.78)", border: `3px solid ${accent}`, borderRadius: 14, fontFamily: F.display, fontSize: 46, color: "#fff", textTransform: "uppercase", whiteSpace: "nowrap" }}>{title}</div>
        {sub ? <div style={{ fontFamily: F.mono, fontSize: 26, color: "#fff", opacity: 0.85, marginTop: 6, textShadow: "0 2px 6px rgba(0,0,0,.7)" }}>{sub}</div> : null}
      </div>
    </>
  );
};

/** Manómetro circular: la aguja sube de 0 a `value` (sobre `max`). */
export const Gauge: React.FC<{ x: number; y: number; r?: number; value: number; max: number; unit: string; accent?: string; t: number; shake?: number }> = ({ x, y, r = 170, value, max, unit, accent = "#ff5a44", t, shake = 0 }) => {
  const frac = clamp(value / max);
  const ang = lerpRange(frac, [0, 1], [-125, 125]) + sway(t, 9, 1.6 * shake);
  const ticks = Array.from({ length: 21 }, (_, i) => i);
  return (
    <svg width="1080" height="1920" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <g transform={`translate(${x} ${y})`}>
        <circle r={r + 16} fill="#1a1f2b" stroke="#aeb7c6" strokeWidth="8" />
        <circle r={r} fill="#0b0f18" />
        {ticks.map((i) => {
          const a = ((-125 + (250 * i) / 20) * Math.PI) / 180;
          const big = i % 5 === 0;
          const r1 = r - 10;
          const r2 = r - (big ? 40 : 24);
          return <line key={i} x1={Math.sin(a) * r1} y1={-Math.cos(a) * r1} x2={Math.sin(a) * r2} y2={-Math.cos(a) * r2} stroke={i / 20 > 0.8 ? accent : "#e9eef5"} strokeWidth={big ? 6 : 3} strokeLinecap="round" />;
        })}
        <g transform={`rotate(${ang})`}>
          <polygon points={`-8,12 8,12 2,${-(r - 34)} -2,${-(r - 34)}`} fill={accent} />
        </g>
        <circle r="16" fill="#e9eef5" />
        <text y={r * 0.55} textAnchor="middle" fontFamily={F.display} fontSize={r * 0.42} fill="#fff">
          {fmt(value)}
        </text>
        <text y={r * 0.8} textAnchor="middle" fontFamily={F.mono} fontSize={r * 0.17} fill="#aeb7c6" fontWeight={700}>
          {unit}
        </text>
      </g>
    </svg>
  );
};

/** Sello rotulado (CTA, «grabado en 2012»…). */
export const Banner: React.FC<{ t: number; at?: number; text: string; x?: number; y?: number; rotate?: number; accent?: string; size?: number }> = ({ t, at = 0, text, x = 540, y = 400, rotate = -4, accent = "#ffd34d", size = 76 }) => {
  const p = usePopAt(t, at, 9);
  return (
    <div style={{ position: "absolute", left: x, top: y, translate: "-50% -50%", rotate: `${rotate}deg`, scale: String(2 - p), opacity: clamp(p * 2), whiteSpace: "nowrap" }}>
      <div style={{ padding: "10px 34px", background: accent, color: "#0b0f18", fontFamily: F.display, fontSize: size, textTransform: "uppercase", borderRadius: 10, boxShadow: "0 12px 28px rgba(0,0,0,.45)" }}>{text}</div>
    </div>
  );
};
