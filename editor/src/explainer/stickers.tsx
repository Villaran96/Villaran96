import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Icon } from "./icons";
import { C, F, clamp01 } from "./theme";

type StickerProps = Record<string, unknown> & { text: string; w?: number; h?: number };

const useStamp = (damping = 9) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame, fps, config: { damping, stiffness: 260, mass: 0.55 } });
};

/** Sello rojo de «goma»: entra grande y se estampa con un golpe. */
export const Stamp: React.FC<StickerProps> = ({ text, size = 70, color = C.red }) => {
  const p = useStamp();
  const s = Number(size);
  return (
    <div
      style={{
        display: "inline-block",
        padding: `${s * 0.1}px ${s * 0.34}px`,
        border: `${Math.max(5, s * 0.09)}px solid ${String(color)}`,
        borderRadius: s * 0.22,
        color: String(color),
        fontFamily: F.display,
        fontSize: s,
        lineHeight: 1.1,
        textTransform: "uppercase",
        letterSpacing: "0.01em",
        background: "rgba(251,250,246,0.42)",
        mixBlendMode: "multiply",
        opacity: clamp01(p * 2) * 0.94,
        scale: String(interpolate(p, [0, 1], [2.1, 1])),
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
};

/** Nota amarilla con cinta y icono opcional. */
export const Tag: React.FC<StickerProps> = ({ text, icon = "play", size = 52 }) => {
  const p = useStamp(11);
  const s = Number(size);
  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: s * 0.3,
        padding: `${s * 0.3}px ${s * 0.5}px`,
        background: "#F5C640",
        borderRadius: 8,
        boxShadow: "0 16px 28px rgba(80,55,10,0.25)",
        fontFamily: F.display,
        fontSize: s,
        lineHeight: 1.05,
        textTransform: "uppercase",
        color: C.ink,
        scale: String(interpolate(p, [0, 1], [0.3, 1])),
        opacity: clamp01(p * 2.5),
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ position: "absolute", top: -14, left: "42%", width: 90, height: 28, background: "rgba(255,255,255,0.55)", rotate: "-4deg" }} />
      <Icon name={String(icon)} size={s * 0.95} color={C.red} />
      {text}
    </div>
  );
};

/** Píldora oscura: apunte corto, tipo «hazlo más visual». */
export const Chip: React.FC<StickerProps> = ({ text, size = 40 }) => {
  const p = useStamp(14);
  const s = Number(size);
  return (
    <div
      style={{
        display: "inline-block",
        padding: `${s * 0.42}px ${s * 0.7}px`,
        background: C.ink,
        color: "#fff",
        borderRadius: s * 0.4,
        fontFamily: F.sans,
        fontWeight: 600,
        fontSize: s,
        boxShadow: "0 14px 24px rgba(20,20,20,0.28)",
        scale: String(interpolate(p, [0, 1], [0.6, 1])),
        translate: `0px ${(1 - p) * 30}px`,
        opacity: clamp01(p * 2),
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
};

export const STICKERS: Record<string, React.FC<StickerProps>> = { stamp: Stamp, tag: Tag, chip: Chip };
