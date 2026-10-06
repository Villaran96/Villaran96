import { useLoader, useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import React, { useEffect, useMemo } from "react";
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EASE_IN_OUT } from "../components/motion";
import { DEFAULT_CARD_IMAGE } from "../components/NfcCard";
import { COLORS } from "../theme";

// Tarjeta real en Three.js: 1 unidad = 10 cm. Acrílico de 3 mm con esquinas redondeadas.
const SIZE = 1;
const DEPTH = 0.03;
const RADIUS = 0.05;

const roundedSquare = (size: number, r: number) => {
  const s = size / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-s + r, -s);
  shape.lineTo(s - r, -s);
  shape.quadraticCurveTo(s, -s, s, -s + r);
  shape.lineTo(s, s - r);
  shape.quadraticCurveTo(s, s, s - r, s);
  shape.lineTo(-s + r, s);
  shape.quadraticCurveTo(-s, s, -s, s - r);
  shape.lineTo(-s, -s + r);
  shape.quadraticCurveTo(-s, -s, -s + r, -s);
  return shape;
};

// UV 0..1 a partir de las coordenadas de la forma, para que el diseño cubra la cara entera.
const faceGeometry = (size: number, r: number, mirror: boolean) => {
  const geo = new THREE.ShapeGeometry(roundedSquare(size, r), 24);
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getX(i) + size / 2) / size;
    uv[i * 2] = mirror ? 1 - u : u;
    uv[i * 2 + 1] = (pos.getY(i) + size / 2) / size;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
};

// Reflejos de estudio generados en local (sin descargar HDRIs).
const StudioEnvironment: React.FC = () => {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
};

export const CardMesh: React.FC<{ image?: string; rotation: [number, number, number]; position?: [number, number, number] }> = ({
  image,
  rotation,
  position = [0, 0, 0],
}) => {
  const texture = useLoader(THREE.TextureLoader, staticFile(image || DEFAULT_CARD_IMAGE));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const body = useMemo(
    () => new THREE.ExtrudeGeometry(roundedSquare(SIZE, RADIUS), { depth: DEPTH, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 3, curveSegments: 24 }),
    [],
  );
  const front = useMemo(() => faceGeometry(SIZE - 0.002, RADIUS, false), []);
  const back = useMemo(() => faceGeometry(SIZE - 0.002, RADIUS, true), []);

  return (
    <group rotation={rotation} position={position}>
      {/* Cuerpo de metacrilato: transmisión, IOR 1,49 y barniz */}
      <mesh geometry={body} position={[0, 0, -DEPTH / 2]} castShadow>
        <meshPhysicalMaterial color="#eef6f4" roughness={0.12} transmission={0.55} thickness={DEPTH} ior={1.49} clearcoat={1} clearcoatRoughness={0.06} />
      </mesh>
      {/* Cara impresa */}
      <mesh geometry={front} position={[0, 0, DEPTH / 2 + 0.0046]}>
        <meshPhysicalMaterial map={texture} roughness={0.32} clearcoat={1} clearcoatRoughness={0.08} />
      </mesh>
      {/* Dorso: la impresión vista a través del acrílico */}
      <mesh geometry={back} position={[0, 0, -DEPTH / 2 - 0.0046]} rotation={[0, Math.PI, 0]}>
        <meshPhysicalMaterial map={texture} color="#f3f7f7" roughness={0.4} transparent opacity={0.92} clearcoat={0.6} />
      </mesh>
    </group>
  );
};

export const Card3D: React.FC<{ image?: string }> = ({ image }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [0, durationInFrames - 1], [0, 1], { easing: EASE_IN_OUT });
  // Órbita suave: de 3/4 a casi frontal, con un leve cabeceo.
  const ry = interpolate(t, [0, 1], [-0.9, 0.35]);
  const rx = interpolate(t, [0, 1], [0.28, 0.1]);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 50% at 50% 40%, #1b2d5c 0%, ${COLORS.ink} 70%)` }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ fov: 28, position: [0, 0.05, 4.3] }}
        gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.3 }}
      >
        <StudioEnvironment />
        <ambientLight intensity={0.6} />
        <directionalLight position={[2.5, 3, 4]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} />
        <directionalLight position={[-3, 1, -2]} intensity={0.9} color="#8fb4ff" />
        <CardMesh image={image} rotation={[rx, ry, 0]} />
        <mesh position={[0, -0.62, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[8, 8]} />
          <shadowMaterial opacity={0.45} />
        </mesh>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
