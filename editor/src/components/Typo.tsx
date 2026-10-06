import type React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

// Línea que entra desde detrás de una máscara (y sale por arriba si se indica outAt).
export const MaskLine: React.FC<{
  children: React.ReactNode;
  at: number;
  outAt?: number;
  style?: React.CSSProperties;
  innerStyle?: React.CSSProperties;
}> = ({ children, at, outAt, style, innerStyle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - at, fps, config: { damping: 20, stiffness: 140, mass: 0.8 } });
  const exit = outAt === undefined ? 0 : spring({ frame: frame - outAt, fps, config: { damping: 22, stiffness: 160 } });
  return (
    <div style={{ overflow: "hidden", paddingBottom: "0.12em", marginBottom: "-0.12em", ...style }}>
      <div style={{ translate: `0 ${(1 - enter) * 115 - exit * 115}%`, ...innerStyle }}>{children}</div>
    </div>
  );
};

// Palabras que suben una a una desde su propia máscara.
export const MaskWords: React.FC<{
  text: string;
  at: number;
  stagger?: number;
  outAt?: number;
  gap?: string;
  style?: React.CSSProperties;
  wordStyle?: (index: number) => React.CSSProperties | undefined;
}> = ({ text, at, stagger = 3, outAt, gap = "0.28em", style, wordStyle }) => (
  <div style={{ display: "flex", flexWrap: "wrap", columnGap: gap, ...style }}>
    {text.split(" ").map((w, i) => (
      <MaskLine key={`${w}-${i}`} at={at + i * stagger} outAt={outAt === undefined ? undefined : outAt + i * 1} innerStyle={wordStyle?.(i)}>
        {w}
      </MaskLine>
    ))}
  </div>
);
