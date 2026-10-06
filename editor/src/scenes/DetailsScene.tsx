import type React from "react";
import {
  AbsoluteFill,
  Interactive,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { Ripples } from "../components/Fx";
import { EASE_IN_OUT } from "../components/motion";
import { CARD_SPOTS, NfcCard } from "../components/NfcCard";
import { SANS } from "../fonts";
import { BRAND_DOTS, COLORS, cues } from "../theme";
import { REVEAL_END_POSE, revealPose } from "./RevealScene";

type Props = {
  readonly title1: string;
  readonly sub1: string;
  readonly title2: string;
  readonly sub2: string;
  readonly title3: string;
  readonly sub3: string;
  readonly title4: string;
  readonly sub4: string;
  readonly frontImage?: string;
  readonly style?: React.CSSProperties;
};

const c = cues.details;
const CROSSFADE = 15; // los primeros fotogramas replican el final de la revelación
const REVEAL_OFFSET = 180 - CROSSFADE;

type Cam = { zoom: number; fx: number; fy: number; rx: number; ry: number; rz: number; y: number };

const START: Cam = { zoom: REVEAL_END_POSE.scale, fx: 0, fy: 0, rx: REVEAL_END_POSE.rotX, ry: REVEAL_END_POSE.rotY, rz: 0, y: REVEAL_END_POSE.y };
// Paradas de cámara: cada una encuadra un detalle del diseño real.
const STOPS: Cam[] = [
  { zoom: 2.2, fx: CARD_SPOTS.heading.x, fy: (CARD_SPOTS.heading.y + CARD_SPOTS.stars.y) / 2, rx: 12, ry: -14, rz: -1.5, y: 820 },
  { zoom: 2.7, fx: CARD_SPOTS.logo.x, fy: CARD_SPOTS.logo.y, rx: -8, ry: 16, rz: 1, y: 820 },
  { zoom: 2.5, fx: CARD_SPOTS.nfc.x, fy: CARD_SPOTS.nfc.y, rx: 10, ry: -18, rz: -1, y: 820 },
  { zoom: 1.45, fx: 0, fy: 0, rx: 14, ry: 56, rz: -3, y: 840 },
];
const END: Cam = { zoom: 1.0, fx: 0, fy: 0, rx: 8, ry: -10, rz: 0, y: 840 };

const mix = (a: Cam, b: Cam, t: number): Cam => ({
  zoom: a.zoom + (b.zoom - a.zoom) * t,
  fx: a.fx + (b.fx - a.fx) * t,
  fy: a.fy + (b.fy - a.fy) * t,
  rx: a.rx + (b.rx - a.rx) * t,
  ry: a.ry + (b.ry - a.ry) * t,
  rz: a.rz + (b.rz - a.rz) * t,
  y: a.y + (b.y - a.y) * t,
});

// Durante cada parada la cámara no se congela: sigue acercándose y orbitando muy despacio.
const drift = (cam: Cam, t: number, dir: number): Cam => ({ ...cam, zoom: cam.zoom * (1 + 0.05 * t), ry: cam.ry + dir * 5 * t, rx: cam.rx - 1.5 * t });

const ease = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_IN_OUT });

export const detailsCamera = (frame: number): Cam => {
  const s = c.stops;
  const held = STOPS.map((stop, i) => drift(stop, 1, i % 2 ? -1 : 1));
  if (frame <= CROSSFADE) return START;
  if (frame <= s[0].arrive) return mix(START, STOPS[0], ease(frame, CROSSFADE, s[0].arrive));
  for (let i = 0; i < s.length; i++) {
    const dir = i % 2 ? -1 : 1;
    if (frame <= s[i].leave) return drift(STOPS[i], ease(frame, s[i].arrive, s[i].leave), dir);
    const next = i + 1 < s.length ? STOPS[i + 1] : END;
    const nextArrive = i + 1 < s.length ? s[i + 1].arrive : 330;
    if (frame <= nextArrive) return mix(held[i], next, ease(frame, s[i].leave, nextArrive));
  }
  return END;
};

const Bokeh: React.FC<{ fx: number; fy: number }> = ({ fx, fy }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      {new Array(16).fill(0).map((_, i) => {
        const depth = 0.3 + random(`bk-d-${i}`) * 0.7;
        const size = 120 + random(`bk-s-${i}`) * 260;
        const x = random(`bk-x-${i}`) * 1080 + fx * 0.25 * depth + Math.sin(frame / 60 + i) * 20;
        const y = random(`bk-y-${i}`) * 1920 + fy * 0.35 * depth - frame * 0.4 * depth;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              background: BRAND_DOTS[i % 4],
              opacity: 0.08 + depth * 0.1,
              filter: `blur(${30 + (1 - depth) * 30}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Super: React.FC<{ index: number; title: string; sub: string; inAt: number; outAt: number }> = ({ index, title, sub, inAt, outAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - inAt, fps, config: { damping: 18, stiffness: 140 } });
  const exit = spring({ frame: frame - outAt, fps, config: { damping: 18, stiffness: 160 } });
  if (frame < inAt - 2 || frame > outAt + 20) return null;
  const v = enter * (1 - exit);
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        bottom: 200,
        padding: "34px 44px",
        borderRadius: 40,
        background: "rgba(8,12,24,0.62)",
        border: "1.5px solid rgba(255,255,255,0.16)",
        backdropFilter: "blur(22px)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
        opacity: v,
        translate: `0 ${(1 - enter) * 80 + exit * 40}px`,
        fontFamily: SANS,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, color: COLORS.blue, fontWeight: 800, fontSize: 30, letterSpacing: 5 }}>
        <div style={{ width: 54 * enter, height: 4, borderRadius: 2, background: COLORS.blue }} />
        DETALLE 0{index}
      </div>
      <div style={{ color: "white", fontWeight: 900, fontSize: 74, letterSpacing: -2, lineHeight: 1.05, marginTop: 10 }}>{title}</div>
      <div style={{ color: COLORS.mist, fontWeight: 500, fontSize: 38, marginTop: 8 }}>{sub}</div>
    </div>
  );
};

const DetailsSceneInner: React.FC<Props> = ({ title1, sub1, title2, sub2, title3, sub3, title4, sub4, frontImage, style }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  // Los primeros fotogramas usan la pose exacta de la revelación para que el fundido sea invisible.
  const inCrossfade = frame < CROSSFADE;
  const rp = revealPose(frame + REVEAL_OFFSET);
  const cam = detailsCamera(frame);
  const prevCam = detailsCamera(Math.max(0, frame - 1));
  const speed = Math.abs(cam.zoom - prevCam.zoom) * 30 + Math.abs(cam.ry - prevCam.ry) * 0.16 + Math.abs(cam.fy - prevCam.fy) * 0.012;
  const blur = inCrossfade ? 0 : Math.min(2.2, speed);
  const floatY = Math.sin((frame + REVEAL_OFFSET) / 34) * 4;

  const s = c.stops;
  // Un barrido de luz por la tarjeta al llegar a cada detalle (fuera de cuadro entre barridos).
  const lastArrive = [...s].reverse().find((st) => frame >= st.arrive)?.arrive;
  const sweep = lastArrive === undefined ? 2 : interpolate(frame, [lastArrive, lastArrive + 44], [-0.15, 1.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_IN_OUT });
  const pose = inCrossfade
    ? { zoom: rp.scale, fx: 0, fy: 0, rx: rp.rotX, ry: rp.rotY, rz: 0, y: REVEAL_END_POSE.y + rp.y, shine: rp.shine }
    : { ...cam, shine: sweep };
  const active = s.filter((st) => frame >= st.arrive - 6).length;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink, background: `radial-gradient(ellipse 80% 60% at 50% 45%, #13224a 0%, ${COLORS.ink} 70%)`, ...style }}>
      <Bokeh fx={-cam.fx} fy={-cam.fy} />
      <div style={{ position: "absolute", left: 0, top: 0, width, height: pose.y * 2, perspective: 2000 }}>
        <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", translate: `0 ${floatY}px`, filter: blur > 0.15 ? `blur(${blur}px)` : undefined }}>
          <NfcCard
            rotateX={pose.rx}
            rotateY={pose.ry}
            rotateZ={pose.rz}
            scale={pose.zoom}
            focusX={pose.fx}
            focusY={pose.fy}
            shine={pose.shine}
            frontImage={frontImage}
          />
        </div>
      </div>
      <Ripples at={c.ripples} x={width / 2} y={STOPS[2].y} color={COLORS.blue} rings={4} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)" }} />

      {/* Indicador de detalle */}
      <div style={{ position: "absolute", top: 140, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 16, opacity: interpolate(frame, [20, 34, 300, 320], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        {s.map((_, i) => (
          <div key={i} style={{ width: i < active ? 64 : 22, height: 10, borderRadius: 5, background: i < active ? "white" : "rgba(255,255,255,0.3)" }} />
        ))}
      </div>

      <Super index={1} title={title1} sub={sub1} inAt={s[0].arrive - 4} outAt={s[0].leave - 6} />
      <Super index={2} title={title2} sub={sub2} inAt={s[1].arrive - 4} outAt={s[1].leave - 6} />
      <Super index={3} title={title3} sub={sub3} inAt={s[2].arrive - 4} outAt={s[2].leave - 6} />
      <Super index={4} title={title4} sub={sub4} inAt={s[3].arrive - 4} outAt={s[3].leave + 2} />
    </AbsoluteFill>
  );
};

const detailsSchema = {
  title1: { type: "text-content", default: "Mensaje claro", description: "Detalle 1" },
  sub1: { type: "text-content", default: "Invita a valorar con 5 estrellas", description: "Detalle 1 (texto)" },
  title2: { type: "text-content", default: "Directo a Google", description: "Detalle 2" },
  sub2: { type: "text-content", default: "Abre tu perfil para dejar la reseña", description: "Detalle 2 (texto)" },
  title3: { type: "text-content", default: "Chip NFC integrado", description: "Detalle 3" },
  sub3: { type: "text-content", default: "Basta con acercar el móvil", description: "Detalle 3 (texto)" },
  title4: { type: "text-content", default: "Acabado acrílico", description: "Detalle 4" },
  sub4: { type: "text-content", default: "Elegante en cualquier mostrador", description: "Detalle 4 (texto)" },
  frontImage: { type: "asset", default: undefined, description: "Diseño de la tarjeta (opcional)" },
} as const satisfies InteractivitySchema;

export const DetailsScene = Interactive.withSchema({
  Component: DetailsSceneInner,
  componentName: "<DetailsScene>",
  schema: detailsSchema,
  wrapInSequence: true,
});
