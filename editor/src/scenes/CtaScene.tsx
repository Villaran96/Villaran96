import { starburst } from "@remotion/effects/starburst";
import type React from "react";
import {
  AbsoluteFill,
  Img,
  Interactive,
  interpolate,
  Solid,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { Particles } from "../components/Fx";
import { EASE_IN_OUT, float, progress } from "../components/motion";
import { MaskLine } from "../components/Typo";
import { CameraRig, CardModel, GL_PROPS, StudioEnvironment, StudioFloor, StudioLights } from "../three/stage";
import { ThreeCanvas } from "@remotion/three";
import { SANS, SERIF } from "../fonts";
import { COLORS, cues } from "../theme";

type Props = {
  readonly headline: string;
  readonly headlineAccent: string;
  readonly cta: string;
  readonly small: string;
  readonly logo: string;
  readonly frontImage?: string;
  readonly style?: React.CSSProperties;
};

const c = cues.cta;
const FLOOR = -0.5;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const CtaSceneInner: React.FC<Props> = ({ headline, headlineAccent, cta, small, logo, frontImage, style }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // La tarjeta baja girando una vuelta completa, aterriza con un rebote suave y luego se mece.
  const spinAt = (fr: number) => interpolate(progress(fr, 0, c.spinEnd, EASE_IN_OUT), [0, 1], [-Math.PI * 2, 0]);
  const sway = frame > c.spinEnd ? Math.sin((frame - c.spinEnd) / 26) * 0.16 * progress(frame, c.spinEnd, c.spinEnd + 30) : 0;
  const rotY = spinAt(frame) + sway;
  const spinBlur = Math.min(2.2, Math.abs(spinAt(frame) - spinAt(Math.max(0, frame - 1))) * 9);
  const land = spring({ frame, fps, config: { damping: 12, stiffness: 70 } });
  const cardY = interpolate(land, [0, 1], [1.5, 0]);
  const f = float(frame, "cta", 6);
  const logoIn = spring({ frame: frame - c.logo, fps, config: { damping: 16, stiffness: 140 } });

  const button = spring({ frame: frame - c.button, fps, config: { damping: 11, stiffness: 160 } });
  const pulse = frame > c.button ? ((frame - c.button) % 30) / 30 : 0;
  const btnShine = frame > c.button ? (((frame - c.button) % 45) / 45) * 260 - 80 : -80;
  const smallIn = progress(frame, c.button + 10, c.button + 24);
  const arrowBob = Math.sin(frame / 5) * 8;
  const fade = interpolate(frame, [c.fadeOut, 210], [0, 1], clamp);
  const sparkle = progress(frame, c.chime, c.chime + 22);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink, ...style }}>
      <Solid
        width={width}
        height={height}
        style={{ opacity: 0.5 }}
        effects={[starburst({ rays: 36, colors: ["#120d02", "#1f1606"], rotation: frame * 0.4, smoothness: 0.6 })]}
      />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 40% at 50% 30%, rgba(255,197,49,0.28), transparent 70%)" }} />
      <Particles count={44} seed="cta" color="255,215,120" />

      <AbsoluteFill style={{ filter: spinBlur > 0.2 ? `blur(${spinBlur}px)` : undefined }}>
        <ThreeCanvas width={width} height={height} shadows gl={GL_PROPS}>
          <CameraRig position={[f.x * 0.002, 0.45, 6.3]} target={[0, -0.8, 0]} fov={30} />
          <StudioEnvironment intensity={1.1} />
          <StudioLights rimAngle={frame / 30} rim={1.1} keyIntensity={2.6} />
          <StudioFloor y={FLOOR} shadowOpacity={0.5 * land} />
          <CardModel image={frontImage} position={[0, cardY + 0.004, 0]} rotation={[0.02, rotY, 0]} reflection={{ floorY: FLOOR, opacity: 0.32, fade: 0.5 }} />
        </ThreeCanvas>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 420, textAlign: "center" }}>
        <MaskLine at={c.headline}>
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 120, color: "white", letterSpacing: -3, lineHeight: 1 }}>{headline}</div>
        </MaskLine>
        <MaskLine at={c.headline + 8}>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 118, color: COLORS.gold, lineHeight: 1.1 }}>{headlineAccent}</div>
        </MaskLine>
        <div style={{ position: "relative", marginTop: 60 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 999,
              border: `4px solid ${COLORS.gold}`,
              scale: String(1 + pulse * 0.35),
              opacity: frame > c.button ? (1 - pulse) * 0.8 : 0,
            }}
          />
          {new Array(10).fill(0).map((_, i) => {
            const a = (i / 10) * Math.PI * 2;
            const r = 220 + sparkle * 160;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  background: COLORS.gold,
                  translate: `${Math.cos(a) * r - 6}px ${Math.sin(a) * r * 0.45 - 6}px`,
                  opacity: sparkle > 0 && sparkle < 1 ? 1 - sparkle : 0,
                }}
              />
            );
          })}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              padding: "34px 80px",
              borderRadius: 999,
              background: "white",
              color: "#111",
              fontFamily: SANS,
              fontWeight: 900,
              fontSize: 60,
              scale: String(button),
              boxShadow: "0 20px 60px rgba(255,197,49,0.45)",
            }}
          >
            {cta}
            <div style={{ position: "absolute", top: 0, bottom: 0, left: `${btnShine}%`, width: "30%", background: "linear-gradient(100deg, transparent, rgba(255,197,49,0.55), transparent)" }} />
          </div>
        </div>
        <div style={{ marginTop: 44, fontFamily: SANS, fontWeight: 600, fontSize: 44, color: COLORS.mist, opacity: smallIn, display: "flex", alignItems: "center", gap: 16 }}>
          {small}
          <span style={{ display: "inline-block", translate: `0 ${arrowBob}px`, color: COLORS.gold }}>↓</span>
        </div>
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          bottom: 130,
          left: "50%",
          translate: `-50% ${(1 - logoIn) * 40}px`,
          opacity: logoIn,
          padding: "14px 34px",
          borderRadius: 30,
          background: "white",
          boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Img src={staticFile(logo)} style={{ height: 150 }} />
      </div>
      <AbsoluteFill style={{ background: "black", opacity: fade }} />
    </AbsoluteFill>
  );
};

const ctaSchema = {
  headline: { type: "text-content", default: "Más reseñas,", description: "Titular" },
  headlineAccent: { type: "text-content", default: "en un solo toque.", description: "Titular (acento)" },
  cta: { type: "text-content", default: "Pide la tuya →", description: "Botón" },
  small: { type: "text-content", default: "Link en la bio", description: "Texto pequeño" },
  logo: { type: "asset", default: "tarjetas/logo-cierzo.png", description: "Logo de la marca" },
  frontImage: { type: "asset", default: undefined, description: "Foto real de la tarjeta (opcional)" },
} as const satisfies InteractivitySchema;

export const CtaScene = Interactive.withSchema({
  Component: CtaSceneInner,
  componentName: "<CtaScene>",
  schema: ctaSchema,
  wrapInSequence: true,
});
