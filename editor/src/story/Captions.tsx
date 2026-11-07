import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Page } from "../explainer/Karaoke";
import { F } from "../explainer/theme";
import { clamp } from "./util";

const OUTLINE = (c: string, w: number) =>
  Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return `${(Math.cos(a) * w).toFixed(1)}px ${(Math.sin(a) * w).toFixed(1)}px 0 ${c}`;
  }).join(", ");

/** Subtítulos grandes estilo Shorts: 2–3 palabras, la que se dice se enciende en el color de acento. */
export const StoryCaptions: React.FC<{ pages: Page[]; accent: string; y?: number }> = ({ pages, accent, y = 1290 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const page = pages.find((p) => t >= p.from && t < p.to);
  if (!page) return null;

  const pop = spring({ frame: Math.round((t - page.from) * fps), fps, config: { damping: 12, stiffness: 280, mass: 0.5 } });
  const activeIdx = page.words.reduce((a, w, i) => (t >= w.s ? i : a), -1);
  // Una línea cabe en ~980 px: Anton en mayúsculas mide ≈ 0,5 em por letra; se reduce el cuerpo si la página es larga.
  const letters = page.words.reduce((n, w) => n + w.text.length, 0) + page.words.length - 1;
  const size = Math.round(Math.min(124, Math.max(92, 960 / (letters * 0.52))));

  return (
    <div
      style={{
        position: "absolute",
        left: 50,
        width: 980,
        top: y,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "0 34px",
        fontFamily: F.display,
        textTransform: "uppercase",
        fontSize: size,
        lineHeight: 1.08,
        letterSpacing: "0.01em",
        opacity: clamp(pop * 3),
        scale: String(0.9 + 0.1 * pop),
      }}
    >
      {page.words.map((w, i) => {
        const on = i === activeIdx;
        return (
          <span
            key={i}
            style={{
              color: on || w.accent ? accent : "#fff",
              textShadow: `${OUTLINE("#05070d", 7)}, 0 12px 28px rgba(0,0,0,0.55)`,
              scale: String(on ? 1.05 : 1),
              display: "inline-block",
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};
