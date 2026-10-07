import type React from "react";
import {
  AbsoluteFill,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { MaskLine } from "../../components/Typo";
import { SANS } from "../../fonts";
import { Draw, EASE_OUT, ICONS, bounce, clamp, glide, ramp } from "../kit";
import { MG, mgCues } from "../theme";

type Props = {
  readonly title1: string;
  readonly sub1: string;
  readonly title2: string;
  readonly sub2: string;
  readonly title3: string;
  readonly sub3: string;
  readonly title4: string;
  readonly sub4: string;
  readonly heading: string;
  readonly style?: React.CSSProperties;
};

const c = mgCues.benefits;
const COLORS = [MG.green, MG.blue, MG.red, MG.yellow];
const ICON_SET = [ICONS.noApp, ICONS.noBattery, ICONS.phones, ICONS.logo];
// Rejilla final 2 × 2 y los cuatro puntos en los que se recoge (donde empieza el cierre).
const TILE = 440;
const TILES = [
  [80, 520],
  [560, 520],
  [80, 1000],
  [560, 1000],
];
export const DOTS = [
  [470, 890],
  [610, 890],
  [470, 1030],
  [610, 1030],
];
const DOT = 80;

const ink = (k: number) => (k === 3 ? MG.ink : MG.paper);

const MgBenefitsInner: React.FC<Props> = ({
  title1,
  sub1,
  title2,
  sub2,
  title3,
  sub3,
  title4,
  sub4,
  heading,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const titles = [title1, title2, title3, title4];
  const subs = [sub1, sub2, sub3, sub4];
  const gridMode = frame >= c.grid;

  const morph = glide(frame, fps, c.grid, { damping: 18, stiffness: 120 });
  const collapse = glide(frame, fps, c.collapse, {
    damping: 20,
    stiffness: 150,
  });
  const tileContent = 1 - ramp(frame, c.collapse, c.collapse + 6);

  const panel = (k: number) => {
    const at = c.panels[k];
    if (frame < at) return null;
    const slide = k === 0 ? 1 : ramp(frame, at, at + 10, EASE_OUT);
    const dir = [
      [0, 0],
      [1, 0],
      [0, 1],
      [-1, 0],
    ][k];
    const content = ramp(frame, at + 3, at + 14, EASE_OUT);
    const life = frame - at;
    return (
      <AbsoluteFill
        key={k}
        style={{
          backgroundColor: COLORS[k],
          translate: `${dir[0] * (1 - slide) * width}px ${dir[1] * (1 - slide) * height}px`,
          alignItems: "center",
          fontFamily: SANS,
          color: ink(k),
          overflow: "hidden",
        }}
      >
        {/* Formas de fondo que no dejan de moverse */}
        <div
          style={{
            position: "absolute",
            width: 1300,
            height: 1300,
            borderRadius: "50%",
            background:
              k === 3 ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.1)",
            left: [-520, 420, -420, 380][k] + life * [5, -5, 4, -4][k],
            top: [1050, -520, -380, 1080][k] - life * [4, -3, -3, 4][k],
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            borderRadius: "50%",
            border: `40px solid ${k === 3 ? "rgba(21,23,28,0.07)" : "rgba(0,0,0,0.08)"}`,
            left: [700, -120, 720, -160][k] - life * [3, -3, 3, -3][k],
            top: [120, 1400, 1500, 160][k] + life * [3, -3, -2, 3][k],
          }}
        />
        <AbsoluteFill
          style={{ alignItems: "center", scale: String(1 + life * 0.0016) }}
        >
          <svg
            width={360}
            height={360}
            viewBox="0 0 100 100"
            style={{ position: "absolute", top: 470, overflow: "visible" }}
          >
            {ICON_SET[k].map((d, i) => (
              <Draw
                key={d}
                d={d}
                p={ramp(frame, at + 4 + i * 3, at + 18 + i * 3)}
                stroke={ink(k)}
                width={7}
              />
            ))}
          </svg>
          <div
            style={{
              position: "absolute",
              top: 960,
              left: 80,
              right: 80,
              textAlign: "center",
              fontWeight: 900,
              fontSize: 136,
              lineHeight: 1,
              letterSpacing: -5,
              translate: `0 ${(1 - content) * 120}px`,
              opacity: content,
            }}
          >
            {titles[k]}
          </div>
          <div
            style={{
              position: "absolute",
              top: titles[k].length > 12 ? 1250 : 1130,
              left: 80,
              right: 80,
              textAlign: "center",
              fontWeight: 700,
              fontSize: 52,
              letterSpacing: -1,
              opacity: content * 0.88,
              translate: `0 ${(1 - content) * 160}px`,
            }}
          >
            {subs[k]}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  };

  const tile = (k: number) => {
    const isMorph = k === 3;
    const pop = isMorph ? 1 : bounce(frame, fps, c.tiles[k], { damping: 11 });
    const [tx, ty] = TILES[k];
    const [dx, dy] = DOTS[k];
    let x = tx;
    let y = ty;
    let w = TILE;
    let h = TILE;
    let r = 56;
    if (isMorph) {
      x = interpolate(morph, [0, 1], [0, tx]);
      y = interpolate(morph, [0, 1], [0, ty]);
      w = interpolate(morph, [0, 1], [width, TILE]);
      h = interpolate(morph, [0, 1], [height, TILE]);
      r = interpolate(morph, [0, 1], [0, 56]);
    }
    // Recogida: cada mosaico se convierte en un punto.
    x = interpolate(collapse, [0, 1], [x, dx - DOT / 2]);
    y = interpolate(collapse, [0, 1], [y, dy - DOT / 2]);
    w = interpolate(collapse, [0, 1], [w, DOT]);
    h = interpolate(collapse, [0, 1], [h, DOT]);
    r = interpolate(collapse, [0, 1], [r, DOT / 2]);
    const content = isMorph
      ? ramp(frame, c.grid + 8, c.grid + 16) * tileContent
      : tileContent;
    return (
      <div
        key={k}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: w,
          height: h,
          borderRadius: r,
          background: COLORS[k],
          scale: String(pop),
          translate: `0 ${Math.sin((frame + k * 9) / 11) * 7 * (1 - collapse)}px`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 26,
          color: ink(k),
          fontFamily: SANS,
          overflow: "hidden",
        }}
      >
        <svg
          width={170}
          height={170}
          viewBox="0 0 100 100"
          style={{ overflow: "visible", opacity: content, flex: "none" }}
        >
          {ICON_SET[k].map((d) => (
            <Draw key={d} d={d} p={1} stroke={ink(k)} width={7} />
          ))}
        </svg>
        <div
          style={{
            fontWeight: 900,
            fontSize: 46,
            letterSpacing: -1.5,
            textAlign: "center",
            lineHeight: 1.05,
            padding: "0 24px",
            opacity: content,
            flex: "none",
          }}
        >
          {titles[k]}
        </div>
      </div>
    );
  };

  return (
    <AbsoluteFill
      style={{ backgroundColor: MG.paper, overflow: "hidden", ...style }}
    >
      {!gridMode ? [0, 1, 2, 3].map(panel) : null}
      {gridMode ? (
        <>
          <div
            style={{
              position: "absolute",
              top: 290,
              left: 80,
              right: 80,
              textAlign: "center",
              fontFamily: SANS,
              fontWeight: 900,
              fontSize: 110,
              letterSpacing: -4,
              lineHeight: 1,
              color: MG.ink,
            }}
          >
            <MaskLine at={c.grid + 10} outAt={c.collapse - 4}>
              {heading}
            </MaskLine>
          </div>
          {[0, 1, 2].map(tile)}
          {tile(3)}
          {/* Contenido del último panel mientras se encoge */}
          <AbsoluteFill
            style={{
              opacity: 1 - ramp(frame, c.grid, c.grid + 6),
              pointerEvents: "none",
            }}
          >
            {interpolate(morph, [0, 1], [1, 0], clamp) > 0.02 ? (
              <div
                style={{
                  position: "absolute",
                  top: 960,
                  left: 80,
                  right: 80,
                  textAlign: "center",
                  fontFamily: SANS,
                  fontWeight: 900,
                  fontSize: 136,
                  lineHeight: 1,
                  letterSpacing: -5,
                  color: MG.ink,
                }}
              >
                {title4}
              </div>
            ) : null}
          </AbsoluteFill>
        </>
      ) : null}
    </AbsoluteFill>
  );
};

const schema = {
  title1: {
    type: "text-content",
    default: "Sin app",
    description: "Ventaja 1",
  },
  sub1: {
    type: "text-content",
    default: "Nada que descargar.",
    description: "Ventaja 1, detalle",
  },
  title2: {
    type: "text-content",
    default: "Sin batería",
    description: "Ventaja 2",
  },
  sub2: {
    type: "text-content",
    default: "No se carga ni se enchufa.",
    description: "Ventaja 2, detalle",
  },
  title3: {
    type: "text-content",
    default: "iPhone y Android",
    description: "Ventaja 3",
  },
  sub3: {
    type: "text-content",
    default: "Móviles actuales con NFC.",
    description: "Ventaja 3, detalle",
  },
  title4: {
    type: "text-content",
    default: "Con tu logo",
    description: "Ventaja 4",
  },
  sub4: {
    type: "text-content",
    default: "Y con tus colores.",
    description: "Ventaja 4, detalle",
  },
  heading: {
    type: "text-content",
    default: "Todo de serie.",
    description: "Título de la rejilla",
  },
} as const satisfies InteractivitySchema;

export const MgBenefits = Interactive.withSchema({
  Component: MgBenefitsInner,
  componentName: "<MgBenefits>",
  schema,
  wrapInSequence: true,
});
