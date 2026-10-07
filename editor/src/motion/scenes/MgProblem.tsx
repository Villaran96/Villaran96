import type React from "react";
import { AbsoluteFill, Interactive, interpolate, useCurrentFrame, useVideoConfig, type InteractivitySchema } from "remotion";
import { MaskLine, MaskWords } from "../../components/Typo";
import { SANS } from "../../fonts";
import { Draw, EASE_IN, Star, bounce, clamp, ramp } from "../kit";
import { MG, mgCues } from "../theme";

type Props = {
  readonly line1: string;
  readonly line2: string;
  readonly accent: string;
  readonly style?: React.CSSProperties;
};

const c = mgCues.problem;
const ROW_Y = 1250;
const STAR_GAP = 180;

const MgProblemInner: React.FC<Props> = ({ line1, line2, accent, style }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const cx = width / 2;
  const drain = ramp(frame, c.drain, c.drain + 14);

  const bubbleIn = bounce(frame, fps, c.bubble, { damping: 10 });
  const deflate = ramp(frame, c.deflate, c.deflate + 12, EASE_IN);

  return (
    <AbsoluteFill style={{ backgroundColor: MG.ink, overflow: "hidden", ...style }}>
      <div
        style={{
          position: "absolute",
          top: 290,
          left: 80,
          right: 80,
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 124,
          lineHeight: 1.02,
          letterSpacing: -4,
          color: MG.paper,
          textAlign: "center",
        }}
      >
        <MaskWords text={line1} at={c.line1} stagger={4} gap="0.24em" style={{ justifyContent: "center" }} />
        <MaskLine at={c.line2}>{line2}</MaskLine>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <MaskLine at={c.line2 + 5} style={{ position: "relative" }}>
            <span style={{ color: MG.yellow }}>{accent}</span>
          </MaskLine>
        </div>
        <svg width={420} height={50} viewBox="0 0 420 50" style={{ display: "block", margin: "6px auto 0", overflow: "visible" }}>
          <Draw d="M10 30 C 60 0, 100 50, 150 25 S 240 0, 290 28 S 380 45, 410 18" p={ramp(frame, c.squiggle, c.squiggle + 14)} stroke={MG.yellow} width={12} />
        </svg>
      </div>

      {/* Las cinco estrellas pierden el color y se caen una a una */}
      {[0, 1, 2, 3, 4].map((i) => {
        const at = c.falls[i];
        const t = frame - at;
        const hop = t >= 0 && t < 6 ? Math.sin((t / 6) * Math.PI) * 26 : 0;
        const fall = t >= 6 ? 0.5 * 3.4 * (t - 6) * (t - 6) : 0;
        const spin = t >= 6 ? (t - 6) * (i % 2 ? 7 : -7) : 0;
        const x = cx + (i - 2) * STAR_GAP;
        const y = ROW_Y - hop + fall;
        if (y > 2200) return null;
        return (
          <div key={i} style={{ position: "absolute", left: x - 75, top: y - 75, width: 150, height: 150, rotate: `${spin}deg` }}>
            <Star size={150} fill="none" stroke="#4A505C" strokeWidth={8} style={{ position: "absolute", inset: 0 }} />
            <Star size={150} fill={MG.yellow} style={{ position: "absolute", inset: 0, opacity: 1 - drain }} />
          </div>
        );
      })}

      {/* Bocadillo que escribe… y se desinfla sin decir nada */}
      {frame >= c.bubble ? (
        <div
          style={{
            position: "absolute",
            left: cx - 220,
            top: ROW_Y - 150 + deflate * 120,
            width: 440,
            height: 260,
            transformOrigin: "30% 100%",
            scale: `${bubbleIn * (1 - deflate * 0.25)} ${bubbleIn * (1 - deflate * 0.85)}`,
            opacity: 1 - interpolate(deflate, [0.6, 1], [0, 1], clamp),
          }}
        >
          <svg width={440} height={260} viewBox="0 0 440 260" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <path d="M60 10h320a50 50 0 0 1 50 50v100a50 50 0 0 1-50 50H150l-70 42 12-42H60a50 50 0 0 1-50-50V60a50 50 0 0 1 50-50z" fill={MG.paper} />
          </svg>
          {[0, 1, 2].map((k) => {
            const t = frame - c.typing[0] - k * 4;
            const up = t >= 0 && frame < c.typing[1] ? Math.abs(Math.sin((t / 12) * Math.PI)) * 22 : 0;
            return (
              <div
                key={k}
                style={{ position: "absolute", left: 130 + k * 70, top: 92 - up, width: 44, height: 44, borderRadius: 22, background: MG.gray }}
              />
            );
          })}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const schema = {
  line1: { type: "text-content", default: "Pero las reseñas", description: "Línea 1" },
  line2: { type: "text-content", default: "no llegan", description: "Línea 2" },
  accent: { type: "text-content", default: "solas.", description: "Destacado" },
} as const satisfies InteractivitySchema;

export const MgProblem = Interactive.withSchema({ Component: MgProblemInner, componentName: "<MgProblem>", schema, wrapInSequence: true });
