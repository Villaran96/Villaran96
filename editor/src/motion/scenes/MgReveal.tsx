import type React from "react";
import { AbsoluteFill, Interactive, interpolate, useCurrentFrame, useVideoConfig, type InteractivitySchema } from "remotion";
import { MaskLine } from "../../components/Typo";
import { SANS } from "../../fonts";
import { CardFace, CornerWaves, Draw, EASE_IN, EASE_IN_OUT, EASE_OUT, ICONS, Sparkle, bounce, clamp, glide, ramp } from "../kit";
import { BANDS, MG, mgCues } from "../theme";

type Props = {
  readonly title: string;
  readonly accent: string;
  readonly backLabel: string;
  readonly style?: React.CSSProperties;
};

const c = mgCues.reveal;
const CARD = 680;
const CARD_Y = 820;
// Al salir, la tarjeta se queda donde empieza la escena siguiente.
export const HOW_CARD = { x: 540, y: 1370, size: 520, rotate: -6 };

const MgRevealInner: React.FC<Props> = ({ title, accent, backLabel, style }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const cx = width / 2;

  const enter = bounce(frame, fps, c.card, { damping: 10, stiffness: 140 });
  const exit = glide(frame, fps, c.exit, { damping: 20, stiffness: 110 });
  const size = interpolate(exit, [0, 1], [CARD, HOW_CARD.size]);
  const y = interpolate(exit, [0, 1], [CARD_Y, HOW_CARD.y]);
  const rot = (1 - enter) * -24 + exit * HOW_CARD.rotate;

  // Volteo plano: se estrecha, cambia de cara y vuelve a abrirse.
  const flip1 = interpolate(frame, [c.flipOut, c.flipOut + 8, c.flipOut + 16], [1, 0, 1], { ...clamp, easing: EASE_IN_OUT });
  const flip2 = interpolate(frame, [c.flipBack, c.flipBack + 8, c.flipBack + 16], [1, 0, 1], { ...clamp, easing: EASE_IN_OUT });
  const showBack = frame >= c.flipOut + 8 && frame < c.flipBack + 8;
  const flipX = Math.min(flip1, flip2);

  const echoBack = ramp(frame, c.exit, c.exit + 10, EASE_IN);
  const corners = bounce(frame, fps, c.corners, { damping: 15 }) * (1 - ramp(frame, c.exit + 8, c.exit + 28, EASE_IN));
  const iconDraw = ramp(frame, c.flipOut + 10, c.flipOut + 26);

  return (
    <AbsoluteFill style={{ backgroundColor: MG.paper, overflow: "hidden", ...style }}>
      <CornerWaves corner="tl" size={360} grow={corners} phase={frame} colors={[MG.red, MG.yellow]} />
      <CornerWaves corner="tr" size={400} grow={corners} phase={frame + 30} colors={[MG.blue, MG.green, MG.yellow, MG.red]} />
      <CornerWaves corner="bl" size={420} grow={corners} phase={frame + 60} colors={[MG.blue, MG.green, MG.yellow, MG.red]} />

      <div
        style={{
          position: "absolute",
          left: cx - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          scale: `${enter * flipX} ${enter}`,
          rotate: `${rot}deg`,
        }}
      >
        {/* Pila de color detrás de la tarjeta */}
        {[MG.yellow, MG.green, MG.blue].map((color, k) => {
          const out = glide(frame, fps, c.echo[2 - k], { damping: 14, stiffness: 160 }) * (1 - echoBack);
          const off = (3 - k) * 24 * out;
          return (
            <div
              key={color}
              style={{ position: "absolute", left: off, top: off, width: size, height: size, borderRadius: size * 0.06, background: color }}
            />
          );
        })}
        {showBack ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: size * 0.06,
              background: MG.blue,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 30,
            }}
          >
            <svg width={size * 0.42} height={size * 0.42} viewBox="0 0 100 100" style={{ overflow: "visible" }}>
              <circle cx={22} cy={50} r={7 * iconDraw} fill={MG.paper} />
              {ICONS.nfc.map((d, k) => (
                <Draw key={d} d={d} p={ramp(frame, c.flipOut + 10 + k * 4, c.flipOut + 24 + k * 4)} stroke={MG.paper} width={8} />
              ))}
            </svg>
            <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: size * 0.1, color: MG.paper, letterSpacing: -2, opacity: iconDraw }}>{backLabel}</div>
          </div>
        ) : (
          <CardFace size={size} shadow={false} style={{ left: 0, top: 0 }} />
        )}
      </div>

      {c.sparkles.map((at, i) => (
        <Sparkle key={at} at={at} x={cx + [-390, 380, 330][i]} y={CARD_Y + [-330, -250, 330][i]} size={[52, 44, 40][i]} color={BANDS[i % 4]} />
      ))}

      <div
        style={{
          position: "absolute",
          top: 1300,
          left: 80,
          right: 80,
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 124,
          lineHeight: 1.02,
          letterSpacing: -4,
          color: MG.ink,
          textAlign: "center",
        }}
      >
        <MaskLine at={c.title} outAt={c.exit - 6}>
          {title}
        </MaskLine>
        <MaskLine at={c.sub} outAt={c.exit - 4}>
          {accent}
        </MaskLine>
        <svg width={560} height={24} viewBox="0 0 560 24" style={{ display: "block", margin: "14px auto 0", overflow: "visible", opacity: 1 - ramp(frame, c.exit - 6, c.exit + 2) }}>
          {BANDS.map((color, k) => (
            <Draw key={color} d={`M${12 + k * 140} 12 H${128 + k * 140}`} p={ramp(frame, c.underline[k], c.underline[k] + 8, EASE_OUT)} stroke={color} width={20} />
          ))}
        </svg>
      </div>
    </AbsoluteFill>
  );
};

const schema = {
  title: { type: "text-content", default: "Tarjeta NFC", description: "Título" },
  accent: { type: "text-content", default: "de reseñas", description: "Título, segunda línea" },
  backLabel: { type: "text-content", default: "Chip NFC", description: "Texto del reverso" },
} as const satisfies InteractivitySchema;

export const MgReveal = Interactive.withSchema({ Component: MgRevealInner, componentName: "<MgReveal>", schema, wrapInSequence: true });
