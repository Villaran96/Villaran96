import React from "react";
import { AbsoluteFill } from "remotion";
import { F } from "../../explainer/theme";
import { BigStat, Banner, Callout, DepthMeter, Gauge, usePopAt } from "../kit/hud";
import { Angler, DeepWater, FishSchool, Jelly, Squid, Sub, Svg, Whale } from "../kit/water";
import type { SceneCtx } from "../types";
import { mix, ramp, sway } from "../util";

// Escenas del nicho «Misterios del Océano». Todas comparten el mismo fondo continuo: la profundidad
// va de `props.from` a `props.to` y la escena siguiente arranca donde acabó esta.

const ACCENT = "#ffd34d";
const depthOf = (c: SceneCtx, easeEnd = c.dur): number => mix(c.props.from ?? 0, c.props.to ?? c.props.from ?? 0, ramp(c.t, 0, easeEnd));
const dim = (depth: number, a: number, b: number, min = 0.35) => 1 - (1 - min) * ramp(depth, a, b);

// ───────────────────────────────────────────────────────── 1 · superficie

const Surface: React.FC<SceneCtx> = (c) => {
  const { t, dur, cue } = c;
  const dive = ramp(t, cue(13), dur);
  const depth = 70 * dive;
  const waterY = 840 - depth * 18;
  const wave = (x: number) => waterY + Math.sin(x / 70 + t * 1.6) * 7 + Math.sin(x / 31 - t * 2.1) * 3;
  const wavePath = `M 0 ${wave(0)} ` + Array.from({ length: 28 }, (_, i) => `L ${(i + 1) * 40} ${wave((i + 1) * 40)}`).join(" ");
  const statOpacity = 1 - ramp(t, cue(13), cue(13) + 0.5);
  return (
    <AbsoluteFill>
      <DeepWater depth={depth} t={t} />
      {waterY > -30 ? (
        <>
          <AbsoluteFill style={{ height: Math.max(0, waterY + 12), background: "linear-gradient(180deg, #3f95e0 0%, #7cc4f2 55%, #d4efff 100%)", overflow: "hidden" }} />
          <Svg>
            <defs>
              <radialGradient id="sunG">
                <stop offset="0" stopColor="#fff7d6" stopOpacity="0.95" />
                <stop offset="1" stopColor="#fff7d6" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="800" cy={waterY - 330} r="340" fill="url(#sunG)" />
            <circle cx="800" cy={waterY - 330} r="62" fill="#fffbe8" />
            {[0, 1, 2].map((i) => (
              <g key={i} opacity="0.92" transform={`translate(${((i * 480 + t * 14) % 1500) - 200} ${waterY - 700 + i * 60})`}>
                <ellipse rx="130" ry="34" fill="#fff" />
                <ellipse cx="-60" cy="-22" rx="70" ry="38" fill="#fff" />
                <ellipse cx="50" cy="-30" rx="82" ry="42" fill="#fff" />
              </g>
            ))}
            <g transform={`translate(250 ${waterY - 4}) rotate(${sway(t, 0.25, 2.2)})`}>
              <polygon points="-6,-210 -6,-30 90,-30" fill="#f3ead8" />
              <polygon points="-18,-190 -18,-30 -84,-30" fill="#e2d2b6" />
              <rect x="-8" y="-222" width="4" height="196" fill="#4a3a2a" />
              <path d="M -110 -26 L 120 -26 L 86 22 L -80 22 Z" fill="#9c2f2a" />
              <rect x="-110" y="-30" width="230" height="8" fill="#f3ead8" />
            </g>
            <path d={`${wavePath} L 1080 ${waterY + 200} L 0 ${waterY + 200} Z`} fill="#4fb4e6" opacity="0.55" />
            <path d={wavePath} stroke="#fff" strokeWidth="5" fill="none" opacity="0.7" />
          </Svg>
        </>
      ) : null}
      <div style={{ opacity: statOpacity }}>
        <BigStat t={t} at={cue(2)} text="2/3" label="del fondo marino, sin cartografiar al detalle" y={190} size={290} accent={ACCENT} />
      </div>
      <DepthMeter depth={depth} opacity={ramp(t, cue(13), cue(14))} />
    </AbsoluteFill>
  );
};

// ───────────────────────────────────────────────────────── 2 · la luz se apaga

const Light: React.FC<SceneCtx> = (c) => {
  const { t } = c;
  const depth = depthOf(c);
  const k = dim(depth, 120, 260);
  return (
    <AbsoluteFill>
      <DeepWater depth={depth} t={t} />
      <Svg>
        <Whale x={mix(1350, -250, ramp(t, 0, 7))} y={560} s={0.7} flip={false} t={t} op={0.85 * k} />
        <FishSchool x={mix(1350, -150, ramp(t, 0, 5.5))} y={900} t={t} w={380} h={240} n={18} seed={2} flip />
        <FishSchool x={mix(-250, 1250, ramp(t, 0.5, 6.5))} y={1080} t={t} w={300} h={180} n={12} seed={5} color="#7fe0c4" />
      </Svg>
      <DepthMeter depth={depth} />
    </AbsoluteFill>
  );
};

// ───────────────────────────────────────────────────────── 3 · calamar gigante

const SquidScene: React.FC<SceneCtx> = (c) => {
  const { t, cue, dur } = c;
  const depth = depthOf(c);
  const sx = mix(1350, 640, ramp(t, 0, dur * 0.85));
  return (
    <AbsoluteFill>
      <DeepWater depth={depth} t={t} />
      <Svg>
        <Squid x={sx} y={800 + sway(t, 0.12, 18)} s={1.0} flip={false} t={t} />
      </Svg>
      <DepthMeter depth={depth} />
      <Callout t={t} at={cue(7)} px={sx + 170} py={790} lx={70} ly={580} title="Calamar gigante" sub="hasta 13 m de largo" accent={ACCENT} />
      <Banner t={t} at={cue(19)} text="Grabado en 2012" x={540} y={1090} rotate={-3} accent={ACCENT} size={72} />
    </AbsoluteFill>
  );
};

// ───────────────────────────────────────────────────────── 4 · oscuridad

const Dark: React.FC<SceneCtx> = (c) => {
  const { t, cue } = c;
  const depth = depthOf(c);
  const subY = mix(-180, 760, ramp(t, 0, 2.4));
  return (
    <AbsoluteFill>
      <DeepWater depth={depth} t={t} />
      <Svg>
        <Sub x={420} y={subY} s={1.05} t={t} light={ramp(t, 0.6, 1.4)} />
      </Svg>
      <DepthMeter depth={depth} />
      <BigStat t={t} at={cue(8)} text="0%" label="de luz solar" y={290} size={230} accent={ACCENT} />
    </AbsoluteFill>
  );
};

// ───────────────────────────────────────────────────────── 5 · luz propia

const Glow: React.FC<SceneCtx> = (c) => {
  const { t, cue } = c;
  const depth = depthOf(c);
  const g = ramp(t, 0.2, 1.4);
  return (
    <AbsoluteFill>
      <DeepWater depth={depth} t={t} />
      <Svg>
        <Jelly x={210} y={mix(1000, 900, ramp(t, 0, 6)) + sway(t, 0.2, 14)} s={1.25} t={t} seed={1} glow={g} />
        <Jelly x={560} y={mix(1150, 980, ramp(t, 0, 6))} s={0.9} t={t} seed={2} color="#ff9bf0" glow={g} />
        <Jelly x={830} y={mix(920, 800, ramp(t, 0, 6)) + sway(t, 0.17, 12, 0.4)} s={1.05} t={t} seed={3} color="#9cff9c" glow={g} />
        <Angler x={mix(1450, 760, ramp(t, 1.2, 4.2))} y={1130} s={0.95} t={t} glow={ramp(t, 2.0, 3.4)} />
      </Svg>
      <DepthMeter depth={depth} />
      <BigStat t={t} at={cue(6)} text="3 de 4" label="animales con luz propia" y={290} size={230} accent={ACCENT} />
    </AbsoluteFill>
  );
};

// ───────────────────────────────────────────────────────── 6 · presión

const Pressure: React.FC<SceneCtx> = (c) => {
  const { t, cue } = c;
  const depth = depthOf(c);
  const value = 1 + 400 * ramp(t, cue(4), cue(9) + 0.6);
  const p = usePopAt(t, 0.2);
  return (
    <AbsoluteFill>
      <DeepWater depth={depth} t={t} />
      <Gauge x={540} y={560} r={190} value={value} max={420} unit="ATM · PRESIÓN" t={t} shake={ramp(value, 200, 400)} />
      <Svg>
        <Sub x={540} y={1040} s={1.15 * (0.85 + 0.15 * p)} t={t} light={0.9} squeeze={ramp(value, 40, 400)} />
      </Svg>
      <DepthMeter depth={depth} />
    </AbsoluteFill>
  );
};

// ───────────────────────────────────────────────────────── 7 · Challenger vs Everest

const Trench: React.FC<SceneCtx> = (c) => {
  const { t, cue } = c;
  const depth = depthOf(c, cue(8));
  const show = ramp(t, cue(8), cue(8) + 0.6);
  const SURF = 410;
  const GROUND = 1150;
  const ppm = (GROUND - SURF) / 10935;
  const summit = GROUND - 8849 * ppm;
  const drop = 1 - ramp(t, cue(15), cue(15) + 1.1);
  const bracket = ramp(t, cue(19), cue(19) + 0.7);
  const label = usePopAt(t, cue(8));
  return (
    <AbsoluteFill>
      <DeepWater depth={depth} t={t} />
      <Svg style={{ opacity: show }}>
        <defs>
          <linearGradient id="rock" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2b2f3a" />
            <stop offset="1" stopColor="#0c0e14" />
          </linearGradient>
          <linearGradient id="mount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8e97a8" />
            <stop offset="1" stopColor="#3b4352" />
          </linearGradient>
        </defs>
        <line x1="80" y1={SURF} x2="900" y2={SURF} stroke="#9fe4ff" strokeWidth="5" strokeDasharray="14 12" />
        <text x="80" y={SURF - 16} fontFamily={F.mono} fontSize="28" fill="#9fe4ff" fontWeight="700">
          SUPERFICIE
        </text>
        <path d={`M 40 ${GROUND - 120} L 190 ${GROUND - 120} L 300 ${GROUND} L 780 ${GROUND} L 890 ${GROUND - 120} L 1040 ${GROUND - 120} L 1040 ${GROUND + 130} L 40 ${GROUND + 130} Z`} fill="url(#rock)" />
        <g transform={`translate(0 ${-drop * 1500})`}>
          <polygon points={`260,${GROUND} 540,${summit} 820,${GROUND}`} fill="url(#mount)" />
          <polygon points={`540,${summit} 592,${summit + 92} 540,${summit + 66} 492,${summit + 96}`} fill="#f4f7fb" />
        </g>
        <text x="540" y={GROUND + 54} textAnchor="middle" fontFamily={F.display} fontSize="52" fill="#fff" opacity={label}>
          ABISMO CHALLENGER · 10.935 m
        </text>
        {/* llave que marca los metros de agua sobre la cima */}
        <g opacity={bracket}>
          <line x1="870" y1={SURF} x2="870" y2={summit} stroke={ACCENT} strokeWidth="5" />
          <line x1="852" y1={SURF} x2="888" y2={SURF} stroke={ACCENT} strokeWidth="5" />
          <line x1="852" y1={summit} x2="888" y2={summit} stroke={ACCENT} strokeWidth="5" />
        </g>
      </Svg>
      <div style={{ position: "absolute", left: 590, width: 260, top: SURF + (summit - SURF) / 2 - 60, textAlign: "right", opacity: bracket, fontFamily: F.display, color: ACCENT, textShadow: "0 4px 14px rgba(0,0,0,.7)" }}>
        <div style={{ fontSize: 70, lineHeight: 1 }}>+2.000 m</div>
        <div style={{ fontFamily: F.mono, fontSize: 28, color: "#fff" }}>de agua encima</div>
      </div>
      <div style={{ position: "absolute", left: 40, width: 400, top: summit + 40, textAlign: "right", opacity: 1 - drop, fontFamily: F.display, color: "#fff", fontSize: 54, lineHeight: 1.05, textShadow: "0 4px 14px rgba(0,0,0,.7)" }}>
        EVEREST
        <div style={{ fontFamily: F.mono, fontSize: 28, color: ACCENT }}>8.849 m</div>
      </div>
      <DepthMeter depth={depth} />
    </AbsoluteFill>
  );
};

// ───────────────────────────────────────────────────────── 8 · cierre

const Outro: React.FC<SceneCtx> = (c) => {
  const { t, cue } = c;
  const depth = depthOf(c);
  return (
    <AbsoluteFill>
      <DeepWater depth={depth} t={t} />
      <Svg>
        <Angler x={mix(1000, 600, ramp(t, 0, 3))} y={860 + sway(t, 0.15, 14)} s={1.2} t={t} glow={1} />
        <Jelly x={170} y={980} s={0.8} t={t} seed={7} glow={0.8} />
      </Svg>
      <DepthMeter depth={depth} />
      <Banner t={t} at={cue(5)} text="Sigue el canal" x={540} y={400} rotate={-3} accent={ACCENT} size={96} />
      <Banner t={t} at={cue(9)} text="Mañana, más profundo" x={540} y={560} rotate={2} accent="#ffffff" size={52} />
    </AbsoluteFill>
  );
};

export const OCEAN_SCENES: Record<string, React.FC<SceneCtx>> = {
  "ocean-surface": Surface,
  "ocean-light": Light,
  "ocean-squid": SquidScene,
  "ocean-dark": Dark,
  "ocean-glow": Glow,
  "ocean-pressure": Pressure,
  "ocean-trench": Trench,
  "ocean-outro": Outro,
};
