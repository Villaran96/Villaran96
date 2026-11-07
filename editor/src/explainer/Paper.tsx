import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "./theme";

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .3  0 0 0 0 .25  0 0 0 0 .2  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/** Fondo de papel beige con grano suave y trama de puntos (halftone) que se intensifica hacia abajo. */
export const Paper: React.FC = () => (
  <AbsoluteFill style={{ background: C.paper }}>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 55% at 45% 35%, rgba(255,255,255,0.38), rgba(255,255,255,0) 70%)" }} />
    <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.35, mixBlendMode: "multiply" }} />
    <AbsoluteFill
      style={{
        backgroundImage: "radial-gradient(circle at center, rgba(95,82,60,0.42) 0 2.2px, transparent 2.9px)",
        backgroundSize: "20px 20px",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 52%, rgba(0,0,0,0.9) 100%)",
        maskImage: "linear-gradient(to bottom, transparent 52%, rgba(0,0,0,0.9) 100%)",
      }}
    />
  </AbsoluteFill>
);
