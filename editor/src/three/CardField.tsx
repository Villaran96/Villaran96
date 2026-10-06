import { ThreeCanvas } from "@remotion/three";
import type React from "react";
import { random, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraRig, CardModel, GL_PROPS, StudioEnvironment } from "./stage";

// Campo de tarjetas flotando en la oscuridad: fondo con profundidad para escenas de texto.
const CARDS = new Array(11).fill(0).map((_, i) => ({
  x: (random(`cf-x-${i}`) - 0.5) * 3.4,
  y: (random(`cf-y-${i}`) - 0.5) * 5.6,
  z: -random(`cf-z-${i}`) * 4.5,
  rx: (random(`cf-rx-${i}`) - 0.5) * 1.2,
  ry: (random(`cf-ry-${i}`) - 0.5) * 2.4,
  spin: (random(`cf-s-${i}`) - 0.5) * 0.012,
  rise: 0.002 + random(`cf-r-${i}`) * 0.004,
}));

export const CardField: React.FC<{ image?: string; style?: React.CSSProperties }> = ({ image, style }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <div style={{ position: "absolute", inset: 0, ...style }}>
      <ThreeCanvas width={width} height={height} gl={GL_PROPS}>
        <CameraRig position={[0, 0, 4.6 - frame * 0.004]} target={[0, 0, -2]} fov={34} />
        <StudioEnvironment intensity={0.7} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[2, 3, 4]} intensity={1.6} />
        <pointLight position={[-2.5, 1, 1]} intensity={4} distance={8} color="#4285F4" />
        {CARDS.map((k, i) => (
          <CardModel
            key={i}
            image={image}
            castShadow={false}
            position={[k.x, k.y + frame * k.rise, k.z]}
            rotation={[k.rx + frame * k.spin * 0.6, k.ry + frame * k.spin, 0]}
            scale={0.8}
          />
        ))}
      </ThreeCanvas>
    </div>
  );
};
