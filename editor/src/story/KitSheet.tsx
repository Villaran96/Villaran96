import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import "../explainer/theme";
import { BigStat, Callout, DepthMeter, Gauge } from "./kit/hud";
import { Angler, DeepWater, FishSchool, Jelly, Sub, Squid, Svg, Whale } from "./kit/water";

/** Catálogo visual del kit (composición «StoryKit» en Studio): sirve para revisar cada criatura y elemento. */
export const KitSheet: React.FC<{ depth?: number }> = ({ depth = 900 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill>
      <DeepWater depth={depth} t={t} />
      <Svg>
        <Whale x={390} y={250} s={0.62} t={t} />
        <FishSchool x={830} y={420} t={t} w={300} h={180} n={14} />
        <Jelly x={200} y={640} s={1.1} t={t} seed={1} />
        <Jelly x={430} y={760} s={0.8} t={t} seed={2} color="#ff9bf0" />
        <Squid x={720} y={760} s={0.9} t={t} />
        <Angler x={250} y={1090} s={1.15} t={t} />
        <Sub x={760} y={1090} s={1.0} t={t} />
      </Svg>
      <DepthMeter depth={depth} />
      <Callout t={t} px={430} py={250} lx={90} ly={430} title="Ballena" sub="kit/water.tsx" />
      <BigStat t={t} to={3000} label="cifra animada" y={1250} size={150} />
      <Gauge x={820} y={1560} r={130} value={260} max={400} unit="ATM" t={t} />
    </AbsoluteFill>
  );
};
