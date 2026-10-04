import {
  createTikTokStyleCaptions,
  type Caption,
  type TikTokPage,
} from "@remotion/captions";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type CaptionStyle = {
  /** Las palabras más cercanas que esto (ms) se agrupan en la misma "página" en pantalla. */
  combineTokensWithinMilliseconds: number;
  fontSize: number;
  /** Distancia (px) desde el borde inferior. Deja hueco a la interfaz de TikTok/Reels. */
  bottom: number;
  textColor: string;
  highlightColor: string;
};

export const defaultCaptionStyle: CaptionStyle = {
  combineTokensWithinMilliseconds: 1200,
  fontSize: 84,
  bottom: 380,
  textColor: "#ffffff",
  highlightColor: "#ffd60a",
};

const CaptionPage: React.FC<
  { page: TikTokPage; fromFrame: number } & CaptionStyle
> = ({ page, fromFrame, fontSize, bottom, textColor, highlightColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // useCurrentFrame() es relativo a la <Sequence>: se suma fromFrame para tener el tiempo absoluto.
  const currentMs = ((fromFrame + frame) / fps) * 1000;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: bottom,
        paddingInline: 70,
      }}
    >
      <div
        style={{
          opacity: interpolate(frame, [0, 3], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          scale: interpolate(frame, [0, 6], [0.8, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.back(1.7)),
          }),
          fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
          fontWeight: 900,
          fontSize,
          lineHeight: 1.15,
          textAlign: "center",
          textTransform: "uppercase",
          // Los tokens de Whisper traen el espacio inicial: hay que conservarlo.
          whiteSpace: "pre-wrap",
          color: textColor,
          WebkitTextStroke: `${Math.round(fontSize / 9)}px #000`,
          paintOrder: "stroke fill",
          textShadow: "0 8px 24px rgba(0, 0, 0, 0.55)",
        }}
      >
        {page.tokens.map((token) => {
          const active = token.fromMs <= currentMs && currentMs < token.toMs;
          // El espacio queda fuera del span animado para que el efecto no altere el hueco entre palabras.
          const [, before, word, after] = token.text.match(
            /^(\s*)([\s\S]*?)(\s*)$/,
          )!;
          return (
            <span key={`${token.fromMs}-${token.text}`}>
              {before}
              <span
                style={{
                  display: "inline-block",
                  color: active ? highlightColor : textColor,
                  translate: active ? "0px -10px" : "0px 0px",
                }}
              >
                {word}
              </span>
              {after}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Captions: React.FC<
  { captions: Caption[] } & Partial<CaptionStyle>
> = ({ captions, ...overrides }) => {
  const { fps } = useVideoConfig();
  const style: CaptionStyle = { ...defaultCaptionStyle, ...overrides };

  const pages = useMemo(
    () =>
      createTikTokStyleCaptions({
        captions,
        combineTokensWithinMilliseconds: style.combineTokensWithinMilliseconds,
      }).pages,
    [captions, style.combineTokensWithinMilliseconds],
  );

  return (
    <>
      {pages.map((page, index) => {
        const fromFrame = Math.round((page.startMs / 1000) * fps);
        // Cada página termina cuando empieza la siguiente, así nunca se solapan.
        const next = pages[index + 1];
        const endMs = next ? next.startMs : page.startMs + page.durationMs;
        const durationInFrames = Math.max(
          1,
          Math.round((endMs / 1000) * fps) - fromFrame,
        );

        return (
          <Sequence
            key={`${page.startMs}-${index}`}
            from={fromFrame}
            durationInFrames={durationInFrames}
            premountFor={fps}
            name={page.text.trim()}
          >
            <CaptionPage page={page} fromFrame={fromFrame} {...style} />
          </Sequence>
        );
      })}
    </>
  );
};
