import type React from "react";
import { AbsoluteFill, Interactive, interpolate, useCurrentFrame, useVideoConfig, type InteractivitySchema } from "remotion";
import { MaskLine } from "../../components/Typo";
import { SANS } from "../../fonts";
import { Burst, CornerWaves, EASE_IN, Marker, Sparkle, Star, bounce, clamp, glide, ramp } from "../kit";
import { BANDS, MG, mgCues } from "../theme";

type Props = {
  readonly line1: string;
  readonly line2: string;
  readonly accent: string;
  readonly style?: React.CSSProperties;
};

const c = mgCues.hook;
const ROW_Y = 1250;
const STAR_GAP = 180;
const BIG_Y = 1110;

const MgHookInner: React.FC<Props> = ({ line1, line2, accent, style }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const words = line1.split(" ");
  const cx = width / 2;

  // Cuatro bolas de color chocan en el centro.
  const starts = [
    [200, 420],
    [width - 200, 420],
    [200, 1780],
    [width - 200, 1780],
  ];
  // Pequeño impulso hacia fuera antes de lanzarse al centro.
  const windUp = Math.sin(ramp(frame, 0, 4) * Math.PI) * 0.12;
  const fly = ramp(frame, 3, c.collide, EASE_IN) - windUp;

  const big = bounce(frame, fps, c.collide, { damping: 9, stiffness: 150 });
  const split = glide(frame, fps, c.split, { damping: 16, stiffness: 150 });
  const bigSize = interpolate(split, [0, 1], [440, 150]);
  const bigY = interpolate(split, [0, 1], [BIG_Y, ROW_Y]);

  const hop = (i: number) =>
    c.wave.reduce((acc, beat) => {
      const t = frame - beat - i * 3;
      return acc + (t >= 0 && t <= 12 ? Math.sin((t / 12) * Math.PI) : 0);
    }, 0);

  return (
    <AbsoluteFill style={{ backgroundColor: MG.paper, overflow: "hidden", ...style }}>
      <CornerWaves corner="tl" size={300} grow={bounce(frame, fps, 50, { damping: 14 })} phase={frame} />
      <CornerWaves corner="br" size={340} grow={bounce(frame, fps, 54, { damping: 14 })} phase={frame + 40} colors={[MG.blue, MG.green, MG.yellow, MG.red]} />

      {frame < c.collide
        ? starts.map(([sx, sy], i) => {
            const x = sx + (cx - sx) * fly;
            const y = sy + (BIG_Y - sy) * fly;
            const angle = Math.atan2(BIG_Y - sy, cx - sx);
            return (
              <div
                key={BANDS[i]}
                style={{
                  position: "absolute",
                  left: x - 60,
                  top: y - 60,
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  background: BANDS[i],
                  rotate: `${angle}rad`,
                  scale: `${(1 + Math.max(0, fly) * 0.7) * (0.6 + 0.4 * bounce(frame, fps, 0, { damping: 12, stiffness: 260 }))} ${(1 - Math.max(0, fly) * 0.3) * (0.6 + 0.4 * bounce(frame, fps, 0, { damping: 12, stiffness: 260 }))}`,
                }}
              />
            );
          })
        : null}
      <Burst at={c.collide} x={cx} y={BIG_Y} radius={340} count={14} thickness={18} />

      {/* Texto */}
      <div
        style={{
          position: "absolute",
          top: 300,
          left: 80,
          right: 80,
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 150,
          lineHeight: 1,
          letterSpacing: -5,
          color: MG.ink,
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", columnGap: 34 }}>
          {words.map((w, i) => (
            <MaskLine key={`${w}-${i}`} at={c.words[i] ?? c.words[0]}>
              {w}
            </MaskLine>
          ))}
        </div>
        <MaskLine at={c.words[2]}>{line2}</MaskLine>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <MaskLine at={c.highlight} style={{ position: "relative", isolation: "isolate" }}>
            <span style={{ position: "relative", display: "inline-block", padding: "0 0.1em" }}>
              <Marker p={ramp(frame, c.highlight + 4, c.highlight + 14)} color={MG.yellow} />
              {accent}
            </span>
          </MaskLine>
        </div>
      </div>

      {/* Sombra plana bajo la fila de estrellas */}
      <div
        style={{
          position: "absolute",
          left: cx - 470,
          top: ROW_Y + 110,
          width: 940,
          height: 28,
          borderRadius: 14,
          background: MG.mist,
          scale: `${interpolate(split, [0, 1], [0.2, 1], clamp)} 1`,
          opacity: interpolate(frame, [c.split, c.split + 8], [0, 1], clamp),
        }}
      />
      {/* Estrella grande que se reparte en cinco */}
      {frame >= c.collide
        ? [0, 1, 2, 3, 4].map((i) => {
            const isCenter = i === 2;
            const out = isCenter ? 1 : bounce(frame, fps, c.split + 2 + Math.abs(i - 2) * 2, { damping: 12 });
            const x = cx + (i - 2) * STAR_GAP * out;
            const size = isCenter ? bigSize : 150 * Math.min(1, out * 1.2);
            const y = isCenter ? bigY : ROW_Y;
            if (!isCenter && frame < c.split) return null;
            const s = isCenter ? big : 1;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x - size / 2,
                  top: y - size / 2 - hop(i) * 56,
                  width: size,
                  height: size,
                  scale: String(s),
                  rotate: `${isCenter ? (1 - big) * -140 : (1 - out) * 90 * (i < 2 ? -1 : 1)}deg`,
                }}
              >
                <Star size={size} fill={MG.yellow} />
              </div>
            );
          })
        : null}

      {c.sparkles.map((at, i) => (
        <Sparkle key={at} at={at} x={cx + [-330, 360, -40][i]} y={ROW_Y + [-170, -140, 150][i]} size={[46, 38, 34][i]} color={BANDS[(i + 1) % 4]} />
      ))}

    </AbsoluteFill>
  );
};

const schema = {
  line1: { type: "text-content", default: "Tu negocio", description: "Línea 1" },
  line2: { type: "text-content", default: "merece", description: "Línea 2" },
  accent: { type: "text-content", default: "5 estrellas", description: "Destacado" },
} as const satisfies InteractivitySchema;

export const MgHook = Interactive.withSchema({ Component: MgHookInner, componentName: "<MgHook>", schema, wrapInSequence: true });
