import { lightLeak } from "@remotion/effects/light-leak";
import { makeStar } from "@remotion/shapes";
import type React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  random,
  Solid,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SANS } from "../fonts";
import { BRAND_DOTS, COLORS } from "../theme";
import { EASE_OUT } from "./motion";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Polvo/bokeh flotando: profundidad con tamaños, desenfoques y velocidades distintas.
export const Particles: React.FC<{ count?: number; color?: string; seed?: string }> = ({
  count = 46,
  color = "255,255,255",
  seed = "dust",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {new Array(count).fill(0).map((_, i) => {
        const depth = random(`${seed}-d-${i}`);
        const size = 3 + depth * 16;
        const speed = 0.3 + depth * 1.4;
        const x = random(`${seed}-x-${i}`) * width + Math.sin(frame / 40 + i) * 14 * depth;
        const y = (((random(`${seed}-y-${i}`) * height - frame * speed) % height) + height) % height;
        const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(frame / (18 + i % 7) + i));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: size,
              background: `rgba(${color},${0.12 + depth * 0.4})`,
              filter: `blur(${(1 - depth) * 2 + (depth > 0.8 ? 3 : 0)}px)`,
              opacity: twinkle,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Ondas concéntricas del lector NFC.
export const Ripples: React.FC<{ at: number; x: number; y: number; color?: string; rings?: number }> = ({
  at,
  x,
  y,
  color = COLORS.blue,
  rings = 4,
}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {new Array(rings).fill(0).map((_, i) => {
        const t = frame - at - i * 6;
        if (t < 0) return null;
        const p = interpolate(t, [0, 34], [0, 1], { ...clamp, easing: EASE_OUT });
        const size = 60 + p * 560;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              border: `${6 - p * 4}px solid ${color}`,
              boxShadow: `0 0 40px ${color}`,
              opacity: 1 - p,
            }}
          />
        );
      })}
    </>
  );
};

// Confeti determinista con gravedad, rozamiento y giro 3D.
export const Confetti: React.FC<{ at: number; x: number; y: number; count?: number }> = ({ at, x, y, count = 90 }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0) return null;
  return (
    <>
      {new Array(count).fill(0).map((_, i) => {
        const angle = random(`c-a-${i}`) * Math.PI * 2;
        const v = 18 + random(`c-v-${i}`) * 34;
        const drag = Math.pow(0.94, t);
        const dist = (v * (1 - drag)) / 0.06;
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist * 0.8 + 0.5 * 0.9 * t * t * 0.6;
        const w = 12 + random(`c-w-${i}`) * 12;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: px,
              top: py,
              width: w,
              height: w * 0.45,
              background: BRAND_DOTS[i % 4],
              borderRadius: 3,
              transform: `rotate(${t * (6 + random(`c-r-${i}`) * 14)}deg) rotateX(${t * 12 * random(`c-x-${i}`)}deg)`,
              opacity: interpolate(t, [40, 70], [1, 0], clamp),
            }}
          />
        );
      })}
    </>
  );
};

// Grano de película + viñeta: unifica todas las escenas con el mismo "look".
// <Img> (no background-image) para que Remotion espere a que la textura cargue.
export const FilmLook: React.FC = () => {
  const frame = useCurrentFrame();
  const ox = Math.floor(random(`gx-${frame}`) * 120);
  const oy = Math.floor(random(`gy-${frame}`) * 120);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <Img
        src={staticFile("textures/grain.png")}
        style={{ position: "absolute", left: -ox, top: -oy, width: 1208, height: 2048, opacity: 0.07, mixBlendMode: "overlay" }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};

// Texto con separación RGB y cortes horizontales desplazados (glitch digital).
export const GlitchText: React.FC<{
  children: string;
  intensity: number;
  style?: React.CSSProperties;
}> = ({ children, intensity, style }) => {
  const frame = useCurrentFrame();
  const off = intensity * 14;
  const slices = intensity > 0.05 ? 5 : 0;
  const base: React.CSSProperties = { position: "absolute", inset: 0, whiteSpace: "nowrap" };
  return (
    <div style={{ position: "relative", ...style }}>
      <span style={{ visibility: "hidden", whiteSpace: "nowrap" }}>{children}</span>
      <span style={{ ...base, color: "#ff2d55", translate: `${-off}px 0`, mixBlendMode: "screen", opacity: intensity > 0 ? 0.9 : 0 }}>
        {children}
      </span>
      <span style={{ ...base, color: "#00e5ff", translate: `${off}px 0`, mixBlendMode: "screen", opacity: intensity > 0 ? 0.9 : 0 }}>
        {children}
      </span>
      <span style={{ ...base }}>{children}</span>
      {new Array(slices).fill(0).map((_, i) => {
        const top = random(`gl-t-${i}-${Math.floor(frame / 2)}`) * 90;
        const h = 4 + random(`gl-h-${i}-${Math.floor(frame / 2)}`) * 14;
        const dx = (random(`gl-x-${i}-${Math.floor(frame / 2)}`) - 0.5) * 80 * intensity;
        return (
          <span key={i} style={{ ...base, clipPath: `inset(${top}% 0 ${Math.max(0, 100 - top - h)}% 0)`, translate: `${dx}px 0` }}>
            {children}
          </span>
        );
      })}
    </div>
  );
};

// Palabra que entra con muelle, desenfoque y subida.
export const PopWord: React.FC<{
  children: React.ReactNode;
  at: number;
  style?: React.CSSProperties;
}> = ({ children, at, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 13, stiffness: 190, mass: 0.6 } });
  const visible = frame >= at;
  return (
    <span
      style={{
        display: "inline-block",
        opacity: visible ? Math.min(1, s * 1.4) : 0,
        scale: String(0.55 + 0.45 * s),
        translate: `0 ${(1 - s) * 50}px`,
        filter: `blur(${(1 - Math.min(1, s)) * 14}px)`,
        ...style,
      }}
    >
      {children}
    </span>
  );
};

const STAR = makeStar({ points: 5, innerRadius: 21, outerRadius: 50, cornerRadius: 4 });
const STAR_PATH = STAR.path;
const STAR_VIEWBOX = `-5 -5 ${STAR.width + 10} ${STAR.height + 10}`;

// Estrella que se rellena con "pop" y lanza destellos.
export const BurstStar: React.FC<{ at: number; size: number }> = ({ at, size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const on = frame >= at;
  const s = spring({ frame: frame - at, fps, config: { damping: 8, stiffness: 260 } });
  const t = frame - at;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={STAR_VIEWBOX} style={{ position: "absolute", scale: String(on ? 0.7 + 0.3 * s : 1) }}>
        <path d={STAR_PATH} fill={on ? COLORS.gold : "transparent"} stroke={on ? COLORS.gold : "#c9ced8"} strokeWidth={5} strokeLinejoin="round" />
      </svg>
      {on && t < 18
        ? new Array(8).fill(0).map((_, i) => {
            const a = (i / 8) * Math.PI * 2;
            const p = interpolate(t, [0, 16], [0, 1], { ...clamp, easing: EASE_OUT });
            const r = size * (0.45 + p * 0.55);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: size / 2 + Math.cos(a) * r - 4,
                  top: size / 2 + Math.sin(a) * r - 4,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: COLORS.gold,
                  opacity: 1 - p,
                }}
              />
            );
          })
        : null}
    </div>
  );
};

// Notificación estilo "glass" que cae desde arriba.
export const Notification: React.FC<{
  at: number;
  title: string;
  body: string;
  style?: React.CSSProperties;
}> = ({ at, title, body, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 15, stiffness: 170 } });
  if (frame < at) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        display: "flex",
        gap: 24,
        alignItems: "center",
        padding: "26px 30px",
        borderRadius: 38,
        background: "rgba(255,255,255,0.14)",
        border: "1.5px solid rgba(255,255,255,0.22)",
        backdropFilter: "blur(24px)",
        boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
        translate: `0 ${(1 - s) * -160}px`,
        opacity: s,
        fontFamily: SANS,
        ...style,
      }}
    >
      <div
        style={{
          width: 84,
          height: 84,
          borderRadius: 22,
          background: `linear-gradient(135deg, ${COLORS.gold}, #ff9d00)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width={50} height={50} viewBox={STAR_VIEWBOX}>
          <path d={STAR_PATH} fill="white" />
        </svg>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "white", fontWeight: 800, fontSize: 34 }}>{title}</div>
        <div style={{ color: "rgba(255,255,255,0.78)", fontWeight: 400, fontSize: 30, marginTop: 4 }}>{body}</div>
      </div>
      <div style={{ marginLeft: "auto", alignSelf: "flex-start", color: "rgba(255,255,255,0.55)", fontSize: 24, fontWeight: 600 }}>ahora</div>
    </div>
  );
};

// Light leak WebGL para los cortes importantes.
export const LightLeakOverlay: React.FC<{ seed?: number; hueShift?: number }> = ({ seed = 0, hueShift = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  return (
    <Solid
      width={width}
      height={height}
      style={{ mixBlendMode: "screen" }}
      effects={[
        lightLeak({
          seed,
          hueShift,
          progress: interpolate(frame, [0, durationInFrames - 1], [0, 1], clamp),
        }),
      ]}
    />
  );
};
