import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { parseMarkup } from "./markup";
import { C, F, clamp01, easeOut } from "./theme";
import type { Head } from "./types";

/** Etiqueta mono sobre los subtítulos: «// paso 2 · la carpeta», con efecto de máquina de escribir. */
export const Kicker: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = Math.floor(clamp01(frame / fps / 0.45) * text.length);
  return (
    <div
      style={{
        position: "absolute",
        left: 84,
        top: 112,
        fontFamily: F.mono,
        fontSize: 34,
        fontWeight: 500,
        color: C.mute,
        letterSpacing: "0.01em",
        whiteSpace: "pre",
      }}
    >
      {text.slice(0, n)}
    </div>
  );
};

/** Insignia oscura con el número de paso y una fila de puntos de progreso. */
export const Badge: React.FC<{ n: number; total: number; at: number }> = ({ n, total, at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - Math.round(at * fps), fps, config: { damping: 10, stiffness: 200, mass: 0.6 } });
  return (
    <div
      style={{
        position: "absolute",
        left: 906,
        top: 478,
        width: 116,
        height: 128,
        borderRadius: 26,
        background: "linear-gradient(160deg, #26262a, #0d0d10)",
        boxShadow: "0 14px 28px rgba(30,20,10,0.30), inset 0 2px 0 rgba(255,255,255,0.12)",
        opacity: clamp01(p * 2),
        scale: String(interpolate(p, [0, 1], [0.4, 1])),
        rotate: `${interpolate(p, [0, 1], [-14, 0])}deg`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      }}
    >
      <div style={{ fontFamily: F.display, fontSize: 78, lineHeight: 1, color: "#fff", marginTop: 6 }}>{n}</div>
      <div style={{ display: "flex", gap: 6 }}>
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: i + 1 === n ? C.red : i + 1 < n ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.22)",
            }}
          />
        ))}
      </div>
    </div>
  );
};

/** Titular condensado con palabras en rojo y tachadas; entra con un barrido de izquierda a derecha. */
export const Headline: React.FC<{ head: Head; at: number; total: number }> = ({ head, at, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const runs = parseMarkup(head.text);
  const chars = runs.reduce((n, r) => n + r.text.length, 0);
  // Anton ≈ 0,43 em de ancho medio por letra mayúscula; deja sitio a la insignia.
  const avail = head.badge ? 790 : 900;
  const size = Math.min(132, Math.floor(avail / (chars * 0.44)));

  const p = spring({ frame: frame - Math.round(at * fps), fps, config: { damping: 15, stiffness: 140, mass: 0.8 } });
  const reveal = easeOut(clamp01((frame / fps - at) / 0.5));
  const smallN = Math.floor(clamp01((frame / fps - at) / 0.4) * (head.small?.length ?? 0));

  return (
    <>
      {head.small ? (
        <div
          style={{
            position: "absolute",
            left: 84,
            top: 424,
            fontFamily: F.mono,
            fontSize: 30,
            color: C.mute,
            whiteSpace: "pre",
          }}
        >
          {head.small.slice(0, smallN)}
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 84,
          top: 462,
          width: avail,
          height: 160,
          overflow: "hidden",
          clipPath: `inset(0 ${(1 - reveal) * 100}% 0 0)`,
        }}
      >
        <div
          style={{
            fontFamily: F.display,
            fontSize: size,
            lineHeight: "150px",
            color: C.ink,
            whiteSpace: "nowrap",
            textTransform: "uppercase",
            translate: `${(1 - p) * -60}px 0px`,
          }}
        >
          {runs.map((r, i) => (
            <span
              key={i}
              style={{
                color: r.kind === "plain" ? C.ink : C.red,
                textDecoration: r.kind === "strike" ? "line-through" : undefined,
                textDecorationThickness: r.kind === "strike" ? Math.round(size * 0.09) : undefined,
              }}
            >
              {r.text}
            </span>
          ))}
        </div>
      </div>
      {head.badge ? <Badge n={head.badge} total={total} at={at + 0.08} /> : null}
    </>
  );
};
