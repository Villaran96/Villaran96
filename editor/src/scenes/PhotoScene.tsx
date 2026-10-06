import type React from "react";
import {
  AbsoluteFill,
  Img,
  Interactive,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { EASE_IN_OUT, EASE_OUT, progress } from "../components/motion";
import { SANS, SERIF } from "../fonts";
import { COLORS, cues } from "../theme";

type Props = {
  readonly photo: string;
  readonly tag: string;
  readonly title: string;
  readonly sub: string;
  readonly style?: React.CSSProperties;
};

const c = cues.photo;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
// Zona de la tarjeta dentro de la foto (en coordenadas del lienzo 1080×1920).
const CARD_BOX = { left: 58, top: 500, right: 1038, bottom: 1466 };

const Corner: React.FC<{ x: number; y: number; flipX: boolean; flipY: boolean; draw: number }> = ({ x, y, flipX, flipY, draw }) => (
  <svg
    width={110}
    height={110}
    viewBox="0 0 110 110"
    style={{ position: "absolute", left: x - (flipX ? 110 : 0), top: y - (flipY ? 110 : 0), scale: `${flipX ? -1 : 1} ${flipY ? -1 : 1}`, overflow: "visible" }}
  >
    <path d="M 4 106 L 4 4 L 106 4" stroke="white" strokeWidth={8} fill="none" strokeLinecap="round" strokeDasharray={204} strokeDashoffset={204 * (1 - draw)} style={{ filter: "drop-shadow(0 0 10px rgba(0,0,0,0.5))" }} />
  </svg>
);

const PhotoSceneInner: React.FC<Props> = ({ photo, tag, title, sub, style }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Ken Burns lento con una ligera inclinación 3D (paralaje de "cámara en mano" muy suave).
  const t = interpolate(frame, [0, durationInFrames], [0, 1], { ...clamp, easing: EASE_IN_OUT });
  const scale = interpolate(t, [0, 1], [1.12, 1.05]);
  const rotY = interpolate(t, [0, 1], [5, -3]);
  const rotX = interpolate(t, [0, 1], [2.5, -0.5]);
  const tx = interpolate(t, [0, 1], [-14, 10]);
  const ty = interpolate(t, [0, 1], [-50, -70]);

  const brackets = progress(frame, c.tag + 4, c.tag + 22, EASE_OUT);
  const bracketScale = 1.08 - brackets * 0.08;
  const glare = interpolate(frame, [26, 86], [-40, 140], { ...clamp, easing: EASE_IN_OUT });
  const tagIn = spring({ frame: frame - c.tag, fps, config: { damping: 16 } });
  const titleIn = spring({ frame: frame - c.title, fps, config: { damping: 15, stiffness: 150 } });
  const subIn = progress(frame, c.sub, c.sub + 16);
  const rec = Math.floor(frame / 12) % 2 === 0 ? 1 : 0.25;

  return (
    <AbsoluteFill style={{ backgroundColor: "black", perspective: 1600, ...style }}>
      <AbsoluteFill style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale}) rotateY(${rotY}deg) rotateX(${rotX}deg)` }}>
        <Img src={staticFile(photo)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <AbsoluteFill style={{ background: `linear-gradient(105deg, transparent ${glare - 15}%, rgba(255,255,255,0.22) ${glare}%, transparent ${glare + 15}%)`, mixBlendMode: "screen" }} />
        <div style={{ position: "absolute", inset: 0, scale: String(bracketScale), opacity: brackets }}>
          <Corner x={CARD_BOX.left} y={CARD_BOX.top} flipX={false} flipY={false} draw={brackets} />
          <Corner x={CARD_BOX.right} y={CARD_BOX.top} flipX flipY={false} draw={brackets} />
          <Corner x={CARD_BOX.left} y={CARD_BOX.bottom} flipX={false} flipY draw={brackets} />
          <Corner x={CARD_BOX.right} y={CARD_BOX.bottom} flipX flipY draw={brackets} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 18%, transparent 62%, rgba(0,0,0,0.85) 100%)" }} />

      <div
        style={{
          position: "absolute",
          top: 130,
          left: "50%",
          translate: `-50% ${(1 - tagIn) * -40}px`,
          opacity: tagIn,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 30px",
          borderRadius: 999,
          background: "rgba(0,0,0,0.55)",
          border: "1.5px solid rgba(255,255,255,0.25)",
          backdropFilter: "blur(14px)",
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 34,
          letterSpacing: 4,
          color: "white",
        }}
      >
        <div style={{ width: 18, height: 18, borderRadius: 9, background: COLORS.red, opacity: rec, boxShadow: `0 0 14px ${COLORS.red}` }} />
        {tag}
      </div>

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 190, textAlign: "center" }}>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 150, color: "white", lineHeight: 1, opacity: titleIn, translate: `0 ${(1 - titleIn) * 60}px`, filter: `blur(${(1 - titleIn) * 10}px)` }}>
          {title}
        </div>
        <div style={{ marginTop: 20, fontFamily: SANS, fontWeight: 600, fontSize: 44, color: COLORS.mist, opacity: subIn }}>{sub}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const photoSchema = {
  photo: { type: "asset", default: "tarjetas/foto-real-hd.jpg", description: "Foto real del producto" },
  tag: { type: "text-content", default: "FOTO REAL", description: "Etiqueta" },
  title: { type: "text-content", default: "Así de real.", description: "Titular" },
  sub: { type: "text-content", default: "Producto real, sin renders", description: "Texto" },
} as const satisfies InteractivitySchema;

export const PhotoScene = Interactive.withSchema({
  Component: PhotoSceneInner,
  componentName: "<PhotoScene>",
  schema: photoSchema,
  wrapInSequence: true,
});
