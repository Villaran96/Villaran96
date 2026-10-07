import type React from "react";
import { AbsoluteFill, Interactive, interpolate, useCurrentFrame, useVideoConfig, type InteractivitySchema } from "remotion";
import { MaskLine } from "../../components/Typo";
import { SANS } from "../../fonts";
import { CardFace, Draw, EASE_IN, FlatConfetti, FlatPhone, ICONS, Star, bounce, clamp, glide, ramp } from "../kit";
import { MG, mgCues } from "../theme";
import { HOW_CARD } from "./MgReveal";

type Props = {
  readonly title: string;
  readonly step1: string;
  readonly step2: string;
  readonly step3: string;
  readonly businessName: string;
  readonly caption: string;
  readonly style?: React.CSSProperties;
};

const c = mgCues.how;
const PHONE_W = 400;
const CHIP_COLORS = [MG.blue, MG.yellow, MG.green];
export const CHECK_CENTER = { x: 540, y: 1050 };

const Chip: React.FC<{ n: number; label: string; active: number; at: number; done: boolean }> = ({ n, label, active, at, done }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = bounce(frame, fps, at, { damping: 12 });
  const color = CHIP_COLORS[n - 1];
  const on = active > 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        height: 84,
        padding: "0 30px 0 12px",
        borderRadius: 42,
        background: on ? color : MG.paper,
        boxShadow: on ? "none" : `inset 0 0 0 4px ${MG.mist}`,
        color: on && n !== 2 ? MG.paper : MG.ink,
        fontFamily: SANS,
        fontWeight: 800,
        fontSize: 38,
        letterSpacing: -1,
        scale: String(pop * (1 + 0.08 * Math.sin(Math.min(1, active) * Math.PI))),
        opacity: done ? 0.55 : 1,
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          display: "grid",
          placeItems: "center",
          background: on ? "rgba(255,255,255,0.28)" : MG.mist,
          fontWeight: 900,
        }}
      >
        {n}
      </div>
      {label}
    </div>
  );
};

const MgHowInner: React.FC<Props> = ({ title, step1, step2, step3, businessName, caption, style }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const cx = width / 2;

  // Recorrido del móvil: entra en arco, baja, toca la tarjeta y sube al centro.
  const inP = glide(frame, fps, c.phoneIn[0], { damping: 15, stiffness: 90 });
  const down = glide(frame, fps, c.phoneIn[1], { damping: 13, stiffness: 160 });
  const lift = glide(frame, fps, c.lift, { damping: 18, stiffness: 110 });
  const px = interpolate(inP, [0, 1], [1250, 560]) + interpolate(down, [0, 1], [0, -20]);
  const py = interpolate(inP, [0, 1], [-640, 880]) + interpolate(down, [0, 1], [0, 210]) + interpolate(lift, [0, 1], [0, -40]);
  const idle = frame > c.lift ? lift * Math.sin((frame - c.lift) / 13) : 0;
  const prot = interpolate(inP, [0, 1], [16, -4]) + interpolate(down, [0, 1], [0, 4]) + idle * 1.4;
  const pscale = interpolate(lift, [0, 1], [1, 1.2]);
  const tapT = frame - c.tap;
  const squash = tapT >= 0 && tapT < 8 ? Math.sin((tapT / 8) * Math.PI) * 0.06 : 0;

  const cardDrop = ramp(frame, c.lift + 4, c.lift + 24, EASE_IN);
  const screen = ramp(frame, c.screen, c.screen + 8);
  const press = frame >= c.press && frame < c.press + 8 ? Math.sin(((frame - c.press) / 8) * Math.PI) * 0.1 : 0;
  const check = bounce(frame, fps, c.check, { damping: 11, stiffness: 160 });
  const cover = ramp(frame, c.cover, 240, EASE_IN);
  const maxR = Math.hypot(Math.max(CHECK_CENTER.x, width - CHECK_CENTER.x), Math.max(CHECK_CENTER.y, height - CHECK_CENTER.y)) + 40;
  const checkR = interpolate(cover, [0, 1], [170 * check, maxR]);

  const active = (at: number, until: number) => (frame >= at && frame < until ? Math.min(1, (frame - at) / 8) : 0);
  const unit = PHONE_W * 0.91;

  return (
    <AbsoluteFill style={{ backgroundColor: MG.paper, overflow: "hidden", ...style }}>
      <div
        style={{
          position: "absolute",
          top: 170,
          left: 80,
          right: 80,
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 110,
          letterSpacing: -4,
          lineHeight: 1,
          color: MG.ink,
          textAlign: "center",
        }}
      >
        <MaskLine at={c.title}>{title}</MaskLine>
      </div>
      <div style={{ position: "absolute", top: 330, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 16 }}>
        <Chip n={1} label={step1} at={c.chips} active={active(c.chips, c.chip2)} done={frame >= c.chip2} />
        <Chip n={2} label={step2} at={c.chips + 3} active={active(c.chip2, c.chip3)} done={frame >= c.chip3} />
        <Chip n={3} label={step3} at={c.chips + 6} active={active(c.chip3, 999)} done={false} />
      </div>

      {/* Tarjeta, que llega de la escena anterior */}
      <div
        style={{
          position: "absolute",
          left: HOW_CARD.x - HOW_CARD.size / 2,
          top: HOW_CARD.y - HOW_CARD.size / 2 + cardDrop * 1000 + (tapT >= 0 && tapT < 8 ? Math.sin((tapT / 8) * Math.PI) * 12 : 0),
          width: HOW_CARD.size,
          height: HOW_CARD.size,
          rotate: `${HOW_CARD.rotate + cardDrop * 20}deg`,
        }}
      >
        <CardFace size={HOW_CARD.size} style={{ left: 0, top: 0 }} />
      </div>

      {/* Ondas NFC al tocar */}
      {c.rings.map((at, k) => {
        const t = (frame - at) / 24;
        if (t < 0 || t > 1) return null;
        const r = 70 + 330 * Math.pow(t, 0.7);
        return (
          <div
            key={at}
            style={{
              position: "absolute",
              left: cx - r,
              top: 1290 - r,
              width: r * 2,
              height: r * 2,
              borderRadius: "50%",
              border: `${14 * (1 - t) + 2}px solid ${[MG.blue, MG.green, MG.yellow][k]}`,
              opacity: 1 - t,
            }}
          />
        );
      })}

      <FlatPhone
        width={PHONE_W}
        style={{
          left: px - PHONE_W / 2,
          top: py - PHONE_W + idle * 10,
          rotate: `${prot}deg`,
          scale: `${pscale * (1 + squash * 0.4)} ${pscale * (1 - squash)}`,
        }}
      >
        {/* Pantalla de espera: lista para leer la tarjeta */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(160deg, ${MG.tealA}, ${MG.tealB})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 26,
            opacity: 1 - screen,
          }}
        >
          <svg width={unit * 0.5} height={unit * 0.5} viewBox="0 0 100 100" style={{ overflow: "visible" }}>
            <circle cx={22} cy={50} r={7} fill={MG.paper} />
            {ICONS.nfc.map((d, k) => (
              <path
                key={d}
                d={d}
                stroke={MG.paper}
                strokeWidth={8}
                fill="none"
                strokeLinecap="round"
                opacity={0.35 + 0.65 * Math.max(0, Math.sin((frame / 10 - k * 0.6) * Math.PI))}
              />
            ))}
          </svg>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 30, color: MG.paper }}>{step1}</div>
        </div>

        {/* Pantalla de valoración (genérica) */}
        <div style={{ position: "absolute", inset: 0, opacity: screen, padding: `${unit * 0.24}px ${unit * 0.08}px 0`, fontFamily: SANS }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: 35,
                background: `linear-gradient(135deg, ${MG.tealA}, ${MG.tealB})`,
                display: "grid",
                placeItems: "center",
                color: MG.paper,
                fontWeight: 900,
                fontSize: 34,
              }}
            >
              {businessName.trim().charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 30, color: MG.ink, letterSpacing: -0.5 }}>{businessName}</div>
              <div style={{ fontWeight: 600, fontSize: 21, color: "#8A8F98" }}>Valora tu experiencia</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 48 }}>
            {c.stars.map((at) => {
              const s = bounce(frame, fps, at, { damping: 9, stiffness: 220 });
              const on = frame >= at;
              return (
                <div key={at} style={{ position: "relative", width: 58, height: 58, scale: String(on ? 0.85 + 0.15 * s + 0.15 * Math.sin(Math.min(1, s) * Math.PI) : 1) }}>
                  <Star size={58} fill={on ? MG.yellow : "#E3E5E9"} />
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 44, height: 150, borderRadius: 20, background: MG.mist, padding: 20, display: "grid", alignContent: "start", gap: 14 }}>
            <div style={{ width: `${interpolate(frame, [c.stars[4] + 4, c.press - 2], [0, 82], clamp)}%`, height: 14, borderRadius: 7, background: MG.gray }} />
            <div style={{ width: `${interpolate(frame, [c.stars[4] + 8, c.press - 2], [0, 56], clamp)}%`, height: 14, borderRadius: 7, background: MG.gray }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 34 }}>
            <div
              style={{
                padding: "18px 36px",
                borderRadius: 34,
                background: MG.blue,
                color: MG.paper,
                fontWeight: 800,
                fontSize: 28,
                scale: String(1 - press),
              }}
            >
              Publicar
            </div>
          </div>
        </div>
      </FlatPhone>

      {/* Check verde que acaba cubriendo la pantalla */}
      {frame >= c.check ? (
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          <circle cx={CHECK_CENTER.x} cy={CHECK_CENTER.y} r={checkR} fill={MG.green} />
          <g transform={`translate(${CHECK_CENTER.x - 110} ${CHECK_CENTER.y - 110}) scale(2.2)`} opacity={1 - cover}>
            <Draw d={ICONS.check[0]} p={ramp(frame, c.check + 4, c.check + 16)} stroke={MG.paper} width={11} />
          </g>
        </svg>
      ) : null}
      <FlatConfetti at={c.confetti} x={CHECK_CENTER.x} y={CHECK_CENTER.y - 60} count={46} seed="how" />

      <div
        style={{
          position: "absolute",
          top: 1640,
          left: 80,
          right: 80,
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 66,
          letterSpacing: -2,
          color: MG.ink,
          opacity: 1 - cover,
        }}
      >
        <MaskLine at={c.caption}>{caption}</MaskLine>
      </div>
    </AbsoluteFill>
  );
};

const schema = {
  title: { type: "text-content", default: "Así de fácil.", description: "Título" },
  step1: { type: "text-content", default: "Acerca", description: "Paso 1" },
  step2: { type: "text-content", default: "Valora", description: "Paso 2" },
  step3: { type: "text-content", default: "Publica", description: "Paso 3" },
  businessName: { type: "text-content", default: "Tu negocio", description: "Nombre en el móvil" },
  caption: { type: "text-content", default: "Publicada en segundos.", description: "Frase final" },
} as const satisfies InteractivitySchema;

export const MgHow = Interactive.withSchema({ Component: MgHowInner, componentName: "<MgHow>", schema, wrapInSequence: true });
