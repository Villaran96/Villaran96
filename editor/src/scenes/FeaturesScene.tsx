import { evolvePath } from "@remotion/paths";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { flip } from "@remotion/transitions/flip";
import { wipe } from "@remotion/transitions/wipe";
import type React from "react";
import {
  AbsoluteFill,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { MaskLine } from "../components/Typo";
import { EASE_IN_OUT, progress } from "../components/motion";
import { SANS, SERIF } from "../fonts";
import { COLORS, cues } from "../theme";

const ICONS = {
  apps: "M30 30 h50 v50 h-50 z M120 30 h50 v50 h-50 z M30 120 h50 v50 h-50 z M120 120 h50 v50 h-50 z M18 182 L182 18",
  battery: "M24 62 h126 v76 h-126 z M150 84 h20 v32 h-20 z M44 82 h30 v36 h-30 z M18 178 L182 22",
  phones: "M34 26 h64 v148 h-64 z M58 154 h16 M118 52 h52 v116 h-52 z M136 150 h16",
  logo: "M16 58 h132 v88 h-132 z M36 80 h48 M36 100 h70 M36 120 h30 M168 18 l8 20 l20 8 l-20 8 l-8 20 l-8 -20 l-20 -8 l20 -8 z",
};

type SlideProps = {
  readonly index: number;
  readonly title: string;
  readonly accent: string;
  readonly icon: keyof typeof ICONS;
  readonly color: string;
  readonly ink: string;
};

const FeatureSlide: React.FC<SlideProps> = ({ index, title, accent, icon, color, ink }) => {
  const frame = useCurrentFrame();
  const draw = evolvePath(progress(frame, 2, 26, EASE_IN_OUT), ICONS[icon]);
  const drift = interpolate(frame, [0, 60], [40, -40]);
  const stripes = frame * 3;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: color,
        backgroundImage: `repeating-linear-gradient(135deg, rgba(255,255,255,0.07) 0 40px, transparent 40px 80px)`,
        backgroundPosition: `${stripes}px 0`,
        justifyContent: "center",
        padding: "0 90px",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -40,
          top: 160,
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 560,
          lineHeight: 1,
          color: "transparent",
          WebkitTextStroke: `4px ${ink === "white" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)"}`,
          translate: `${drift}px 0`,
        }}
      >
        0{index}
      </div>
      <svg width={300} height={300} viewBox="0 0 200 200" style={{ overflow: "visible" }}>
        <path
          d={ICONS[icon]}
          stroke={ink}
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={draw.strokeDasharray}
          strokeDashoffset={draw.strokeDashoffset}
        />
      </svg>
      <div style={{ marginTop: 70, fontFamily: SANS, fontWeight: 900, fontSize: 140, color: ink, letterSpacing: -4, lineHeight: 1 }}>
        <MaskLine at={4}>{title}</MaskLine>
      </div>
      <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 110, color: ink, opacity: 0.9, lineHeight: 1.1 }}>
        <MaskLine at={10}>{accent}</MaskLine>
      </div>
    </AbsoluteFill>
  );
};

type Props = {
  readonly title1: string;
  readonly accent1: string;
  readonly title2: string;
  readonly accent2: string;
  readonly title3: string;
  readonly accent3: string;
  readonly title4: string;
  readonly accent4: string;
  readonly style?: React.CSSProperties;
};

const SEG = cues.features.segment;
const OVERLAP = cues.features.overlap;

const FeaturesSceneInner: React.FC<Props> = ({ title1, accent1, title2, accent2, title3, accent3, title4, accent4, style }) => {
  const { fps, width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink, ...style }}>
      <TransitionSeries>
        <TransitionSeries.Sequence name="Sin apps" durationInFrames={SEG} premountFor={fps}>
          <FeatureSlide index={1} title={title1} accent={accent1} icon="apps" color={COLORS.blue} ink="white" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-top-left" })} timing={linearTiming({ durationInFrames: OVERLAP })} />
        <TransitionSeries.Sequence name="Sin batería" durationInFrames={SEG} premountFor={fps}>
          <FeatureSlide index={2} title={title2} accent={accent2} icon="battery" color={COLORS.red} ink="white" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={flip({ direction: "from-right", perspective: 1800 })} timing={linearTiming({ durationInFrames: OVERLAP })} />
        <TransitionSeries.Sequence name="Compatibles" durationInFrames={SEG} premountFor={fps}>
          <FeatureSlide index={3} title={title3} accent={accent3} icon="phones" color={COLORS.yellow} ink="#1b1300" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={clockWipe({ width, height })} timing={linearTiming({ durationInFrames: OVERLAP })} />
        <TransitionSeries.Sequence name="Con tu logo" durationInFrames={SEG} premountFor={fps}>
          <FeatureSlide index={4} title={title4} accent={accent4} icon="logo" color={COLORS.green} ink="white" />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

const featuresSchema = {
  title1: { type: "text-content", default: "Sin apps", description: "Ventaja 1" },
  accent1: { type: "text-content", default: "que descargar", description: "Ventaja 1 (acento)" },
  title2: { type: "text-content", default: "Sin batería", description: "Ventaja 2" },
  accent2: { type: "text-content", default: "ni cargas", description: "Ventaja 2 (acento)" },
  title3: { type: "text-content", default: "iPhone y Android", description: "Ventaja 3" },
  accent3: { type: "text-content", default: "compatibles", description: "Ventaja 3 (acento)" },
  title4: { type: "text-content", default: "Con tu logo", description: "Ventaja 4" },
  accent4: { type: "text-content", default: "y tus colores", description: "Ventaja 4 (acento)" },
} as const satisfies InteractivitySchema;

export const FeaturesScene = Interactive.withSchema({
  Component: FeaturesSceneInner,
  componentName: "<FeaturesScene>",
  schema: featuresSchema,
  wrapInSequence: true,
});
