import type React from "react";
import {
  AbsoluteFill,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { GlitchText, Particles, PopWord } from "../components/Fx";
import { progress, shake } from "../components/motion";
import { SANS, SERIF } from "../fonts";
import { COLORS, cues } from "../theme";

type Props = {
  readonly line1: string;
  readonly line2: string;
  readonly style?: React.CSSProperties;
};

const c = cues.hook;

const HookSceneInner: React.FC<Props> = ({ line1, line2, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w1 = line1.split(" ");
  const w2 = line2.split(" ");

  const s1 = shake(frame, c.glitch, 26, "hook1");
  const s2 = shake(frame, c.strike, 34, "hook2");
  const glitch = interpolate(frame, [c.glitch - 4, c.glitch, c.glitch + 4], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const line1Out = frame >= c.glitch + 3;
  const strike = progress(frame, c.strike, c.strike + 7);
  const chip = progress(frame, c.strike + 4, c.strike + 16);
  // Zoom lento continuo para que el plano "respire".
  const drift = 1 + frame / (fps * 60);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.ink,
        background: `radial-gradient(circle at 50% 40%, #142347 0%, ${COLORS.ink} 62%)`,
        ...style,
      }}
    >
      <Particles count={30} seed="hook" />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          padding: "0 90px",
          translate: `${s1.x + s2.x}px ${s1.y + s2.y}px`,
          rotate: `${s1.r + s2.r}deg`,
          scale: String(drift),
        }}
      >
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 132, lineHeight: 1.02, color: "white", letterSpacing: -3 }}>
          {!line1Out ? (
            <div style={{ display: "flex", flexWrap: "wrap", columnGap: 30 }}>
              {w1.map((word, i) => (
                <PopWord
                  key={`${word}-${i}`}
                  at={c.words[i] ?? c.words[c.words.length - 1]}
                  style={i === w1.length - 1 ? { fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, color: COLORS.gold, letterSpacing: 0 } : undefined}
                >
                  {glitch > 0 ? <GlitchText intensity={glitch}>{word}</GlitchText> : word}
                </PopWord>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", columnGap: 30 }}>
              {w2.map((word, i) => {
                const isLast = i === w2.length - 1;
                return (
                  <PopWord key={`${word}-${i}`} at={c.words[4 + i] ?? c.words[c.words.length - 1]} style={{ position: "relative" }}>
                    <span style={{ color: i === 1 ? COLORS.red : "white" }}>
                      {glitch > 0 ? <GlitchText intensity={glitch}>{word}</GlitchText> : word}
                    </span>
                    {isLast ? (
                      <span
                        style={{
                          position: "absolute",
                          left: -10,
                          right: -10,
                          top: "54%",
                          height: 16,
                          borderRadius: 8,
                          background: COLORS.red,
                          scale: `${strike} 1`,
                          transformOrigin: "left center",
                          boxShadow: `0 0 30px ${COLORS.red}`,
                        }}
                      />
                    ) : null}
                  </PopWord>
                );
              })}
            </div>
          )}
        </div>
        <div
          style={{
            marginTop: 70,
            alignSelf: "flex-start",
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "18px 30px",
            borderRadius: 999,
            background: "rgba(234,67,53,0.14)",
            border: "2px solid rgba(234,67,53,0.5)",
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 40,
            color: "#ffb3ab",
            opacity: chip,
            translate: `0 ${(1 - chip) * 30}px`,
          }}
        >
          <div style={{ width: 16, height: 16, borderRadius: 8, background: COLORS.red, boxShadow: `0 0 16px ${COLORS.red}` }} />
          Reseñas nuevas esta semana: 0
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const hookSchema = {
  line1: { type: "text-content", default: "Tus clientes están encantados.", description: "Frase 1" },
  line2: { type: "text-content", default: "Pero nadie deja reseña.", description: "Frase 2" },
} as const satisfies InteractivitySchema;

export const HookScene = Interactive.withSchema({
  Component: HookSceneInner,
  componentName: "<HookScene>",
  schema: hookSchema,
  wrapInSequence: true,
});
