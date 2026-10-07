import { Audio } from "@remotion/media";
import { ThreeCanvas } from "@remotion/three";
import type React from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { SANS } from "../fonts";
import timeline from "./timeline.json";
import { CARD_POS, World, hourAt, lerpColor, nightAt } from "./world";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const EASE = Easing.bezier(0.65, 0, 0.35, 1);
export const ISO_TOTAL = timeline.duration;

const clock = (h: number) => {
  const total = Math.floor((h * 60) / 10) * 10;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const Caption: React.FC<{ from: number; to: number; text: string }> = ({ from, to, text }) => {
  const frame = useCurrentFrame();
  const inP = interpolate(frame, [from, from + 14], [0, 1], { ...clamp, easing: EASE });
  const outP = interpolate(frame, [to - 12, to], [1, 0], { ...clamp, easing: EASE });
  const k = Math.min(inP, outP);
  if (k <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 64,
        bottom: 70,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "16px 28px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.86)",
        color: "#2b2633",
        fontFamily: SANS,
        fontWeight: 600,
        fontSize: 40,
        letterSpacing: -0.5,
        opacity: k,
        translate: `0 ${(1 - k) * 30}px`,
        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
      }}
    >
      {text}
    </div>
  );
};

// Un día en una cafetería con la tarjeta en la barra: de la mañana a la noche, en isométrico low-poly.
export const IsoPromo: React.FC<{ withMusic: boolean }> = ({ withMusic }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const h = hourAt(frame);
  const night = nightAt(h);
  const top = lerpColor([[8, "#9ed0f0"], [12, "#7ec4f5"], [16.5, "#8fc1e8"], [18.5, "#f7a26b"], [19.8, "#6b4c8c"], [21, "#141b3a"], [22, "#0d1230"]], h);
  const bottom = lerpColor([[8, "#ffe3c2"], [12, "#ddf2ff"], [16.5, "#ffe6c8"], [18.5, "#ffd7a8"], [19.8, "#f28a6a"], [21, "#2b2f5c"], [22, "#1d2148"]], h);

  // Cámara: empieza pegada a la tarjeta, se abre a la isla, gira despacio y acaba en el cartel.
  const intro = interpolate(frame, timeline.intro, [0, 1], { ...clamp, easing: EASE });
  const outro = interpolate(frame, timeline.outro, [0, 1], { ...clamp, easing: EASE });
  const center: [number, number, number] = [-0.2, 0.6, 0];
  const signT: [number, number, number] = [-1.2, 1.6, -2.2];
  const target: [number, number, number] = [0, 1, 2].map((k) => {
    const a = CARD_POS[k] + (center[k] - CARD_POS[k]) * intro;
    return a + (signT[k] - a) * outro * 0.6;
  }) as [number, number, number];
  const zoom = interpolate(intro, [0, 1], [300, 76]) + interpolate(frame, [100, 500], [0, 8], clamp) + outro * 34;
  const angle = interpolate(frame, [0, 100, 640], [-0.5, -0.12, 0.14], { ...clamp, easing: EASE });

  const endcard = interpolate(frame, [timeline.endcard, timeline.endcard + 20], [0, 1], { ...clamp, easing: EASE });
  const sun = new THREE.Color("#ffd35a").lerp(new THREE.Color("#e8ecff"), night);

  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, #${top.getHexString()} 0%, #${bottom.getHexString()} 100%)` }}>
      {/* Estrellas del cielo nocturno */}
      <AbsoluteFill style={{ opacity: night }}>
        {new Array(70).fill(0).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: random(`sx${i}`) * width,
              top: random(`sy${i}`) * height * 0.7,
              width: 3 + random(`ss${i}`) * 3,
              height: 3 + random(`ss${i}`) * 3,
              borderRadius: "50%",
              background: "#ffffff",
              opacity: 0.4 + 0.6 * Math.abs(Math.sin(frame / 20 + i)),
            }}
          />
        ))}
      </AbsoluteFill>
      <ThreeCanvas
        width={width}
        height={height}
        orthographic
        camera={{ zoom: 80, position: [20, 18, 20], near: 0.1, far: 200 }}
        shadows
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        <World frame={frame} target={target} zoom={zoom} angle={angle} />
      </ThreeCanvas>

      {/* Reloj */}
      <div
        style={{
          position: "absolute",
          left: 64,
          top: 60,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 24px 12px 14px",
          borderRadius: 999,
          background: night > 0.5 ? "rgba(20,24,50,0.6)" : "rgba(255,255,255,0.7)",
          color: night > 0.5 ? "#f2f0ff" : "#2b2633",
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 38,
          fontVariantNumeric: "tabular-nums",
          opacity: interpolate(frame, [6, 18], [0, 1], clamp) * (1 - endcard),
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 20, background: `#${sun.getHexString()}`, boxShadow: night > 0.5 ? "inset -12px -4px 0 rgba(20,24,50,0.85)" : "0 0 18px rgba(255,200,80,0.8)" }} />
        {clock(h)}
      </div>

      {timeline.captions.map((c) => (
        <Caption key={c.text} from={c.from} to={c.to} text={c.text} />
      ))}

      {/* Cierre */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,12,32,0) 35%, rgba(10,12,32,0.82) 100%)", opacity: endcard }} />
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 86, color: "#f6f3ff", fontFamily: SANS, opacity: endcard, translate: `0 ${(1 - endcard) * 40}px` }}>
        <div style={{ fontWeight: 800, fontSize: 76, lineHeight: 1.02, letterSpacing: -2.5 }}>
          que te valoren
          <br />
          es tan fácil como
          <br />
          <span style={{ color: "#fdd663" }}>acercar el móvil.</span>
        </div>
        <div style={{ marginTop: 30, display: "flex", alignItems: "center", gap: 16, fontWeight: 700, fontSize: 34, opacity: 0.9 }}>
          <Img src={staticFile("motion/logo-mark.png")} style={{ width: 64, height: "auto" }} />
          cierzo nfc · tarjetas nfc de reseñas
        </div>
      </div>
      {withMusic ? <Audio src={staticFile("audio/iso-promo.wav")} premountFor={fps} /> : null}
    </AbsoluteFill>
  );
};
