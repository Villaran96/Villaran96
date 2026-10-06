import { ThreeCanvas } from "@remotion/three";
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
import type * as THREE from "three";
import { Particles } from "../components/Fx";
import { EASE_IN_OUT, EASE_OUT, progress } from "../components/motion";
import { MaskLine } from "../components/Typo";
import { SANS, SERIF } from "../fonts";
import { BRAND_DOTS, COLORS, cues } from "../theme";
import { Ripples3D } from "../three/Ripples3D";
import { CameraRig, CARD, CardModel, GL_PROPS, SPOTS, StudioEnvironment, StudioFloor, StudioLights } from "../three/stage";

type Props = {
  readonly title: string;
  readonly titleAccent: string;
  readonly subtitle: string;
  readonly title1: string;
  readonly sub1: string;
  readonly title2: string;
  readonly sub2: string;
  readonly title3: string;
  readonly sub3: string;
  readonly title4: string;
  readonly sub4: string;
  readonly heroLine: string;
  readonly heroSub: string;
  readonly frontImage?: string;
  readonly style?: React.CSSProperties;
};

type V3 = [number, number, number];
const c = cues.film;
const FLOOR = -0.5;
const FACE_Z = CARD.depth / 2 + 0.006;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const spot = (v: THREE.Vector3): V3 => [v.x, v.y, FACE_Z];

const REVEAL_END_POS: V3 = [0, 0.2, 4.2];
const REVEAL_END_TARGET: V3 = [0, -0.18, 0];

type Shot = { pos: V3; target: V3; fov: number; roll: number; cardRotY: number };

// Guion de cámara: plano continuo de revelación + macros con cortes en cada compás.
export const filmShot = (f: number): Shot => {
  const [cut2, cut3, cut4, cut5] = c.cuts;
  if (f < 180) {
    const turn = progress(f, c.impact, c.turnEnd, EASE_OUT);
    const sway = progress(f, c.turnEnd, 118, EASE_IN_OUT);
    const settle = progress(f, 118, 180, EASE_IN_OUT);
    const push = progress(f, 0, 180, EASE_IN_OUT);
    return {
      pos: lerp3([0, 0.05, 5.4], REVEAL_END_POS, push),
      target: lerp3([0, -0.1, 0], REVEAL_END_TARGET, push),
      fov: 30,
      roll: 0,
      cardRotY: interpolate(turn, [0, 1], [-1.5, -0.45]) + sway * 0.75 - settle * 0.3,
    };
  }
  if (f < cut2) {
    // Plano 1 (sin corte): entra en macro sobre el mensaje y las estrellas.
    const t = progress(f, 180, cut2, EASE_IN_OUT);
    const focus: V3 = [0, (SPOTS.stars.y + SPOTS.heading.y) / 2, FACE_Z];
    return { pos: lerp3(REVEAL_END_POS, add(focus, [0.14, 0.1, 1.5]), t), target: lerp3(REVEAL_END_TARGET, focus, t), fov: interpolate(t, [0, 1], [30, 27]), roll: t * -0.03, cardRotY: 0 };
  }
  if (f < cut3) {
    // Plano 2: la G en contrapicado, travelling lateral lento.
    const t = progress(f, cut2, cut3, EASE_IN_OUT);
    const p = spot(SPOTS.logo);
    return { pos: add(p, lerp3([-0.58, -0.24, 0.98], [-0.36, -0.15, 0.86], t)), target: p, fov: 27, roll: interpolate(t, [0, 1], [0.05, 0.01]), cardRotY: 0 };
  }
  if (f < cut4) {
    // Plano 3: el chip NFC visto desde arriba a la derecha.
    const t = progress(f, cut3, cut4, EASE_IN_OUT);
    const p = spot(SPOTS.nfc);
    return { pos: add(p, lerp3([0.4, 0.34, 0.8], [0.22, 0.2, 0.7], t)), target: p, fov: 27, roll: interpolate(t, [0, 1], [-0.04, 0]), cardRotY: 0 };
  }
  if (f < cut5) {
    // Plano 4: perfil rasante recorriendo el canto de acrílico.
    const t = progress(f, cut4, cut5, EASE_IN_OUT);
    const target: V3 = [0.46, interpolate(t, [0, 1], [0.28, -0.2]), 0];
    return { pos: add(target, [1.0, 0.12, 0.2]), target, fov: 30, roll: interpolate(t, [0, 1], [0.03, -0.02]), cardRotY: interpolate(t, [0, 1], [0.42, 0.18]) };
  }
  // Plano 5: héroe, la tarjeta gira despacio mientras la cámara se abre.
  const t = progress(f, cut5, 495, EASE_IN_OUT);
  return { pos: lerp3([0, 0.14, 2.7], [0, 0.3, 3.9], t), target: lerp3([0, -0.2, 0], [0, -0.32, 0], t), fov: 30, roll: 0, cardRotY: interpolate(t, [0, 1], [-0.6, 0.22]) };
};

const Bokeh: React.FC<{ opacity: number }> = ({ opacity }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity }}>
      {new Array(14).fill(0).map((_, i) => {
        const depth = 0.3 + random(`fb-d-${i}`) * 0.7;
        const size = 140 + random(`fb-s-${i}`) * 280;
        const x = random(`fb-x-${i}`) * 1080 + Math.sin(frame / 70 + i) * 24;
        const y = random(`fb-y-${i}`) * 1920 - frame * 0.35 * depth;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: ((y % 2200) + 2200) % 2200 - 140,
              width: size,
              height: size,
              borderRadius: "50%",
              background: BRAND_DOTS[i % 4],
              opacity: 0.07 + depth * 0.1,
              filter: `blur(${34 + (1 - depth) * 30}px)`,
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
  if (frame < inAt - 1 || frame > outAt + 16) return null;
  const panel = spring({ frame: frame - inAt, fps, config: { damping: 20, stiffness: 150 } });
  const gone = spring({ frame: frame - outAt, fps, config: { damping: 22, stiffness: 170 } });
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        bottom: 190,
        padding: "34px 44px 38px",
        borderRadius: 40,
        background: "rgba(8,12,24,0.6)",
        border: "1.5px solid rgba(255,255,255,0.16)",
        backdropFilter: "blur(22px)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
        opacity: panel * (1 - gone),
        scale: String(0.96 + panel * 0.04),
        fontFamily: SANS,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, color: COLORS.blue, fontWeight: 800, fontSize: 30, letterSpacing: 5 }}>
        <div style={{ width: 54 * panel, height: 4, borderRadius: 2, background: COLORS.blue }} />
        DETALLE 0{index}
      </div>
      <MaskLine at={inAt + 3} style={{ marginTop: 10 }}>
        <div style={{ color: "white", fontWeight: 900, fontSize: 74, letterSpacing: -2, lineHeight: 1.05 }}>{title}</div>
      </MaskLine>
      <MaskLine at={inAt + 8}>
        <div style={{ color: COLORS.mist, fontWeight: 500, fontSize: 38, marginTop: 8 }}>{sub}</div>
      </MaskLine>
    </div>
  );
};

const FilmSceneInner: React.FC<Props> = ({
  title,
  titleAccent,
  subtitle,
  title1,
  sub1,
  title2,
  sub2,
  title3,
  sub3,
  title4,
  sub4,
  heroLine,
  heroSub,
  frontImage,
  style,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const shot = filmShot(frame);
  const prevShot = filmShot(Math.max(0, frame - 1));
  // Desenfoque de movimiento solo en el giro rápido de la revelación (nunca en los cortes).
  const turnBlur = frame < 60 ? Math.min(2.4, Math.abs(shot.cardRotY - prevShot.cardRotY) * 22) : 0;

  // Foco cenital: se enciende con un parpadeo en el golpe y se apaga al entrar en macro.
  const flicker = frame < 8 ? [0.2, 0.9, 0.3, 1, 0.6, 1, 0.85, 1][frame] : 1;
  const cone = flicker * interpolate(frame, [0, 4, 180, 220], [0, 1, 1, 0], clamp);
  const bokeh = interpolate(frame, [175, 235, 420, 470], [0, 1, 1, 0.4], clamp);
  const flash = interpolate(frame, [0, 10], [0.85, 0], clamp);
  const shock = progress(frame, 0, 30);
  const lastCut = [...c.cuts].reverse().find((k) => frame >= k);
  const cutFlash = lastCut === undefined ? 0 : interpolate(frame - lastCut, [0, 6], [0.16, 0], clamp);
  const activeDetail = c.supers.filter(([a]) => frame >= a - 4).length;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink, background: `radial-gradient(ellipse 85% 60% at 50% 40%, #16264f 0%, ${COLORS.ink} 72%)`, ...style }}>
      <Bokeh opacity={bokeh} />
      <AbsoluteFill
        style={{
          opacity: cone * 0.9,
          background: "linear-gradient(180deg, rgba(200,222,255,0.0) 0%, rgba(200,222,255,0.22) 35%, rgba(200,222,255,0.06) 75%, transparent 85%)",
          clipPath: "polygon(40% 0, 60% 0, 88% 78%, 12% 78%)",
          filter: "blur(34px)",
        }}
      />
      <Particles count={42} seed="film" color="190,215,255" />
      <div
        style={{
          position: "absolute",
          left: width / 2 - 720 * shock,
          top: 700 - 720 * shock,
          width: 1440 * shock,
          height: 1440 * shock,
          borderRadius: "50%",
          border: `${10 * (1 - shock)}px solid rgba(255,255,255,0.75)`,
          opacity: 1 - shock,
        }}
      />

      <AbsoluteFill style={{ filter: turnBlur > 0.2 ? `blur(${turnBlur}px)` : undefined }}>
        <ThreeCanvas width={width} height={height} shadows gl={GL_PROPS}>
          <CameraRig position={shot.pos} target={shot.target} fov={shot.fov} roll={shot.roll} />
          <StudioEnvironment intensity={1.1} />
          <StudioLights rimAngle={frame / 45} rim={frame < 180 ? interpolate(frame, [0, 20], [0, 1], clamp) : 0.8} />
          <StudioFloor y={FLOOR} />
          <CardModel image={frontImage} position={[0, 0.004, 0]} rotation={[0, shot.cardRotY, 0]} reflection={{ floorY: FLOOR, opacity: 0.34, fade: 0.5 }} />
          <Ripples3D at={c.ripples} center={spot(SPOTS.nfc)} />
        </ThreeCanvas>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.5) 100%)" }} />

      {/* Título de la revelación */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 300, textAlign: "center" }}>
        <MaskLine at={c.title} outAt={c.titleOut}>
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 128, color: "white", letterSpacing: -3, lineHeight: 1 }}>{title}</div>
        </MaskLine>
        <MaskLine at={c.title + 10} outAt={c.titleOut + 2}>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 120, color: COLORS.gold, lineHeight: 1.1 }}>{titleAccent}</div>
        </MaskLine>
        <MaskLine at={c.subtitle} outAt={c.titleOut + 4} style={{ marginTop: 30 }}>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 46, color: COLORS.mist, letterSpacing: 1 }}>{subtitle}</div>
        </MaskLine>
      </AbsoluteFill>

      {/* Indicador de detalle */}
      <div style={{ position: "absolute", top: 140, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 16, opacity: interpolate(frame, [186, 200, 414, 430], [0, 1, 1, 0], clamp) }}>
        {c.supers.map((_, i) => (
          <div key={i} style={{ width: i < activeDetail ? 64 : 22, height: 10, borderRadius: 5, background: i < activeDetail ? "white" : "rgba(255,255,255,0.3)" }} />
        ))}
      </div>

      <Super index={1} title={title1} sub={sub1} inAt={c.supers[0][0]} outAt={c.supers[0][1]} />
      <Super index={2} title={title2} sub={sub2} inAt={c.supers[1][0]} outAt={c.supers[1][1]} />
      <Super index={3} title={title3} sub={sub3} inAt={c.supers[2][0]} outAt={c.supers[2][1]} />
      <Super index={4} title={title4} sub={sub4} inAt={c.supers[3][0]} outAt={c.supers[3][1]} />

      {/* Frase final del plano héroe */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 230, textAlign: "center" }}>
        <MaskLine at={c.heroLine}>
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 92, color: "white", letterSpacing: -2, lineHeight: 1 }}>{heroLine}</div>
        </MaskLine>
        <MaskLine at={c.heroLine + 10} style={{ marginTop: 14 }}>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 92, color: COLORS.gold }}>{heroSub}</div>
        </MaskLine>
      </AbsoluteFill>

      <AbsoluteFill style={{ background: "white", opacity: Math.max(flash, cutFlash) }} />
    </AbsoluteFill>
  );
};

const filmSchema = {
  title: { type: "text-content", default: "Tarjeta NFC", description: "Título" },
  titleAccent: { type: "text-content", default: "de reseñas", description: "Título (acento)" },
  subtitle: { type: "text-content", default: "Un toque. Una reseña.", description: "Subtítulo" },
  title1: { type: "text-content", default: "Mensaje claro", description: "Detalle 1" },
  sub1: { type: "text-content", default: "Invita a valorar con 5 estrellas", description: "Detalle 1 (texto)" },
  title2: { type: "text-content", default: "Directo a Google", description: "Detalle 2" },
  sub2: { type: "text-content", default: "Abre tu perfil para dejar la reseña", description: "Detalle 2 (texto)" },
  title3: { type: "text-content", default: "Chip NFC integrado", description: "Detalle 3" },
  sub3: { type: "text-content", default: "Basta con acercar el móvil", description: "Detalle 3 (texto)" },
  title4: { type: "text-content", default: "Acabado acrílico", description: "Detalle 4" },
  sub4: { type: "text-content", default: "Elegante en cualquier mostrador", description: "Detalle 4 (texto)" },
  heroLine: { type: "text-content", default: "Hecha para destacar.", description: "Frase final" },
  heroSub: { type: "text-content", default: "En tu mostrador.", description: "Frase final (acento)" },
  frontImage: { type: "asset", default: undefined, description: "Diseño de la tarjeta (opcional)" },
} as const satisfies InteractivitySchema;

export const FilmScene = Interactive.withSchema({
  Component: FilmSceneInner,
  componentName: "<FilmScene>",
  schema: filmSchema,
  wrapInSequence: true,
});
