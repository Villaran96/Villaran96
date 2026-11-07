import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { narrationWords } from "./markup";
import { C, F, clamp01, easeOut } from "./theme";
import type { Script, Timing } from "./types";

export type KWord = { text: string; accent: boolean; s: number; e: number };
export type Page = { from: number; to: number; words: KWord[] };

const MAX_WORDS = 8;
const MAX_CHARS = 44;

/** Trocea la narración de cada escena en «páginas» de 1–2 líneas: corta en puntuación o al llenarse. */
export const buildPages = (script: Script, timing: Timing): Page[] => {
  const pages: Page[] = [];
  script.scenes.forEach((scene, i) => {
    const st = timing.scenes[i];
    const toks = narrationWords(scene.narration);
    const words: KWord[] = toks.map((tok, k) => ({
      text: tok.text,
      accent: tok.accent,
      s: st.words[k]?.s ?? st.voiceStart,
      e: st.words[k]?.e ?? st.voiceEnd,
    }));

    let cur: KWord[] = [];
    let chars = 0;
    const flush = () => {
      if (cur.length) pages.push({ from: cur[0].s - 0.06, to: cur[cur.length - 1].e, words: cur });
      cur = [];
      chars = 0;
    };
    words.forEach((w, k) => {
      cur.push(w);
      chars += w.text.length + 1;
      const endsClause = /[.,;:?!…]$/.test(w.text);
      const full = cur.length >= MAX_WORDS || chars >= MAX_CHARS;
      const next = words[k + 1];
      const nextWouldOverflow = next && chars + next.text.length + 1 > MAX_CHARS + 6;
      if ((endsClause && cur.length >= 3) || full || nextWouldOverflow) flush();
    });
    flush();
  });

  // Cada página se mantiene hasta que empieza la siguiente (sin parpadeos) o 0,35 s tras su última palabra.
  return pages.map((p, i) => {
    const next = pages[i + 1];
    const hold = p.to + 0.35;
    return { ...p, to: next ? Math.min(hold, next.from) : hold };
  });
};

export const Karaoke: React.FC<{ pages: Page[] }> = ({ pages }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const page = pages.find((p) => t >= p.from && t < p.to);
  if (!page) return null;

  const enter = easeOut(clamp01((t - page.from) / 0.22));
  return (
    <div
      style={{
        position: "absolute",
        left: 84,
        top: 196,
        width: 900,
        fontFamily: F.sans,
        fontWeight: 560,
        fontSize: 66,
        lineHeight: 1.12,
        letterSpacing: "-0.015em",
        opacity: enter,
        translate: `0px ${(1 - enter) * 14}px`,
      }}
    >
      {page.words.map((w, i) => {
        const spoken = easeOut(clamp01((t - w.s) / 0.12));
        const base = w.accent ? C.red : C.ink;
        return (
          <span
            key={i}
            style={{
              color: base,
              opacity: 0.2 + 0.8 * spoken,
              fontFamily: w.accent ? F.serif : F.sans,
              fontStyle: w.accent ? "italic" : "normal",
              fontWeight: w.accent ? 400 : 560,
              fontSize: w.accent ? "1.16em" : "1em",
              letterSpacing: w.accent ? "-0.01em" : undefined,
            }}
          >
            {w.text}{" "}
          </span>
        );
      })}
    </div>
  );
};
