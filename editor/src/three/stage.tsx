import { useLoader, useThree } from "@react-three/fiber";
import React, { useEffect, useLayoutEffect, useMemo } from "react";
import { staticFile } from "remotion";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export const DEFAULT_CARD_IMAGE = "tarjetas/diseno.jpg";

// Escala del mundo: 1 unidad = 10 cm. La tarjeta real mide 10 × 10 cm y 3 mm de grosor.
export const CARD = { size: 1, depth: 0.03, radius: 0.05 };
// Puntos del diseño (coordenadas locales de la cara, centro = 0,0; +y hacia arriba).
export const SPOTS = {
  stars: new THREE.Vector3(0, 0.38, 0),
  heading: new THREE.Vector3(0, 0.24, 0),
  logo: new THREE.Vector3(0, 0.015, 0),
  nfc: new THREE.Vector3(0, -0.2, 0),
  brand: new THREE.Vector3(0.39, -0.39, 0),
};

type Vec3 = [number, number, number];

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

const faceGeometry = (size: number, r: number, mirror: boolean) => {
  const geo = new THREE.ShapeGeometry(roundedSquare(size, r), 32);
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

// Geometrías compartidas por todas las tarjetas de la escena.
const useCardGeometries = () =>
  useMemo(
    () => ({
      body: new THREE.ExtrudeGeometry(roundedSquare(CARD.size, CARD.radius), {
        depth: CARD.depth,
        bevelEnabled: true,
        bevelSize: 0.004,
        bevelThickness: 0.004,
        bevelSegments: 4,
        curveSegments: 32,
      }),
      front: faceGeometry(CARD.size - 0.002, CARD.radius, false),
      back: faceGeometry(CARD.size - 0.002, CARD.radius, true),
    }),
    [],
  );

// El reflejo se desvanece al alejarse del suelo (shader inyectado en el material estándar).
const withFloorFade = (mat: THREE.Material, floorY: number, fade: number, opacity: number) => {
  mat.transparent = true;
  mat.opacity = opacity;
  mat.depthWrite = false;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFloorY = { value: floorY };
    shader.uniforms.uFade = { value: fade };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vWorldY;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvWorldY = (modelMatrix * vec4(transformed, 1.0)).y;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vWorldY;\nuniform float uFloorY;\nuniform float uFade;")
      .replace("#include <dithering_fragment>", "#include <dithering_fragment>\ngl_FragColor.a *= smoothstep(uFloorY - uFade, uFloorY, vWorldY);");
  };
  mat.customProgramCacheKey = () => `floorfade-${floorY}-${fade}`;
  return mat;
};

type CardProps = {
  readonly image?: string;
  readonly position?: Vec3;
  readonly rotation?: Vec3;
  readonly scale?: number;
  // Reflejo en el suelo: altura del suelo, opacidad y distancia de desvanecimiento.
  readonly reflection?: { floorY: number; opacity?: number; fade?: number };
  readonly castShadow?: boolean;
};

const useCardMaterials = (image: string | undefined, ghost?: { floorY: number; opacity: number; fade: number }) => {
  const texture = useLoader(THREE.TextureLoader, staticFile(image || DEFAULT_CARD_IMAGE));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  const gFloor = ghost?.floorY;
  const gOpacity = ghost?.opacity;
  const gFade = ghost?.fade;
  return useMemo(() => {
    const body = new THREE.MeshPhysicalMaterial({ color: "#e6f1ee", roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.3, sheenColor: new THREE.Color("#cfe9e4") });
    const front = new THREE.MeshPhysicalMaterial({ map: texture, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.07 });
    const back = new THREE.MeshPhysicalMaterial({ map: texture, color: "#f1f6f6", roughness: 0.42, clearcoat: 0.6, transparent: true, opacity: 0.9 });
    if (gFloor !== undefined && gOpacity !== undefined && gFade !== undefined) {
      [body, front, back].forEach((m) => withFloorFade(m, gFloor, gFade, gOpacity));
    }
    return { body, front, back };
  }, [texture, gFloor, gOpacity, gFade]);
};

const CardMeshes: React.FC<{ mats: ReturnType<typeof useCardMaterials>; castShadow: boolean }> = ({ mats, castShadow }) => {
  const geo = useCardGeometries();
  return (
    <>
      <mesh geometry={geo.body} material={mats.body} position={[0, 0, -CARD.depth / 2]} castShadow={castShadow} />
      <mesh geometry={geo.front} material={mats.front} position={[0, 0, CARD.depth / 2 + 0.0046]} />
      <mesh geometry={geo.back} material={mats.back} position={[0, 0, -CARD.depth / 2 - 0.0046]} rotation={[0, Math.PI, 0]} />
    </>
  );
};

const Reflection: React.FC<{ image?: string; position: Vec3; rotation: Vec3; scale: number; floorY: number; opacity: number; fade: number }> = ({
  image,
  position,
  rotation,
  scale,
  floorY,
  opacity,
  fade,
}) => {
  const mats = useCardMaterials(image, { floorY, opacity, fade });
  // Espejo respecto al plano del suelo: y' = 2·suelo − y.
  return (
    <group position={[0, 2 * floorY, 0]} scale={[1, -1, 1]}>
      <group position={position} rotation={rotation} scale={scale} renderOrder={2}>
        <CardMeshes mats={mats} castShadow={false} />
      </group>
    </group>
  );
};

export const CardModel: React.FC<CardProps> = ({ image, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, reflection, castShadow = true }) => {
  const mats = useCardMaterials(image);
  return (
    <>
      <group position={position} rotation={rotation} scale={scale}>
        <CardMeshes mats={mats} castShadow={castShadow} />
      </group>
      {reflection ? (
        <Reflection
          image={image}
          position={position}
          rotation={rotation}
          scale={scale}
          floorY={reflection.floorY}
          opacity={reflection.opacity ?? 0.3}
          fade={reflection.fade ?? 0.45}
        />
      ) : null}
    </>
  );
};

// Reflejos de estudio generados en local (sin HDRIs externos).
export const StudioEnvironment: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = intensity;
    return () => {
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, intensity]);
  return null;
};

// Cámara controlada por fotograma (sin useFrame: cada fotograma de Remotion la recoloca).
export const CameraRig: React.FC<{ position: Vec3; target: Vec3; fov?: number; roll?: number }> = ({ position, target, fov = 30, roll = 0 }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...position);
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    camera.lookAt(...target);
    camera.fov = fov;
    camera.near = 0.01;
    camera.far = 100;
    camera.updateProjectionMatrix();
  }, [camera, position, target, fov, roll]);
  return null;
};

// Suelo oscuro que recibe la sombra y se funde con el fondo HTML hacia los bordes.
export const StudioFloor: React.FC<{ y: number; color?: string; shadowOpacity?: number; size?: number }> = ({ y, color = "#05070c", shadowOpacity = 0.55, size = 14 }) => {
  const alphaMap = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.45, "#bbbbbb");
    g.addColorStop(1, "#000000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <>
      <mesh position={[0, y - 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} transparent alphaMap={alphaMap} opacity={0.6} depthWrite={false} />
      </mesh>
      <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow renderOrder={3}>
        <planeGeometry args={[size, size]} />
        <shadowMaterial opacity={shadowOpacity} transparent depthWrite={false} />
      </mesh>
    </>
  );
};

// Luz de estudio: principal suave con sombra, relleno frío y contraluces con los colores de marca.
export const StudioLights: React.FC<{ keyIntensity?: number; rim?: number; rimAngle?: number }> = ({ keyIntensity = 2.4, rim = 1, rimAngle = 0 }) => (
  <>
    <ambientLight intensity={0.55} />
    <directionalLight
      position={[1.3, 3.6, 4.4]}
      intensity={keyIntensity}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0004}
      shadow-camera-left={-2}
      shadow-camera-right={2}
      shadow-camera-top={2}
      shadow-camera-bottom={-2}
    />
    <directionalLight position={[-3, 1.2, 2]} intensity={0.6} color="#b9d0ff" />
    <pointLight position={[Math.cos(rimAngle) * -1.6, 0.9, -1.2 + Math.sin(rimAngle) * 0.4]} intensity={6 * rim} distance={6} color="#4285F4" />
    <pointLight position={[Math.cos(rimAngle) * 1.6, 0.6, -1.2 - Math.sin(rimAngle) * 0.4]} intensity={5 * rim} distance={6} color="#EA4335" />
    <pointLight position={[0, 1.8, -1.4]} intensity={3 * rim} distance={6} color="#FBBC05" />
  </>
);

export const GL_PROPS = {
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
  toneMapping: THREE.NeutralToneMapping,
  toneMappingExposure: 1.25,
} as const;
