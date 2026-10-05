import { evolvePath } from "@remotion/paths";
import type React from "react";
import {
  AbsoluteFill,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { Particles, PopWord } from "../components/Fx";
import { EASE_IN_OUT, progress, punch } from "../components/motion";
import { SANS, SERIF } from "../fonts";
import { COLORS, cues } from "../theme";

type Props = {
  readonly line1: string;
  readonly line2: string;
  readonly highlight: string;
  readonly style?: React.CSSProperties;
};

const c = cues.question;
const RING = "M 170 20 A 150 150 0 1 1 169.99 20";

const QuestionSceneInner: React.FC<Props> = ({ line1, line2, highlight, style }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const ring = progress(frame, c.clockStart, c.clockStart + 50, EASE_IN_OUT);
  const ringPath = evolvePath(ring, RING);
  const marker = progress(frame, c.highlight, c.highlight + 10);
  // Tensión creciente antes del "drop": el plano se acerca y se ilumina.
  const tension = interpolate(frame, [c.riserStart, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_IN_OUT,
  });
  const beat = punch(frame, fps, c.words[3], 0.05);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.night,
        background: `radial-gradient(circle at 50% 30%, rgba(66,133,244,${0.25 + tension * 0.45}) 0%, ${COLORS.night} 60%)`,
        ...style,
      }}
    >
      <Particles count={40} seed="question" />
      <AbsoluteFill style={{ scale: String((1 + tension * 0.05) * beat) }}>
        <div style={{ position: "absolute", top: 300, left: "50%", marginLeft: -170, width: 340, height: 340 }}>
          <svg width={340} height={340} viewBox="0 0 340 340">
            <circle cx={170} cy={170} r={150} stroke="rgba(255,255,255,0.12)" strokeWidth={14} fill="none" />
            <path
              d={RING}
              stroke={COLORS.blue}
              strokeWidth={14}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={ringPath.strokeDasharray}
              strokeDashoffset={ringPath.strokeDashoffset}
              style={{ filter: `drop-shadow(0 0 ${10 + tension * 30}px ${COLORS.blue})` }}
            />
            <line
              x1={170}
              y1={170}
              x2={170}
              y2={60}
              stroke="white"
              strokeWidth={10}
              strokeLinecap="round"
              transform={`rotate(${ring * 360} 170 170)`}
            />
            <circle cx={170} cy={170} r={14} fill="white" />
          </svg>
        </div>
        <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 90px 520px" }}>
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 112, lineHeight: 1.05, color: "white", letterSpacing: -2 }}>
            <div style={{ display: "flex", flexWrap: "wrap", columnGap: 26 }}>
              {line1.split(" ").map((w, i) => (
                <PopWord key={`a-${i}`} at={c.words[0] + i * 4}>
                  {w}
                </PopWord>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", columnGap: 26 }}>
              {line2.split(" ").map((w, i) => (
                <PopWord key={`b-${i}`} at={c.words[2] + i * 4}>
                  {w}
                </PopWord>
              ))}
            </div>
            <PopWord at={c.words[3]} style={{ position: "relative", marginTop: 10 }}>
              <span
                style={{
                  position: "absolute",
                  left: -18,
                  right: -18,
                  top: "12%",
                  bottom: "4%",
                  borderRadius: 18,
                  background: COLORS.blue,
                  scale: `${marker} 1`,
                  transformOrigin: "left center",
                  rotate: "-1.5deg",
                }}
              />
              <span style={{ position: "relative", fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: 150, letterSpacing: 0 }}>
                {highlight}
              </span>
            </PopWord>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 25%, rgba(200,220,255,0.95), rgba(66,133,244,0.35) 35%, transparent 70%)", opacity: tension * tension * 0.8 }} />
    </AbsoluteFill>
  );
};

const questionSchema = {
  line1: { type: "text-content", default: "¿Y si conseguirla", description: "Línea 1" },
  line2: { type: "text-content", default: "costara solo", description: "Línea 2" },
  highlight: { type: "text-content", default: "1 segundo?", description: "Texto destacado" },
} as const satisfies InteractivitySchema;

export const QuestionScene = Interactive.withSchema({
  Component: QuestionSceneInner,
  componentName: "<QuestionScene>",
  schema: questionSchema,
  wrapInSequence: true,
});
