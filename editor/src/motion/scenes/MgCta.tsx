import type React from "react";
import { AbsoluteFill, Img, Interactive, interpolate, staticFile, useCurrentFrame, useVideoConfig, type InteractivitySchema } from "remotion";
import { MaskLine } from "../../components/Typo";
import { SANS } from "../../fonts";
import { Burst, CardFace, CornerWaves, EASE_IN, Sparkle, bounce } from "../kit";
import { BANDS, LOGO_MARK, MG, mgCues } from "../theme";
import { DOTS } from "./MgBenefits";

type Props = {
  readonly line1: string;
  readonly line2: string;
  readonly brand: string;
  readonly button: string;
  readonly style?: React.CSSProperties;
};

const c = mgCues.cta;
const CARD_Y = 640;
const CARD = 500;

const MgCtaInner: React.FC<Props> = ({ line1, line2, brand, button, style }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const cx = width / 2;

  // Los cuatro puntos giran cada vez más rápido y se funden en la tarjeta.
  const t = Math.min(1, frame / c.merge);
  const orbitCx = cx;
  const orbitCy = interpolate(t, [0, 1], [960, CARD_Y], { easing: EASE_IN });
  const radius = interpolate(t, [0, 1], [99, 0], { easing: EASE_IN });
  const spin = Math.PI * 3 * t * t;
  const card = bounce(frame, fps, c.card, { damping: 10, stiffness: 150 });
  const logo = bounce(frame, fps, c.logo, { damping: 11 });
  const btn = bounce(frame, fps, c.button, { damping: 9, stiffness: 170 });
  const pulse = c.pulses.reduce((acc, at) => {
    const k = frame - at;
    return acc + (k >= 0 && k < 10 ? Math.sin((k / 10) * Math.PI) * 0.06 : 0);
  }, 0);
  const corners = bounce(frame, fps, 30, { damping: 15 });

  return (
    <AbsoluteFill style={{ backgroundColor: MG.paper, overflow: "hidden", ...style }}>
      <CornerWaves corner="tl" size={250} grow={corners} phase={frame} colors={[MG.red, MG.yellow]} />
      <CornerWaves corner="tr" size={280} grow={corners} phase={frame + 30} colors={[MG.blue, MG.green, MG.yellow, MG.red]} />
      <CornerWaves corner="bl" size={300} grow={corners} phase={frame + 60} colors={[MG.blue, MG.green, MG.yellow, MG.red]} />
      <CornerWaves corner="br" size={260} grow={corners} phase={frame + 90} colors={[MG.green, MG.blue]} />

      {frame < c.merge + 2
        ? DOTS.map(([dx, dy], k) => {
            const a0 = Math.atan2(dy - 960, dx - cx);
            const x = orbitCx + Math.cos(a0 + spin) * radius;
            const y = orbitCy + Math.sin(a0 + spin) * radius;
            const s = interpolate(t, [0, 1], [80, 50]);
            return <div key={BANDS[k]} style={{ position: "absolute", left: x - s / 2, top: y - s / 2, width: s, height: s, borderRadius: s / 2, background: [MG.green, MG.blue, MG.red, MG.yellow][k] }} />;
          })
        : null}
      <Burst at={c.merge} x={cx} y={CARD_Y} radius={420} count={16} thickness={16} seed="cta" />

      <div
        style={{
          position: "absolute",
          left: cx - CARD / 2,
          top: CARD_Y - CARD / 2,
          width: CARD,
          height: CARD,
          scale: String(card),
          rotate: `${(1 - card) * 30 + Math.sin(frame / 22) * 1.6}deg`,
        }}
      >
        <CardFace size={CARD} style={{ left: 0, top: 0 }} />
      </div>
      <Sparkle at={44} x={cx + 290} y={CARD_Y - 230} size={50} color={MG.yellow} />
      <Sparkle at={60} x={cx - 300} y={CARD_Y + 200} size={40} color={MG.blue} />
      <Sparkle at={130} x={cx + 300} y={CARD_Y + 220} size={36} color={MG.green} />

      <div
        style={{
          position: "absolute",
          top: 980,
          left: 80,
          right: 80,
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 134,
          lineHeight: 1.02,
          letterSpacing: -5,
          color: MG.ink,
        }}
      >
        <MaskLine at={c.line1}>{line1}</MaskLine>
        <MaskLine at={c.line2}>
          <span style={{ background: `linear-gradient(100deg, ${MG.tealA}, ${MG.tealB})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{line2}</span>
        </MaskLine>
      </div>

      <div
        style={{
          position: "absolute",
          top: 1330,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 22,
          scale: String(logo),
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 66,
          letterSpacing: -2,
          color: MG.ink,
        }}
      >
        <Img src={staticFile(LOGO_MARK)} style={{ width: 120, height: "auto" }} />
        {brand}
      </div>

      <div style={{ position: "absolute", top: 1530, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative", scale: String(btn * (1 + pulse)) }}>
          {c.pulses.map((at) => {
            const k = (frame - at) / 22;
            if (k < 0 || k > 1) return null;
            return (
              <div
                key={at}
                style={{
                  position: "absolute",
                  inset: -10 - k * 46,
                  borderRadius: 999,
                  border: `${6 * (1 - k) + 1}px solid ${MG.tealA}`,
                  opacity: 1 - k,
                }}
              />
            );
          })}
          <div
            style={{
              padding: "34px 70px",
              borderRadius: 999,
              background: MG.ink,
              color: MG.paper,
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 58,
              letterSpacing: -1.5,
              whiteSpace: "nowrap",
            }}
          >
            {button}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const schema = {
  line1: { type: "text-content", default: "Un toque.", description: "Línea 1" },
  line2: { type: "text-content", default: "Una reseña.", description: "Línea 2" },
  brand: { type: "text-content", default: "Cierzo NFC", description: "Marca" },
  button: { type: "text-content", default: "Pide la tuya", description: "Botón" },
} as const satisfies InteractivitySchema;

export const MgCta = Interactive.withSchema({ Component: MgCtaInner, componentName: "<MgCta>", schema, wrapInSequence: true });
