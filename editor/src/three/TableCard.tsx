import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import type React from "react";
import { useEffect, useMemo } from "react";
import { random, useVideoConfig } from "remotion";
import * as THREE from "three";
import { COLORS } from "../theme";
import { Ripples3D } from "./Ripples3D";
import { CameraRig, CARD, CardModel, GL_PROPS, SPOTS, StudioEnvironment } from "./stage";

type V3 = [number, number, number];

export const TABLE_CAMERA = { position: [0, 2.95, 3.25] as V3, target: [0, 0, -0.3] as V3, fov: 30 };
const FACE_Z = CARD.depth / 2 + 0.006;

// Punto de la cara de la tarjeta (tumbada en la mesa, girada `rz`) en coordenadas de mundo.
export const tableCardPoint = (local: THREE.Vector3, rz: number): THREE.Vector3 =>
  new THREE.Vector3(local.x, local.y, FACE_Z).applyEuler(new THREE.Euler(-Math.PI / 2, 0, rz)).add(new THREE.Vector3(0, CARD.depth / 2 + 0.004, 0));

// Proyección a píxeles de pantalla con la misma cámara que usa la escena.
export const projectToScreen = (world: THREE.Vector3, width: number, height: number) => {
  const cam = new THREE.PerspectiveCamera(TABLE_CAMERA.fov, width / height, 0.01, 100);
  cam.position.set(...TABLE_CAMERA.position);
  cam.lookAt(...TABLE_CAMERA.target);
  cam.updateMatrixWorld();
  const v = world.clone().project(cam);
  return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height };
};

// Encimera de piedra oscura pulida generada por código (sin texturas externas).
const useStoneTexture = () =>
  useMemo(() => {
    const size = 1024;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#262c38";
    ctx.fillRect(0, 0, size, size);
    // Manchas grandes y suaves, dibujadas también desplazadas para que la textura repita sin juntas
    for (let i = 0; i < 26; i++) {
      const r = 120 + random(`st-r-${i}`) * 320;
      const tone = random(`st-t-${i}`) > 0.5 ? "60,68,84" : "8,10,14";
      for (const dx of [-size, 0, size]) {
        for (const dy of [-size, 0, size]) {
          const x = random(`st-x-${i}`) * size + dx;
          const y = random(`st-y-${i}`) * size + dy;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, `rgba(${tone},0.22)`);
          g.addColorStop(1, `rgba(${tone},0)`);
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, size, size);
        }
      }
    }
    // Grano fino (puntos independientes: repite sin juntas)
    for (let i = 0; i < 9000; i++) {
      const v = random(`st-g-${i}`);
      ctx.fillStyle = v > 0.5 ? `rgba(150,160,180,${0.05 + v * 0.06})` : `rgba(0,0,0,${0.08 + v * 0.1})`;
      ctx.fillRect(random(`st-px-${i}`) * size, random(`st-py-${i}`) * size, 1.4, 1.4);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.anisotropy = 16;
    return tex;
  }, []);

const Fog: React.FC = () => {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.fog = new THREE.Fog(COLORS.night, 3.2, 7.5);
    return () => {
      scene.fog = null;
    };
  }, [scene]);
  return null;
};

const Table: React.FC = () => {
  const stone = useStoneTexture();
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[12, 12]} />
      <meshPhysicalMaterial map={stone} roughness={0.38} clearcoat={0.8} clearcoatRoughness={0.12} />
    </mesh>
  );
};

export const TableCard: React.FC<{ image?: string; rz: number; rippleAt: number; style?: React.CSSProperties }> = ({ image, rz, rippleAt, style }) => {
  const { width, height } = useVideoConfig();
  return (
    <div style={{ position: "absolute", inset: 0, ...style }}>
      <ThreeCanvas width={width} height={height} shadows gl={GL_PROPS}>
        <CameraRig position={TABLE_CAMERA.position} target={TABLE_CAMERA.target} fov={TABLE_CAMERA.fov} />
        <Fog />
        <StudioEnvironment intensity={0.8} />
        <ambientLight intensity={0.45} />
        <directionalLight
          position={[-1.8, 3.2, 1.4]}
          intensity={2.6}
          color="#fff3e6"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-camera-left={-2}
          shadow-camera-right={2}
          shadow-camera-top={2}
          shadow-camera-bottom={-2}
        />
        <directionalLight position={[2, 1.5, 2]} intensity={0.7} color="#b9d0ff" />
        {/* Foco cenital: círculo de luz sobre la encimera alrededor de la tarjeta */}
        <spotLight position={[0.3, 3.2, 0.9]} angle={0.42} penumbra={0.9} intensity={14} distance={9} decay={1.6} color="#fff6ea" />
        <Table />
        <CardModel image={image} position={[0, CARD.depth / 2 + 0.004, 0]} rotation={[-Math.PI / 2, 0, rz]} />
        <group position={[0, CARD.depth / 2 + 0.004, 0]} rotation={[-Math.PI / 2, 0, rz]}>
          <Ripples3D at={rippleAt} center={[SPOTS.nfc.x, SPOTS.nfc.y, 0.022]} maxRadius={0.5} />
        </group>
      </ThreeCanvas>
    </div>
  );
};
