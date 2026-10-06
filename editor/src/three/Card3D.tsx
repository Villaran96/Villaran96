import { ThreeCanvas } from "@remotion/three";
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_IN_OUT } from "../components/motion";
import { COLORS } from "../theme";
import { CameraRig, CardModel, GL_PROPS, StudioEnvironment, StudioFloor, StudioLights } from "./stage";

const FLOOR = -0.5;

// Laboratorio: la tarjeta real sobre el suelo de estudio con órbita lenta.
export const Card3D: React.FC<{ image?: string }> = ({ image }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [0, durationInFrames - 1], [0, 1], { easing: EASE_IN_OUT });
  const orbit = interpolate(t, [0, 1], [-0.75, 0.45]);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 55% at 50% 38%, #1a2b57 0%, ${COLORS.ink} 72%)` }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(190,215,255,0.0) 0%, rgba(190,215,255,0.16) 40%, transparent 70%)", clipPath: "polygon(38% 0, 62% 0, 85% 70%, 15% 70%)", filter: "blur(30px)" }} />
      <ThreeCanvas width={width} height={height} shadows gl={GL_PROPS}>
        <CameraRig position={[Math.sin(orbit) * 3.4, 0.35, Math.cos(orbit) * 3.4]} target={[0, 0.02, 0]} fov={30} />
        <StudioEnvironment />
        <StudioLights rimAngle={frame / 40} />
        <StudioFloor y={FLOOR} />
        <CardModel image={image} position={[0, FLOOR + 0.5 + 0.004, 0]} rotation={[-0.04, 0, 0]} reflection={{ floorY: FLOOR, opacity: 0.35, fade: 0.5 }} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
