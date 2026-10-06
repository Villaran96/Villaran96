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
import { EASE_IN_OUT, EASE_OUT, progress } from "../components/motion";
import { CARD_SIZE, CardShadow, FloorReflection, NfcCard } from "../components/NfcCard";
import { SANS, SERIF } from "../fonts";
import { COLORS, cues } from "../theme";

type Props = {
  readonly title: string;
  readonly titleAccent: string;
  readonly subtitle: string;
  readonly frontImage?: string;
  readonly style?: React.CSSProperties;
};

const c = cues.reveal;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const REVEAL_END_POSE = { y: 760, scale: 1.12, rotX: 6, rotY: 0 };

// Pose de la tarjeta en cada fotograma: entra de canto, vaivén lento y se asienta de frente.
export const revealPose = (frame: number) => {
  const turn = progress(frame, c.impact, c.turnEnd, EASE_OUT);
  const sway = progress(frame, c.turnEnd, c.settleStart, EASE_IN_OUT);
  const settle = progress(frame, c.settleStart, 180, EASE_IN_OUT);
  const rotY = interpolate(turn, [0, 1], [-95, -28]) + sway * 44 + settle * -16;
  const rotX = interpolate(turn, [0, 1], [16, 8]) - sway * 3 + settle * 1;
  const scale = interpolate(turn, [0, 1], [0.72, 1]) + sway * 0.06 + settle * 0.06;
  const y = interpolate(turn, [0, 1], [140, 0]);
  const shine = interpolate(turn, [0, 1], [0, 0.9]) + progress(frame, 128, 172, EASE_IN_OUT) * 1.1;
  return { rotY, rotX, scale, y, shine };
};

const Letters: React.FC<{ text: string; at: number; stagger: number }> = ({ text, at, stagger }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <span style={{ display: "inline-flex" }}>
      {text.split("").map((ch, i) => {
        const s = spring({ frame: frame - at - i * stagger, fps, config: { damping: 16, stiffness: 180 } });
        return (
          <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: s, translate: `0 ${(1 - s) * 60}px`, filter: `blur(${(1 - s) * 10}px)` }}>
            {ch}
          </span>
        );
      })}
    </span>
  );
};

const RevealSceneInner: React.FC<Props> = ({ title, titleAccent, subtitle, frontImage, style }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const pose = revealPose(frame);
  const prev = revealPose(Math.max(0, frame - 1));
  // Desenfoque solo cuando la tarjeta gira rápido (motion blur sutil).
  const blur = Math.min(2.5, Math.abs(pose.rotY - prev.rotY) * 0.18);
  const floatY = Math.sin(frame / 34) * 4;

  const flash = interpolate(frame, [0, 10], [0.9, 0], clamp);
  const shock = progress(frame, 0, 30);
  const sub = progress(frame, c.subtitle, c.subtitle + 16);
  const cardCenter = REVEAL_END_POSE.y;
  const mirrorY = cardCenter + (CARD_SIZE / 2) * pose.scale + 40 + pose.y;

  const card = (
    <div style={{ position: "absolute", left: 0, top: 0, width, height: cardCenter * 2, perspective: 2000 }}>
      <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", translate: `0 ${pose.y + floatY}px`, filter: blur > 0.2 ? `blur(${blur}px)` : undefined }}>
        <NfcCard rotateX={pose.rotX} rotateY={pose.rotY} scale={pose.scale} shine={pose.shine} frontImage={frontImage} />
      </div>
    </div>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink, ...style }}>
      <Solid
        width={width}
        height={height}
        style={{ opacity: 0.45 }}
        effects={[starburst({ rays: 28, colors: ["#0a1226", "#0f1c3d"], rotation: frame * 0.25, smoothness: 0.5 })]}
      />
      {/* Estudio: foco cenital y suelo pulido */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 55% 40% at 50% 34%, rgba(140,185,255,0.38), transparent 70%)" }} />
      <AbsoluteFill style={{ top: mirrorY - 10, background: "linear-gradient(180deg, rgba(120,160,230,0.16) 0%, rgba(7,9,13,0) 60%)" }} />
      <Particles count={44} seed="reveal" color="180,210,255" />

      <div
        style={{
          position: "absolute",
          left: width / 2 - 700 * shock,
          top: cardCenter - 700 * shock,
          width: 1400 * shock,
          height: 1400 * shock,
          borderRadius: "50%",
          border: `${10 * (1 - shock)}px solid rgba(255,255,255,0.8)`,
          opacity: 1 - shock,
        }}
      />

      <FloorReflection mirrorY={mirrorY} depth={300} opacity={0.28}>
        {card}
      </FloorReflection>
      <div style={{ position: "absolute", left: 0, top: mirrorY - cardCenter - 30, width, height: cardCenter * 2 }}>
        <CardShadow lift={0.15} y={-20} />
      </div>
      {card}

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 300 }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 124, color: "white", letterSpacing: -3, lineHeight: 1 }}>
          <Letters text={title} at={c.title} stagger={2} />
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 116, color: COLORS.gold, lineHeight: 1.1 }}>
          <Letters text={titleAccent} at={c.title + 12} stagger={2} />
        </div>
        <div style={{ marginTop: 36, display: "flex", alignItems: "center", gap: 24, fontFamily: SANS, fontWeight: 600, fontSize: 46, color: COLORS.mist, opacity: sub }}>
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
  frontImage: { type: "asset", default: undefined, description: "Diseño de la tarjeta (opcional)" },
} as const satisfies InteractivitySchema;

export const RevealScene = Interactive.withSchema({
  Component: RevealSceneInner,
  componentName: "<RevealScene>",
  schema: revealSchema,
  wrapInSequence: true,
});
