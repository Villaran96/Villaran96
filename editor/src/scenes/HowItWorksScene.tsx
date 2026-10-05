import { evolvePath } from "@remotion/paths";
import type React from "react";
import {
  AbsoluteFill,
  Interactive,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { BurstStar, Confetti, Particles, Ripples } from "../components/Fx";
import { EASE_IN_OUT, EASE_OUT, progress, shake } from "../components/motion";
import { CardShadow, NfcCard } from "../components/NfcCard";
import { Phone, PHONE_H, PHONE_W } from "../components/Phone";
import { SANS, SERIF } from "../fonts";
import { COLORS, cues } from "../theme";

type Props = {
  readonly step1: string;
  readonly step2: string;
  readonly step3: string;
  readonly businessName: string;
  readonly reviewText: string;
  readonly frontImage?: string;
  readonly style?: React.CSSProperties;
};

const c = cues.how;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const CHECK = "M 40 105 L 85 150 L 165 60";

const StepHeader: React.FC<{ labels: string[] }> = ({ labels }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const active = c.steps.filter((s) => frame >= s).length - 1;
  return (
    <div style={{ position: "absolute", top: 150, left: 90, right: 90, fontFamily: SANS }}>
      <div style={{ display: "flex", gap: 14 }}>
        {c.steps.map((start, i) => {
          const end = c.steps[i + 1] ?? 270;
          const fill = interpolate(frame, [start, end - 6], [0, 1], clamp);
          return (
            <div key={i} style={{ flex: 1, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
              <div style={{ width: `${fill * 100}%`, height: "100%", background: COLORS.blue, borderRadius: 5 }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "relative", height: 300, marginTop: 36, overflow: "hidden" }}>
        {labels.map((label, i) => {
          const inS = spring({ frame: frame - c.steps[i], fps, config: { damping: 16, stiffness: 160 } });
          const next = c.steps[i + 1];
          const outS = next === undefined ? 0 : spring({ frame: frame - next, fps, config: { damping: 16, stiffness: 160 } });
          if (i > active + 0 && frame < c.steps[i]) return null;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                translate: `0 ${(1 - inS) * 120 - outS * 160}px`,
                opacity: inS * (1 - outS),
              }}
            >
              <div style={{ color: COLORS.blue, fontWeight: 800, fontSize: 40, letterSpacing: 4 }}>PASO 0{i + 1}</div>
              <div style={{ color: "white", fontWeight: 900, fontSize: 92, letterSpacing: -2, lineHeight: 1.02, marginTop: 6 }}>{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LockScreen: React.FC<{ businessName: string }> = ({ businessName }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sheet = spring({ frame: frame - c.sheet, fps, config: { damping: 15, stiffness: 150 } });
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #3b5bdb 0%, #7048e8 45%, #1c1f3a 100%)", fontFamily: SANS }}>
      <div style={{ marginTop: 120, textAlign: "center", color: "white" }}>
        <div style={{ fontSize: 28, fontWeight: 600, opacity: 0.8 }}>lunes, 5 de octubre</div>
        <div style={{ fontSize: 132, fontWeight: 600, letterSpacing: -4, lineHeight: 1 }}>9:41</div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 16,
          borderRadius: 44,
          background: "rgba(255,255,255,0.96)",
          padding: "30px 28px 26px",
          translate: `0 ${(1 - sheet) * 420}px`,
          boxShadow: "0 -20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 70, height: 70, borderRadius: 20, background: COLORS.blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={44} height={44} viewBox="0 0 64 64" fill="none" stroke="white" strokeWidth={5} strokeLinecap="round">
              <path d="M22 22c6 6 6 14 0 20" />
              <path d="M32 14c10 10 10 26 0 36" />
              <path d="M42 8c14 14 14 34 0 48" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#111" }}>Etiqueta NFC detectada</div>
            <div style={{ fontSize: 24, color: "#666", marginTop: 2 }}>Reseña · {businessName}</div>
          </div>
        </div>
        <div style={{ marginTop: 26, borderRadius: 22, background: COLORS.blue, color: "white", textAlign: "center", padding: "20px 0", fontSize: 30, fontWeight: 800 }}>
          Abrir
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ReviewScreen: React.FC<{ businessName: string; reviewText: string }> = ({ businessName, reviewText }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const typeStart = c.stars[4] + 8;
  const chars = Math.floor(interpolate(frame, [typeStart, c.send - 4], [0, reviewText.length], clamp));
  const caret = Math.floor(frame / 8) % 2 === 0;
  const press = frame >= c.send ? 1 - Math.sin(spring({ frame: frame - c.send, fps, config: { damping: 12 } }) * Math.PI) * 0.08 : 1;
  const initials = businessName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
  return (
    <AbsoluteFill style={{ background: "#f7f8fb", fontFamily: SANS, padding: "86px 30px 30px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 76, height: 76, borderRadius: 38, background: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.green})`, color: "white", fontWeight: 900, fontSize: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#111", textTransform: "capitalize" }}>{businessName.toLowerCase()}</div>
          <div style={{ fontSize: 22, color: "#777" }}>Publicando de forma pública</div>
        </div>
      </div>
      <div style={{ marginTop: 50, fontSize: 38, fontWeight: 800, color: "#111" }}>Valora tu experiencia</div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 26, padding: "0 6px" }}>
        {c.stars.map((at) => (
          <BurstStar key={at} at={at} size={62} />
        ))}
      </div>
      <div style={{ marginTop: 40, minHeight: 200, borderRadius: 24, border: "2px solid #dde1ea", background: "white", padding: 24, fontSize: 30, color: "#222", lineHeight: 1.35 }}>
        {chars > 0 ? reviewText.slice(0, chars) : <span style={{ color: "#aab" }}>Comparte detalles de tu experiencia</span>}
        {chars > 0 && frame < c.send ? <span style={{ opacity: caret ? 1 : 0, color: COLORS.blue }}>|</span> : null}
      </div>
      <div
        style={{
          position: "absolute",
          left: 30,
          right: 30,
          bottom: 40,
          borderRadius: 28,
          background: COLORS.blue,
          color: "white",
          textAlign: "center",
          padding: "26px 0",
          fontSize: 34,
          fontWeight: 800,
          scale: String(press),
          boxShadow: "0 16px 30px rgba(66,133,244,0.35)",
        }}
      >
        Publicar
      </div>
    </AbsoluteFill>
  );
};

const SuccessScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - c.check, fps, config: { damping: 10, stiffness: 180 } });
  const draw = evolvePath(progress(frame, c.check + 4, c.check + 18), CHECK);
  const txt = progress(frame, c.check + 12, c.check + 26);
  return (
    <AbsoluteFill style={{ background: "#f7f8fb", alignItems: "center", justifyContent: "center", fontFamily: SANS }}>
      <div style={{ width: 210, height: 210, borderRadius: 105, background: COLORS.green, scale: String(pop), display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 ${pop * 26}px rgba(52,168,83,0.18)` }}>
        <svg width={200} height={200} viewBox="0 0 200 200">
          <path d={CHECK} stroke="white" strokeWidth={20} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={draw.strokeDasharray} strokeDashoffset={draw.strokeDashoffset} />
        </svg>
      </div>
      <div style={{ marginTop: 50, fontSize: 40, fontWeight: 900, color: "#111", textAlign: "center", whiteSpace: "nowrap", opacity: txt, translate: `0 ${(1 - txt) * 20}px` }}>¡Reseña publicada!</div>
      <div style={{ marginTop: 10, fontFamily: SERIF, fontStyle: "italic", fontSize: 38, color: "#666", opacity: txt }}>Gracias por tu opinión</div>
    </AbsoluteFill>
  );
};

const HowItWorksSceneInner: React.FC<Props> = ({ step1, step2, step3, businessName, reviewText, frontImage, style }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  // Paso 1: el móvil baja hasta la tarjeta y "toca".
  const descend = spring({ frame: frame - c.phoneIn, fps, config: { damping: 18, stiffness: 90 } });
  const tapDip = frame >= c.tap - 6 ? Math.sin(progress(frame, c.tap - 6, c.tap + 8, EASE_IN_OUT) * Math.PI) * 60 : 0;
  // Paso 2: la cámara se acerca al móvil y la tarjeta se desenfoca (profundidad de campo).
  const focus = progress(frame, c.open - 6, c.open + 16, EASE_IN_OUT);
  const phoneY = interpolate(descend, [0, 1], [-1300, 640]) + tapDip + focus * 50;
  const phoneScale = 0.82 + focus * 0.32;
  const phoneRot = interpolate(descend, [0, 1], [-18, -6]) * (1 - focus);
  const haptic = shake(frame, c.tap, 10, "haptic");

  const lockOpacity = interpolate(frame, [c.open - 4, c.open + 6], [1, 0], clamp);
  const successIn = progress(frame, c.check - 6, c.check + 2);
  const cardOut = focus;

  const tapX = width / 2;
  const tapY = 1300;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.night, background: `radial-gradient(circle at 50% 70%, #1a2a55 0%, ${COLORS.night} 65%)`, ...style }}>
      <Particles count={28} seed="how" />

      {/* Tarjeta tumbada sobre la "mesa" */}
      <AbsoluteFill
        style={{
          perspective: 1600,
          top: 560,
          opacity: 1 - cardOut * 0.7,
          filter: `blur(${cardOut * 16}px)`,
          translate: `0 ${cardOut * 160}px`,
        }}
      >
        <CardShadow lift={0.05} y={150} />
        <NfcCard rotateX={58} rotateZ={-4} businessName={businessName} frontImage={frontImage} shine={progress(frame, c.tap, c.tap + 30)} />
      </AbsoluteFill>

      <Ripples at={c.tap} x={tapX} y={tapY} />

      <div
        style={{
          position: "absolute",
          left: width / 2 - PHONE_W / 2,
          top: phoneY - PHONE_H / 2 + 400,
          width: PHONE_W,
          height: PHONE_H,
          scale: String(phoneScale),
          rotate: `${phoneRot + haptic.r}deg`,
          translate: `${haptic.x}px ${haptic.y}px`,
        }}
      >
        <Phone style={{ left: 0, top: 0 }}>
          <AbsoluteFill>
            <ReviewScreen businessName={businessName} reviewText={reviewText} />
          </AbsoluteFill>
          <AbsoluteFill style={{ opacity: successIn }}>
            <SuccessScreen />
          </AbsoluteFill>
          <AbsoluteFill style={{ opacity: lockOpacity, scale: String(1 + (1 - lockOpacity) * 0.08) }}>
            <LockScreen businessName={businessName} />
          </AbsoluteFill>
        </Phone>
      </div>

      <Confetti at={c.confetti} x={width / 2} y={1000} />
      <StepHeader labels={[step1, step2, step3]} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% ${tapY}px, rgba(66,133,244,0.5), transparent 45%)`,
          opacity: interpolate(frame, [c.tap, c.tap + 3, c.tap + 20], [0, 1, 0], { ...clamp, easing: EASE_OUT }),
        }}
      />
    </AbsoluteFill>
  );
};

const howSchema = {
  step1: { type: "text-content", default: "Acerca el móvil", description: "Paso 1" },
  step2: { type: "text-content", default: "Valora en 5 estrellas", description: "Paso 2" },
  step3: { type: "text-content", default: "Publicada al instante", description: "Paso 3" },
  businessName: { type: "text-content", default: "TU NEGOCIO", description: "Nombre del negocio" },
  reviewText: { type: "text-content", default: "¡Servicio de 10! Volveremos seguro.", description: "Texto de la reseña" },
  frontImage: { type: "asset", default: undefined, description: "Foto real de la tarjeta (opcional)" },
} as const satisfies InteractivitySchema;

export const HowItWorksScene = Interactive.withSchema({
  Component: HowItWorksSceneInner,
  componentName: "<HowItWorksScene>",
  schema: howSchema,
  wrapInSequence: true,
});
