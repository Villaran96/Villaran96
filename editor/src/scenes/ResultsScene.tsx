import { evolvePath } from "@remotion/paths";
import type React from "react";
import {
  AbsoluteFill,
  Interactive,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { Notification, Particles } from "../components/Fx";
import { MaskLine } from "../components/Typo";
import { EASE_IN_OUT, EASE_OUT, progress, punch } from "../components/motion";
import { SANS, SERIF } from "../fonts";
import { COLORS, cues } from "../theme";

type Props = {
  readonly headline: string;
  readonly headlineAccent: string;
  readonly reviewsFrom: number;
  readonly reviewsTo: number;
  readonly ratingFrom: number;
  readonly ratingTo: number;
  readonly footnote: string;
  readonly style?: React.CSSProperties;
};

const c = cues.results;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const BARS = [0.16, 0.22, 0.3, 0.38, 0.5, 0.63, 0.8, 1];
const NOTIFS = ["“Atención de 10, repetiremos”", "“Rapidísimo y muy amables”", "“El mejor sitio de la zona”"];

const StatCard: React.FC<{ label: string; value: string; accent: string; bump: number; children?: React.ReactNode }> = ({
  label,
  value,
  accent,
  bump,
  children,
}) => (
  <div
    style={{
      flex: 1,
      padding: "34px 36px",
      borderRadius: 40,
      background: "linear-gradient(160deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))",
      border: "1.5px solid rgba(255,255,255,0.14)",
      fontFamily: SANS,
    }}
  >
    <div style={{ color: COLORS.mist, fontSize: 32, fontWeight: 600 }}>{label}</div>
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
      <div style={{ color: "white", fontSize: 108, fontWeight: 900, letterSpacing: -3, fontVariantNumeric: "tabular-nums", scale: String(bump), transformOrigin: "left center" }}>
        {value}
      </div>
      {children}
    </div>
    <div style={{ marginTop: 6, height: 8, borderRadius: 4, background: accent, width: "40%" }} />
  </div>
);

const ResultsSceneInner: React.FC<Props> = ({ headline, headlineAccent, reviewsFrom, reviewsTo, ratingFrom, ratingTo, footnote, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const count = interpolate(frame, [c.countStart, c.countEnd], [0, 1], { ...clamp, easing: EASE_IN_OUT });
  const reviews = Math.round(reviewsFrom + (reviewsTo - reviewsFrom) * count);
  const rating = (ratingFrom + (ratingTo - ratingFrom) * count).toFixed(1).replace(".", ",");
  const bump = punch(frame, fps, c.countEnd, 0.12);
  const cards = spring({ frame: frame - 6, fps, config: { damping: 16 } });

  const chartW = 900;
  const chartH = 300;
  const barW = 74;
  const gap = (chartW - BARS.length * barW) / (BARS.length - 1);
  const heights = BARS.map((h, i) => h * chartH * progress(frame, c.barsStart + i * 4, c.barsStart + i * 4 + 22, EASE_OUT));
  const line = BARS.map((h, i) => `${i === 0 ? "M" : "L"} ${i * (barW + gap) + barW / 2} ${chartH - h * chartH - 24}`).join(" ");
  const trend = evolvePath(progress(frame, c.barsStart + 20, c.barsStart + 70, EASE_IN_OUT), line);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.night, background: `radial-gradient(circle at 50% 10%, #1b2b5c 0%, ${COLORS.night} 60%)`, ...style }}>
      <Particles count={26} seed="results" />
      <div style={{ position: "absolute", top: 150, left: 90, right: 90 }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 116, color: "white", letterSpacing: -3, lineHeight: 1 }}>
          <MaskLine at={0}>{headline}</MaskLine>
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 120, color: COLORS.gold, lineHeight: 1.1 }}>
          <MaskLine at={8}>{headlineAccent}</MaskLine>
        </div>
      </div>

      {/* Notificaciones apiladas: cada nueva empuja a las anteriores */}
      <div style={{ position: "absolute", top: 480, left: 0, right: 0, height: 520 }}>
        {c.notifs.map((at, i) => {
          const newer = c.notifs.filter((a, j) => j > i && frame >= a).length;
          const push = c.notifs
            .filter((a, j) => j > i)
            .reduce((acc, a) => acc + spring({ frame: frame - a, fps, config: { damping: 16, stiffness: 170 } }), 0);
          return (
            <Notification
              key={at}
              at={at}
              title="Nueva reseña  ★★★★★"
              body={NOTIFS[i % NOTIFS.length]}
              style={{ top: push * 168, scale: String(1 - newer * 0.04), opacity: 1 - newer * 0.22, zIndex: 10 + i }}
            />
          );
        })}
      </div>

      <div style={{ position: "absolute", top: 1010, left: 90, right: 90, display: "flex", gap: 28, opacity: cards, translate: `0 ${(1 - cards) * 80}px` }}>
        <StatCard label="Reseñas" value={String(reviews)} accent={COLORS.blue} bump={bump} />
        <StatCard label="Valoración" value={rating} accent={COLORS.gold} bump={bump}>
          <div style={{ color: COLORS.gold, fontSize: 70 }}>★</div>
        </StatCard>
      </div>

      <div style={{ position: "absolute", top: 1370, left: 90, width: chartW, height: chartH }}>
        <svg width={chartW} height={chartH} style={{ position: "absolute", overflow: "visible" }}>
          {heights.map((h, i) => (
            <rect
              key={i}
              x={i * (barW + gap)}
              y={chartH - h}
              width={barW}
              height={h}
              rx={16}
              fill={i === BARS.length - 1 ? COLORS.gold : "rgba(66,133,244,0.85)"}
            />
          ))}
          <path d={line} stroke="white" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={trend.strokeDasharray} strokeDashoffset={trend.strokeDashoffset} style={{ filter: "drop-shadow(0 0 10px rgba(255,255,255,0.7))" }} />
        </svg>
        <div style={{ position: "absolute", top: chartH + 22, left: 0, right: 0, display: "flex", justifyContent: "space-between", fontFamily: SANS, fontSize: 26, color: COLORS.mist, fontWeight: 600 }}>
          {BARS.map((_, i) => (
            <div key={i} style={{ width: barW, textAlign: "center" }}>S{i + 1}</div>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 110, left: 90, fontFamily: SANS, fontSize: 26, color: "rgba(255,255,255,0.45)" }}>{footnote}</div>
    </AbsoluteFill>
  );
};

const resultsSchema = {
  headline: { type: "text-content", default: "Más reseñas.", description: "Titular" },
  headlineAccent: { type: "text-content", default: "Más clientes.", description: "Titular (acento)" },
  reviewsFrom: { type: "number", default: 27, min: 0, step: 1, description: "Reseñas (inicio)", hiddenFromList: false },
  reviewsTo: { type: "number", default: 214, min: 0, step: 1, description: "Reseñas (final)", hiddenFromList: false },
  ratingFrom: { type: "number", default: 3.8, min: 1, max: 5, step: 0.1, description: "Valoración (inicio)", hiddenFromList: false },
  ratingTo: { type: "number", default: 4.9, min: 1, max: 5, step: 0.1, description: "Valoración (final)", hiddenFromList: false },
  footnote: { type: "text-content", default: "*Simulación con datos de ejemplo", description: "Nota al pie" },
} as const satisfies InteractivitySchema;

export const ResultsScene = Interactive.withSchema({
  Component: ResultsSceneInner,
  componentName: "<ResultsScene>",
  schema: resultsSchema,
  wrapInSequence: true,
});
