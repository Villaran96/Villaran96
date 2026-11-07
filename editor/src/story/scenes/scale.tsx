import React from "react";
import { AbsoluteFill } from "remotion";
import { F } from "../../explainer/theme";
import { BigStat, Banner, Callout } from "../kit/hud";
import { Betelgeuse, BodyLabel, Earth, Jupiter, Measure, OrbitRing, PulseRing, SpaceBg, Sun } from "../kit/space";
import { Svg } from "../kit/water";
import type { SceneCtx } from "../types";
import { clamp, mix, ramp } from "../util";

// Canal «A Escala»: tamaños reales comparados con una cámara que se aleja de forma continua.
// Todas las escenas dibujan el MISMO mundo; cada una solo decide a dónde mira la cámara, así que el solape entre escenas es invisible.

const ACCENT = "#ffb23f";
const OUTLINE = "0 0 0 #05070d, 2px 2px 0 #05070d, -2px 2px 0 #05070d, 2px -2px 0 #05070d, -2px -2px 0 #05070d, 0 4px 14px rgba(0,0,0,.6)";

/** Radios reales (km). Betelgeuse: ≈ 764 radios solares (estimación de 2020; otras mediciones la sitúan entre 640 y 880). */
const R = { earth: 6371, jupiter: 71492, sun: 695700, betel: 764 * 695700 };
/** Posición en el eje X (km) con el Sol en 0: la Tierra y Júpiter quedan a su izquierda, cerca, para que quepan en pantalla. */
const X = { sun: 0, jupiter: -887192, earth: -977055 };
const AU = 149_597_871;
const CY = 800;

type Focus = "earth" | "jupiter" | "sun" | "betelgeuse";
const FOCUS: Record<Focus, { x: number; s: number }> = {
  earth: { x: X.earth, s: 330 / R.earth },
  jupiter: { x: X.jupiter, s: 380 / R.jupiter },
  sun: { x: X.sun, s: 330 / R.sun },
  betelgeuse: { x: X.sun, s: 420 / R.betel },
};

const easeIO = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/**
 * Cámara de «alejar». La escala va en espacio logarítmico y el centro se interpola linealmente en 1/escala:
 * así hay un punto del mundo que se mantiene en el mismo sitio de la pantalla y los cuerpos se deslizan sin
 * salirse del encuadre para volver después.
 */
const camera = (a: { x: number; s: number }, b: { x: number; s: number }, p: number) => {
  const s = Math.exp(mix(Math.log(a.s), Math.log(b.s), p));
  const den = 1 / a.s - 1 / b.s;
  const w = Math.abs(den) < 1e-12 ? p : (1 / a.s - 1 / s) / den;
  return { x: mix(a.x, b.x, w), s };
};

const fade = (t: number, from: number, to?: number, out = 0.35) => clamp(ramp(t, from, from + 0.25) * (to === undefined ? 1 : 1 - ramp(t, to, to + out)));

/** Etiqueta pequeña con contorno, junto a un cuerpo diminuto. */
const Tag: React.FC<{ x: number; y: number; text: string; p: number; align?: "center" | "left" }> = ({ x, y, text, p, align = "center" }) => (
  <div style={{ position: "absolute", left: align === "center" ? x - 260 : x, width: 520, top: y, textAlign: align, fontFamily: F.mono, fontSize: 28, fontWeight: 700, color: "#fff", textShadow: OUTLINE, opacity: p }}>{text}</div>
);

// ───────────────────────────────────────────────────────── escalas: Tierra → Júpiter → Sol → Betelgeuse

const ScaleZoom: React.FC<SceneCtx> = (c) => {
  const { t, dur, cue, props, scene } = c;
  const id = scene.id;
  const to = props.focus as Focus;
  const from = (props.from ?? to) as Focus;
  const zoomLen = id === "betelgeuse" ? 1.8 : 1.2;
  const pz = easeIO(clamp((t - 0.05) / zoomLen));
  const cam = camera(FOCUS[from], FOCUS[to], pz);
  const settle = id === "gancho" ? 1 + 0.06 * (1 - ramp(t, 0, dur)) : 1; // empieza un poco más cerca y se asienta
  const s = cam.s * settle;
  const sx = (km: number) => 540 + (km - cam.x) * s;

  const slide = id === "betelgeuse" ? ramp(t, cue(15) - 0.1, cue(15) + 1.4) : 0;
  const xB = 1.15 * R.betel * (1 - slide);
  const rE = R.earth * s;
  const rJ = R.jupiter * s;
  const rS = R.sun * s;
  const rB = R.betel * s;
  const ex = sx(X.earth);
  const jx = sx(X.jupiter);
  const sunX = sx(X.sun);
  const bx = sx(xB);
  const settled = t > 0.05 + zoomLen;

  // Tamaño de referencia del cuerpo enfocado (para colocar rótulos y regla)
  const rFocus = to === "earth" ? rE : to === "jupiter" ? rJ : to === "sun" ? rS : rB;
  const labelY = CY - rFocus - 140;
  const barY = CY + rFocus + 60;
  const starZoom = Math.pow(cam.s / FOCUS.earth.s, 0.06) * 1.0 + 0.0;

  // ¿Qué se ve en cada escena?
  const showLabel = fade(t, id === "gancho" ? cue(3) : 1.3);
  const measureP = ramp(t, id === "gancho" ? cue(3) + 0.2 : 1.5, (id === "gancho" ? cue(3) + 0.2 : 1.5) + 0.7);

  const ringsT = [6.75, 7.0, 7.25, 7.5];
  const rings = [
    { name: "MERCURIO", au: 0.387, angle: 2.55 },
    { name: "VENUS", au: 0.723, angle: 3.75 },
    { name: "TIERRA", au: 1.0, angle: -0.55 },
    { name: "MARTE", au: 1.524, angle: 0.62 },
  ];
  const innerP = ramp(t, ringsT[0] - 0.1, ringsT[0] + 0.5) * (slide > 0.9 ? 1 : 0);

  return (
    <AbsoluteFill>
      <SpaceBg t={t} zoom={starZoom} />
      <Svg>
        {/* de atrás hacia delante: lo grande primero */}
        <Betelgeuse cx={bx} cy={CY} r={rB} t={t} />
        <Sun cx={sunX} cy={CY} r={rS} t={t} />
        <Jupiter cx={jx} cy={CY} r={rJ} t={t} />
        <Earth cx={ex} cy={CY} r={rE} t={t} pulse={id === "punto" ? 1 : 0} />
        {id === "punto" ? <PulseRing cx={ex} cy={CY} t={t} r0={8} /> : null}
        {id === "betelgeuse" ? <circle cx={sunX} cy={CY} r={rings[3].au * AU * s + 26} fill="#05070d" opacity={0.42 * innerP} /> : null}
        {id === "betelgeuse"
          ? rings.map((r, i) => <OrbitRing key={r.name} cx={sunX} cy={CY} r={r.au * AU * s} label={r.name === "MARTE" || r.name === "TIERRA" ? r.name : ""} p={ramp(t, ringsT[i], ringsT[i] + 0.55) * (slide > 0.9 ? 1 : 0)} hi={r.name === "MARTE" && t > cue(21) - 0.1} accent={ACCENT} angle={r.angle} />)
          : null}
      </Svg>

      {/* ── gancho */}
      {id === "gancho" ? (
        <>
          <BodyLabel x={540} y={labelY} text="TIERRA" sub="nuestro hogar" p={showLabel} accent={ACCENT} />
          <Measure x1={540 - rE} x2={540 + rE} y={barY} label="12.742 km" p={measureP} accent={ACCENT} />
        </>
      ) : null}

      {/* ── júpiter */}
      {id === "jupiter" ? (
        <>
          <BodyLabel x={540} y={labelY} text="JÚPITER" sub="el mayor planeta" p={showLabel * (settled ? 1 : 0)} accent={ACCENT} />
          <Measure x1={540 - rJ} x2={540 + rJ} y={barY} label="142.984 km" p={settled ? measureP : 0} accent={ACCENT} />
          <Tag x={ex} y={CY + rE + 24} text="Tierra" p={fade(t, 1.7)} />
          <div style={{ opacity: fade(t, 1.3, cue(6)) }}>
            <BigStat t={t} at={1.3} text="×11" label="más ancho que la Tierra" y={CY - 170} size={250} accent={ACCENT} labelColor="#fff" />
          </div>
          <div style={{ opacity: fade(t, cue(8) - 0.1) }}>
            <BigStat t={t} at={cue(8) - 0.1} text="+1.000" label="Tierras caben dentro" y={CY - 170} size={250} accent={ACCENT} labelColor="#fff" />
          </div>
        </>
      ) : null}

      {/* ── sol */}
      {id === "sol" ? (
        <>
          <BodyLabel x={540} y={labelY} text="SOL" sub="nuestra estrella" p={showLabel * (settled ? 1 : 0)} accent={ACCENT} />
          <Measure x1={540 - rS} x2={540 + rS} y={barY} label="1.392.000 km" p={settled ? measureP : 0} accent={ACCENT} />
          <Tag x={jx + 10} y={CY - rJ - 52} text="Júpiter" p={fade(t, 1.6)} />
          <Tag x={ex - 6} y={CY + 30} text="Tierra" p={fade(t, 1.9)} />
          <div style={{ opacity: fade(t, 1.3, cue(11)) }}>
            <BigStat t={t} at={1.3} text="×10" label="más ancho que Júpiter" y={CY - 170} size={250} accent={ACCENT} labelColor="#fff" />
          </div>
          <div style={{ opacity: fade(t, cue(13) - 0.1) }}>
            <BigStat t={t} at={cue(13) - 0.1} from={0} to={1300000} label="Tierras caben dentro" y={CY - 170} size={190} accent={ACCENT} countFor={1.4} labelColor="#fff" />
          </div>
        </>
      ) : null}

      {/* ── punto */}
      {id === "punto" ? (
        <>
          <Callout t={t} at={cue(3)} px={ex + 8} py={CY - 8} lx={110} ly={470} title="La Tierra" sub="109 veces más pequeña" accent={ACCENT} />
          <div style={{ opacity: fade(t, cue(6)) }}>
            <BodyLabel x={540} y={labelY} text="SOL" p={1} accent={ACCENT} />
          </div>
        </>
      ) : null}

      {/* ── betelgeuse */}
      {id === "betelgeuse" ? (
        <>
          <Tag x={sunX} y={CY - 80} text="Sol" p={fade(t, 1.9, cue(15) + 0.3) } />
          <BodyLabel x={870} y={CY - rB - 140} text="BETELGEUSE" sub="supergigante roja" p={fade(t, cue(9), cue(15)) * (1 - slide)} accent={ACCENT} />
          <div style={{ opacity: fade(t, cue(12) - 0.1, cue(15)) }}>
            <BigStat t={t} at={cue(12) - 0.1} text="×700" label="más ancha que el Sol" x={330} y={400} size={230} accent={ACCENT} labelColor="#fff" />
          </div>
          <div style={{ opacity: ramp(t, cue(21) - 0.1, cue(21) + 0.4) }}>
            <BodyLabel x={540} y={CY - rB - 140} text="MÁS ALLÁ DE MARTE" sub="su superficie llegaría a ≈ 3,5 UA" p={1} accent={ACCENT} />
          </div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};

// ───────────────────────────────────────────────────────── cierre: teaser del siguiente vídeo

const ScaleCta: React.FC<SceneCtx> = (c) => {
  const { t, cue } = c;
  const earth = { x: 170, y: 1090 };
  const sun = { x: 900, y: 420 };
  const ang = Math.atan2(sun.y - earth.y, sun.x - earth.x);
  const travel = 0.04 * ramp(t, cue(6), cue(24)); // el coche casi no avanza: ese es el chiste
  const carX = mix(earth.x, sun.x, travel) + 70 * Math.cos(ang);
  const carY = mix(earth.y, sun.y, travel) + 70 * Math.sin(ang);
  const bounce = Math.sin(t * 14) * 1.6;
  return (
    <AbsoluteFill>
      <SpaceBg t={t} />
      <Svg>
        <Sun cx={sun.x} cy={sun.y} r={210} t={t} />
        <line x1={earth.x + 50} y1={earth.y - 20} x2={sun.x - 230} y2={sun.y + 120} stroke="#fff" strokeOpacity="0.55" strokeWidth="4" strokeDasharray="4 16" strokeLinecap="round" />
        <Earth cx={earth.x} cy={earth.y} r={62} t={t} />
        <g transform={`translate(${carX} ${carY + bounce}) rotate(${(ang * 180) / Math.PI})`}>
          <rect x="-44" y="-16" width="88" height="28" rx="10" fill="#ff5a44" />
          <path d="M -18 -16 L -8 -34 L 22 -34 L 32 -16 Z" fill="#ff7d6b" />
          <rect x="-4" y="-30" width="22" height="12" rx="3" fill="#bfe9ff" />
          <circle cx="-24" cy="14" r="10" fill="#161a28" />
          <circle cx="24" cy="14" r="10" fill="#161a28" />
          <circle cx="-24" cy="14" r="4" fill="#9aa4bb" />
          <circle cx="24" cy="14" r="4" fill="#9aa4bb" />
        </g>
      </Svg>
      <Tag x={earth.x} y={earth.y + 78} text="Tierra" p={fade(t, 0.3)} />
      <Tag x={earth.x + 150} y={earth.y + 118} text="a 149.600.000 km del Sol" p={fade(t, cue(10))} />
      <Banner t={t} at={cue(6)} text="Mañana" x={300} y={340} rotate={-4} accent={ACCENT} size={96} />
      <Banner t={t} at={cue(7) + 0.1} text="¿Al Sol en coche?" x={420} y={480} rotate={2} accent="#ffffff" size={56} />
      <BigStat t={t} at={cue(22) - 0.1} text="170 años" label="a 100 km/h" x={540} y={610} size={200} accent={ACCENT} />
      <Banner t={t} at={cue(25)} text="Sigue el canal" x={540} y={1190} rotate={-2} accent={ACCENT} size={84} />
    </AbsoluteFill>
  );
};

export const SCALE_SCENES: Record<string, React.FC<SceneCtx>> = {
  "scale-zoom": ScaleZoom,
  "scale-cta": ScaleCta,
};
