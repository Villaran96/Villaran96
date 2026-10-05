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
import { Particles, PopWord } from "../components/Fx";
import { EASE_IN_OUT, float, progress } from "../components/motion";
import { CardShadow, NfcCard } from "../components/NfcCard";
import { SANS, SERIF } from "../fonts";
import { COLORS, cues } from "../theme";

type Props = {
  readonly headline: string;
  readonly headlineAccent: string;
  readonly cta: string;
  readonly small: string;
  readonly businessName: string;
  readonly frontImage?: string;
  readonly style?: React.CSSProperties;
};

const c = cues.cta;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const CtaSceneInner: React.FC<Props> = ({ headline, headlineAccent, cta, small, businessName, frontImage, style }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Giro de 2 vueltas y media que frena hasta quedar de frente.
  const spin = progress(frame, 0, c.spinEnd, EASE_IN_OUT);
  const rotY = interpolate(spin, [0, 1], [-900, 0]);
  const spinSpeed = Math.abs(interpolate(frame, [0, c.spinEnd / 2, c.spinEnd], [0, 1, 0], clamp));
  const rise = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });
  const f = float(frame, "cta", 12);
  const shineCycle = frame > c.spinEnd ? ((frame - c.spinEnd) % 50) / 50 : 0;

  const button = spring({ frame: frame - c.button, fps, config: { damping: 11, stiffness: 160 } });
  const pulse = frame > c.button ? ((frame - c.button) % 30) / 30 : 0;
  const btnShine = frame > c.button ? (((frame - c.button) % 45) / 45) * 260 - 80 : -80;
  const smallIn = progress(frame, c.button + 10, c.button + 24);
  const arrowBob = Math.sin(frame / 5) * 8;
  const fade = interpolate(frame, [c.fadeOut, 180], [0, 1], clamp);
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

      <AbsoluteFill style={{ perspective: 2000, top: -300 }}>
        <CardShadow lift={0.3 + f.y * 0.01} y={300} />
        <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", translate: `${f.x}px ${(1 - rise) * 500 + f.y}px`, filter: `blur(${spinSpeed * 3}px)` }}>
          <NfcCard rotateX={10 + f.r} rotateY={rotY + f.x * 0.4} rotateZ={-4} scale={0.5 + rise * 0.45} shine={shineCycle} businessName={businessName} frontImage={frontImage} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 330, textAlign: "center" }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 120, color: "white", letterSpacing: -3, lineHeight: 1 }}>
          <PopWord at={c.headline}>{headline}</PopWord>
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 118, color: COLORS.gold, lineHeight: 1.1 }}>
          <PopWord at={c.headline + 8}>{headlineAccent}</PopWord>
        </div>
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
      <AbsoluteFill style={{ background: "black", opacity: fade }} />
    </AbsoluteFill>
  );
};

const ctaSchema = {
  headline: { type: "text-content", default: "Más reseñas,", description: "Titular" },
  headlineAccent: { type: "text-content", default: "en un solo toque.", description: "Titular (acento)" },
  cta: { type: "text-content", default: "Pide la tuya →", description: "Botón" },
  small: { type: "text-content", default: "Link en la bio", description: "Texto pequeño" },
  businessName: { type: "text-content", default: "TU NEGOCIO", description: "Nombre en la tarjeta" },
  frontImage: { type: "asset", default: undefined, description: "Foto real de la tarjeta (opcional)" },
} as const satisfies InteractivitySchema;

export const CtaScene = Interactive.withSchema({
  Component: CtaSceneInner,
  componentName: "<CtaScene>",
  schema: ctaSchema,
  wrapInSequence: true,
});
