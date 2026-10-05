import { starburst } from "@remotion/effects/starburst";
import type React from "react";
import {
  AbsoluteFill,
  Interactive,
  interpolate,
  Solid,
  spring,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { Particles } from "../components/Fx";
import { EASE_IN_OUT, float, progress } from "../components/motion";
import { CardShadow, NfcCard } from "../components/NfcCard";
import { SANS, SERIF } from "../fonts";
import { COLORS, cues } from "../theme";

type Props = {
  readonly title: string;
  readonly titleAccent: string;
  readonly subtitle: string;
  readonly businessName: string;
  readonly frontImage?: string;
  readonly style?: React.CSSProperties;
};

const c = cues.reveal;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Letters: React.FC<{ text: string; at: number; stagger: number; style?: React.CSSProperties }> = ({ text, at, stagger, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <span style={{ display: "inline-flex", ...style }}>
      {text.split("").map((ch, i) => {
        const s = spring({ frame: frame - at - i * stagger, fps, config: { damping: 16, stiffness: 180 } });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              opacity: s,
              translate: `0 ${(1 - s) * 60}px`,
              filter: `blur(${(1 - s) * 10}px)`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
};

const RevealSceneInner: React.FC<Props> = ({ title, titleAccent, subtitle, businessName, frontImage, style }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Caída: rápida al principio, frenada con muelle al aterrizar.
  const fall = interpolate(frame, [c.impact, c.cardLand], [0, 1], { ...clamp, easing: (t) => t * t });
  const land = spring({ frame: frame - c.cardLand, fps, config: { damping: 10, stiffness: 200 } });
  const settled = frame >= c.cardLand;
  const y = settled ? (1 - land) * -40 : interpolate(fall, [0, 1], [-1500, 0]);
  const velocity = settled ? 0 : fall * 90;
  const squash = settled ? 1 - Math.sin(land * Math.PI) * 0.06 : 1;
  const f = float(frame, "reveal", 14);
  const sway = interpolate(frame, [c.cardLand, 165], [-22, 10], { ...clamp, easing: EASE_IN_OUT });
  const rotX = settled ? 14 + f.r : interpolate(fall, [0, 1], [75, 14]);
  const rotY = settled ? sway + f.x * 0.3 : interpolate(fall, [0, 1], [-60, -22]);
  const rotZ = settled ? -5 + f.r * 0.5 : interpolate(fall, [0, 1], [-25, -5]);

  const flash = interpolate(frame, [0, 10], [0.9, 0], clamp);
  const shock = progress(frame, 0, 30);
  const shine = progress(frame, c.shine, c.shine + 34, EASE_IN_OUT);
  const sub = progress(frame, c.subtitle, c.subtitle + 16);
  const rays = interpolate(frame, [0, 165], [0, 40]);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink, ...style }}>
      <Solid
        width={width}
        height={height}
        style={{ opacity: 0.55 }}
        effects={[starburst({ rays: 28, colors: ["#0a1226", "#0f1c3d"], rotation: rays, smoothness: 0.5 })]}
      />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 45% at 50% 38%, rgba(120,170,255,0.32), transparent 70%)" }} />
      <Particles count={50} seed="reveal" color="180,210,255" />

      {/* Onda expansiva del impacto */}
      <div
        style={{
          position: "absolute",
          left: width / 2 - 700 * shock,
          top: 760 - 700 * shock,
          width: 1400 * shock,
          height: 1400 * shock,
          borderRadius: "50%",
          border: `${10 * (1 - shock)}px solid rgba(255,255,255,0.8)`,
          opacity: 1 - shock,
        }}
      />

      <AbsoluteFill style={{ perspective: 2200, top: -200 }}>
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id="reveal-mb" x="0" y="-30%" width="100%" height="160%">
            <feGaussianBlur stdDeviation={`0 ${velocity * 0.35}`} />
          </filter>
        </svg>
        <CardShadow lift={settled ? 0.25 + f.y * 0.01 : 1 - fall * 0.75} y={330} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformStyle: "preserve-3d",
            translate: `${f.x}px ${y + f.y}px`,
            filter: velocity > 2 ? "url(#reveal-mb)" : undefined,
          }}
        >
          <NfcCard
            rotateX={rotX}
            rotateY={rotY}
            rotateZ={rotZ}
            scale={squash}
            shine={shine}
            businessName={businessName}
            frontImage={frontImage}
          />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 380 }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 128, color: "white", letterSpacing: -3, lineHeight: 1 }}>
          <Letters text={title} at={c.title} stagger={2} />
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 120, color: COLORS.gold, lineHeight: 1.1 }}>
          <Letters text={titleAccent} at={c.title + 12} stagger={2} />
        </div>
        <div
          style={{
            marginTop: 40,
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 46,
            color: COLORS.mist,
            opacity: sub,
          }}
        >
          <div style={{ width: 90 * sub, height: 3, background: "rgba(255,255,255,0.5)" }} />
          {subtitle}
          <div style={{ width: 90 * sub, height: 3, background: "rgba(255,255,255,0.5)" }} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "white", opacity: flash }} />
    </AbsoluteFill>
  );
};

const revealSchema = {
  title: { type: "text-content", default: "Tarjeta NFC", description: "Título" },
  titleAccent: { type: "text-content", default: "de reseñas", description: "Título (acento)" },
  subtitle: { type: "text-content", default: "Un toque. Una reseña.", description: "Subtítulo" },
  businessName: { type: "text-content", default: "TU NEGOCIO", description: "Nombre en la tarjeta" },
  frontImage: { type: "asset", default: undefined, description: "Foto real de la tarjeta (opcional)" },
} as const satisfies InteractivitySchema;

export const RevealScene = Interactive.withSchema({
  Component: RevealSceneInner,
  componentName: "<RevealScene>",
  schema: revealSchema,
  wrapInSequence: true,
});
