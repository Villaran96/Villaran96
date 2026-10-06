import { ThreeCanvas } from "@remotion/three";
import type React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { Fog, Table } from "../three/TableCard";
import { CameraRig, CARD, CardModel, GL_PROPS, StudioEnvironment } from "../three/stage";

// Fotos de producto para la web (fotogramas sueltos, se renderizan con `remotion still`).

type V3 = [number, number, number];

// Luz de estudio neutra, sin los contraluces de colores del anuncio.
const NeutralLights: React.FC<{ rimFrom?: V3; rim?: number; keyFrom?: V3; key?: number; shadows?: boolean }> = ({
  rimFrom = [2.4, 1.2, -1.8],
  rim = 2.2,
  keyFrom = [-1.6, 3.2, 3.4],
  key = 2.4,
  shadows = false,
}) => (
  <>
    <ambientLight intensity={0.35} />
    <directionalLight
      position={keyFrom}
      intensity={key}
      castShadow={shadows}
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0004}
      shadow-radius={8}
      shadow-camera-left={-2}
      shadow-camera-right={2}
      shadow-camera-top={2}
      shadow-camera-bottom={-2}
    />
    <directionalLight position={rimFrom} intensity={rim} color="#e8f4ff" />
    <directionalLight position={[-3, 0.6, -2]} intensity={0.8} color="#d9f2e4" />
  </>
);

// Macro del canto de acrílico de 3 mm, fondo negro.
export const WebEdge: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <ThreeCanvas width={width} height={height} gl={GL_PROPS}>
        <CameraRig position={[1.3, 0.8, 0.22]} target={[0.42, 0.34, -0.12]} fov={28} roll={-0.22} />
        <StudioEnvironment intensity={0.95} />
        <NeutralLights rimFrom={[1.6, 3.2, -1.6]} rim={3.6} keyFrom={[-1.4, 2.2, 3.0]} key={2.3} />
        <CardModel position={[0, 0, 0]} rotation={[0.05, 0.32, 0]} castShadow={false} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

// La tarjeta sobre una encimera de piedra con un foco cenital.
export const WebCounter: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <ThreeCanvas width={width} height={height} shadows gl={GL_PROPS}>
        <CameraRig position={[0.05, 1.3, 1.95]} target={[-0.36, -0.02, -0.26]} fov={30} />
        <Fog />
        <StudioEnvironment intensity={0.75} />
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[-1.8, 3.2, 1.4]}
          intensity={2.4}
          color="#fff3e6"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-camera-left={-2}
          shadow-camera-right={2}
          shadow-camera-top={2}
          shadow-camera-bottom={-2}
        />
        <directionalLight position={[2, 1.5, 2]} intensity={0.6} color="#dfe9ff" />
        <spotLight position={[0.2, 3.1, 0.8]} angle={0.42} penumbra={0.9} intensity={13} distance={9} decay={1.6} color="#fff6ea" />
        <Table />
        <CardModel position={[0, CARD.depth / 2 + 0.004, 0]} rotation={[-Math.PI / 2, 0, -0.32]} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

// Montón de tarjetas para cada pack, fondo transparente con sombra suave.
export const WebStack: React.FC<{ count: number }> = ({ count }) => {
  const { width, height } = useVideoConfig();
  const step = CARD.depth + 0.012;
  return (
    <AbsoluteFill>
      <ThreeCanvas width={width} height={height} shadows gl={GL_PROPS}>
        <CameraRig position={[0, 2.35, 2.25]} target={[0, 0.06, 0.02]} fov={27} />
        <StudioEnvironment intensity={1} />
        <NeutralLights shadows keyFrom={[-0.9, 3.4, 1.6]} key={2.2} rim={1.2} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[8, 8]} />
          <shadowMaterial opacity={0.22} transparent />
        </mesh>
        {new Array(count).fill(0).map((_, i) => {
          const t = count === 1 ? 0 : i / (count - 1);
          // Abanico: las de abajo se abren hacia la izquierda, la de arriba queda recta.
          const rz = (1 - t) * (0.1 + count * 0.035) - 0.04;
          const x = (1 - t) * -(0.06 + count * 0.018);
          const z = (1 - t) * (0.03 + count * 0.008);
          return <CardModel key={i} position={[x, CARD.depth / 2 + 0.002 + i * step, z]} rotation={[-Math.PI / 2, 0, rz]} />;
        })}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
