import { useLoader, useThree } from "@react-three/fiber";
import type React from "react";
import { useLayoutEffect, useMemo } from "react";
import { staticFile } from "remotion";
import * as THREE from "three";
import { SANS } from "../fonts";
import timeline from "./timeline.json";

// Diorama isométrico low-poly: una cafetería sobre una isla flotante, con sombreado "toon".

type V3 = [number, number, number];
const T = timeline;

export const hourAt = (frame: number) => T.hours[0] + ((T.hours[1] - T.hours[0]) * frame) / T.duration;

const hex = (h: string) => new THREE.Color(h);
export const lerpColor = (stops: [number, string][], x: number) => {
  if (x <= stops[0][0]) return hex(stops[0][1]);
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i];
    const [b, cb] = stops[i + 1];
    if (x <= b) return hex(ca).lerp(hex(cb), (x - a) / (b - a));
  }
  return hex(stops[stops.length - 1][1]);
};
export const lerpNum = (stops: [number, number][], x: number) => {
  if (x <= stops[0][0]) return stops[0][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, va] = stops[i];
    const [b, vb] = stops[i + 1];
    if (x <= b) return va + ((vb - va) * (x - a)) / (b - a);
  }
  return stops[stops.length - 1][1];
};

// Nivel de "noche" (0 de día, 1 de noche) según la hora.
export const nightAt = (h: number) => lerpNum([[8, 0], [18, 0], [20, 0.75], [21, 1]], h);

const useToon = () =>
  useMemo(() => {
    const data = new Uint8Array([70, 150, 255]);
    const tex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  }, []);

const Toon: React.FC<{ color: string; emissive?: string; emissiveIntensity?: number; grad: THREE.Texture }> = ({ color, emissive, emissiveIntensity = 0, grad }) => (
  <meshToonMaterial color={color} gradientMap={grad} emissive={emissive ?? "#000000"} emissiveIntensity={emissiveIntensity} />
);

const Box: React.FC<{ p: V3; s: V3; color: string; grad: THREE.Texture; r?: V3; emissive?: string; ei?: number; cast?: boolean }> = ({ p, s, color, grad, r = [0, 0, 0], emissive, ei, cast = true }) => (
  <mesh position={p} rotation={r} castShadow={cast} receiveShadow>
    <boxGeometry args={s} />
    <Toon color={color} grad={grad} emissive={emissive} emissiveIntensity={ei} />
  </mesh>
);

// ---------- recorridos ----------
const PATH: [number, number][] = [
  [3.5, 3.9],
  [1.4, 1.4],
  [-0.9, -0.5],
  [-1.6, -1.5],
];
const STAND_OFFSET = [0, 0, -0.42, 0.42, 0];
export const CARD_POS: V3 = [-1.6, 1.24, -2.12];
const SIGN_POS: V3 = [-1.5, 3.2, -3.42];
export const slotPos = (i: number): V3 => [SIGN_POS[0] + (i - 2) * 0.384, SIGN_POS[1] - 0.19, SIGN_POS[2] + 0.03];

const along = (pts: [number, number][], k: number) => {
  const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = segs.reduce((a, b) => a + b, 0);
  let d = k * total;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) {
      const t = Math.min(1, d / segs[i]);
      return {
        x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t,
        z: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t,
        dir: Math.atan2(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]),
      };
    }
    d -= segs[i];
  }
  return { x: pts[0][0], z: pts[0][1], dir: 0 };
};
const smooth = (t: number) => t * t * (3 - 2 * t);

export type CustomerState = { x: number; z: number; dir: number; walking: boolean; t: number; phone: boolean; scale: number };
export const customerAt = (i: number, frame: number): CustomerState | null => {
  const c = T.customers[i];
  const t = frame - c.at;
  if (t < 0 || t > T.walk * 2 + T.stay) return null;
  const pts = PATH.map((p, k) => (k === PATH.length - 1 ? ([p[0] + STAND_OFFSET[i], p[1]] as [number, number]) : p));
  const appear = Math.min(1, t / 8, (T.walk * 2 + T.stay - t) / 8);
  if (t < T.walk) {
    const s = along(pts, smooth(t / T.walk));
    return { ...s, walking: true, t, phone: false, scale: appear };
  }
  if (t < T.walk + T.stay) {
    const s = along(pts, 1);
    const st = t - T.walk;
    return { x: s.x, z: s.z, dir: Math.PI, walking: false, t, phone: st > T.tapAfter - 6 && st < T.tapAfter + 16, scale: 1 };
  }
  const back = [...pts].reverse();
  const s = along(back, smooth((t - T.walk - T.stay) / T.walk));
  return { ...s, walking: true, t, phone: false, scale: appear };
};
export const tapFrame = (i: number) => T.customers[i].at + T.walk + T.tapAfter;
export const arriveFrame = (i: number) => tapFrame(i) + T.flight;

// ---------- piezas ----------
const Island: React.FC<{ grad: THREE.Texture }> = ({ grad }) => (
  <group>
    <Box p={[0, -0.12, 0]} s={[8.4, 0.24, 8.4]} color="#9ccb6a" grad={grad} cast={false} />
    <Box p={[0, -0.7, 0]} s={[8.3, 0.95, 8.3]} color="#a0714f" grad={grad} cast={false} />
    <mesh position={[0, -4.42, 0]} rotation={[Math.PI, Math.PI / 4, 0]}>
      <coneGeometry args={[5.85, 6.5, 4]} />
      <Toon color="#8c7b6e" grad={grad} />
    </mesh>
    <mesh position={[1.6, -2.6, 2.0]} rotation={[Math.PI, 0.3, 0]}>
      <coneGeometry args={[1.8, 3.2, 5]} />
      <Toon color="#7a6a5e" grad={grad} />
    </mesh>
  </group>
);

const Stones: React.FC<{ grad: THREE.Texture }> = ({ grad }) => {
  const stones = useMemo(() => {
    const out: V3[] = [];
    for (let k = 0; k <= 1; k += 0.07) {
      const s = along(PATH.slice(0, 3), k);
      out.push([s.x + Math.sin(k * 40) * 0.08, 0.01, s.z + Math.cos(k * 33) * 0.08]);
    }
    return out;
  }, []);
  return (
    <>
      {stones.map((p, i) => (
        <mesh key={i} position={p} rotation={[0, i * 0.7, 0]} receiveShadow>
          <cylinderGeometry args={[0.24, 0.26, 0.05, 6]} />
          <Toon color="#d9d2c3" grad={grad} />
        </mesh>
      ))}
    </>
  );
};

const Tree: React.FC<{ p: V3; s?: number; grad: THREE.Texture; tone?: string }> = ({ p, s = 1, grad, tone = "#6faf5a" }) => (
  <group position={p} scale={s}>
    <Box p={[0, 0.5, 0]} s={[0.22, 1, 0.22]} color="#8a5a3c" grad={grad} />
    <mesh position={[0, 1.45, 0]} castShadow>
      <icosahedronGeometry args={[0.85, 0]} />
      <Toon color={tone} grad={grad} />
    </mesh>
    <mesh position={[0.2, 2.1, 0.1]} castShadow>
      <icosahedronGeometry args={[0.55, 0]} />
      <Toon color="#86c46c" grad={grad} />
    </mesh>
  </group>
);

const Table: React.FC<{ p: V3; color: string; grad: THREE.Texture }> = ({ p, color, grad }) => (
  <group position={p}>
    <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.42, 0.42, 0.06, 10]} />
      <Toon color="#ffffff" grad={grad} />
    </mesh>
    <Box p={[0, 0.31, 0]} s={[0.07, 0.62, 0.07]} color="#555b66" grad={grad} />
    <Box p={[0, 1.0, 0]} s={[0.05, 1.3, 0.05]} color="#555b66" grad={grad} />
    <mesh position={[0, 1.62, 0]} castShadow>
      <coneGeometry args={[0.95, 0.42, 8]} />
      <Toon color={color} grad={grad} />
    </mesh>
    {[0, 1].map((k) => (
      <Box key={k} p={[k ? 0.62 : -0.62, 0.25, 0]} s={[0.3, 0.5, 0.3]} color="#c99a6a" grad={grad} />
    ))}
  </group>
);

const Lamp: React.FC<{ p: V3; night: number; grad: THREE.Texture }> = ({ p, night, grad }) => (
  <group position={p}>
    <Box p={[0, 0.9, 0]} s={[0.08, 1.8, 0.08]} color="#3c4250" grad={grad} />
    <mesh position={[0, 1.9, 0]}>
      <sphereGeometry args={[0.16, 10, 8]} />
      <meshBasicMaterial color={new THREE.Color("#fff3c4").lerp(new THREE.Color("#ffe08a"), night)} toneMapped={false} />
    </mesh>
    <pointLight position={[0, 1.9, 0]} intensity={night * 6} distance={4} decay={1.6} color="#ffcf7a" />
  </group>
);

const signTexture = (lit: number, night: number) => {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 192;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#24453a";
  ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = "#f4e3c3";
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 172);
  ctx.fillStyle = night > 0.3 ? "#fff3d6" : "#f4e3c3";
  ctx.font = `800 64px "${SANS}", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("CAFÉ", 256, 82);
  for (let i = 0; i < 5; i++) {
    const cx = 256 + (i - 2) * 82;
    const cy = 136;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const r = k % 2 ? 13 : 30;
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = i < lit ? "#fbbc05" : "#3b5f53";
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
};

const Sign: React.FC<{ lit: number; night: number; grad: THREE.Texture }> = ({ lit, night, grad }) => {
  const nightKey = night > 0.3 ? 1 : 0;
  const tex = useMemo(() => signTexture(lit, nightKey), [lit, nightKey]);
  return (
    <group position={SIGN_POS}>
      <Box p={[-1.1, -0.7, -0.05]} s={[0.08, 1.4, 0.08]} color="#24453a" grad={grad} />
      <Box p={[1.1, -0.7, -0.05]} s={[0.08, 1.4, 0.08]} color="#24453a" grad={grad} />
      <Box p={[0, 0, -0.06]} s={[2.5, 0.98, 0.08]} color="#24453a" grad={grad} />
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[2.4, 0.9]} />
        <meshBasicMaterial map={tex} toneMapped={false} color={new THREE.Color("#ffffff").multiplyScalar(0.82 + 0.25 * night)} />
      </mesh>
    </group>
  );
};

// La tarjeta real de pie sobre la barra (textura de la foto).
const Card: React.FC<{ glow: number }> = ({ glow }) => {
  const tex = useLoader(THREE.TextureLoader, staticFile("motion/tarjeta.png"));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return (
    <group position={CARD_POS}>
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.44, 0.44, 0.03]} />
        <meshStandardMaterial color="#eef5f3" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.017]}>
        <planeGeometry args={[0.43, 0.43]} />
        <meshBasicMaterial map={tex} toneMapped={false} color={new THREE.Color("#ffffff").multiplyScalar(0.9 + glow * 0.3)} />
      </mesh>
      <mesh position={[0, -0.24, -0.05]}>
        <boxGeometry args={[0.3, 0.04, 0.16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  );
};

const Cafe: React.FC<{ night: number; grad: THREE.Texture; lit: number; cardGlow: number }> = ({ night, grad, lit, cardGlow }) => {
  const wall = "#f4e3c3";
  const trim = "#d9824a";
  return (
    <group>
      {/* Suelo de madera y paredes (corte de casa de muñecas: sin pared delantera ni techo) */}
      <Box p={[-1.5, 0.03, -2.1]} s={[4.2, 0.06, 3.0]} color="#c99a6a" grad={grad} cast={false} />
      {[-3.3, -2.7, -2.1, -1.5, -0.9, -0.3, 0.3].map((x) => (
        <Box key={x} p={[x, 0.065, -2.1]} s={[0.02, 0.01, 2.96]} color="#b48555" grad={grad} cast={false} />
      ))}
      <Box p={[-1.5, 1.15, -3.55]} s={[4.2, 2.3, 0.2]} color={wall} grad={grad} />
      <Box p={[-3.55, 1.15, -2.1]} s={[0.2, 2.3, 3.0]} color={wall} grad={grad} />
      <Box p={[0.55, 1.15, -2.55]} s={[0.2, 2.3, 2.1]} color={wall} grad={grad} />
      <Box p={[-1.5, 2.35, -3.55]} s={[4.3, 0.12, 0.3]} color={trim} grad={grad} />
      <Box p={[-3.55, 2.35, -2.1]} s={[0.3, 0.12, 3.1]} color={trim} grad={grad} />
      <Box p={[0.55, 2.35, -2.55]} s={[0.3, 0.12, 2.2]} color={trim} grad={grad} />
      {/* Ventana del lateral, encendida de noche */}
      <Box p={[0.66, 1.35, -2.4]} s={[0.04, 0.8, 1.0]} color="#9fd3f2" grad={grad} emissive="#ffc879" ei={night * 1.4} cast={false} />
      {/* Barra, cafetera y estante */}
      <Box p={[-1.8, 0.5, -2.35]} s={[2.4, 1.0, 0.5]} color="#8d5a3b" grad={grad} />
      <Box p={[-1.8, 1.03, -2.35]} s={[2.5, 0.06, 0.6]} color="#e9d2b0" grad={grad} />
      <Box p={[-2.75, 1.3, -2.45]} s={[0.45, 0.5, 0.35]} color="#6f7782" grad={grad} />
      <Box p={[-2.75, 1.57, -2.45]} s={[0.47, 0.05, 0.37]} color="#c9ced6" grad={grad} />
      <Box p={[-1.5, 1.75, -3.38]} s={[2.6, 0.06, 0.25]} color="#a8754a" grad={grad} />
      {[-2.5, -2.0, -1.5, -1.0, -0.5].map((x) => (
        <mesh key={x} position={[x, 1.86, -3.36]} castShadow>
          <cylinderGeometry args={[0.07, 0.06, 0.15, 8]} />
          <Toon color="#ffffff" grad={grad} />
        </mesh>
      ))}
      {/* Barista */}
      <group position={[-2.1, 0, -3.0]}>
        <mesh position={[0, 0.6, 0]} castShadow>
          <capsuleGeometry args={[0.22, 0.5, 4, 8]} />
          <Toon color="#ffffff" grad={grad} />
        </mesh>
        <mesh position={[0, 1.2, 0]} castShadow>
          <sphereGeometry args={[0.2, 12, 10]} />
          <Toon color="#f2c49b" grad={grad} />
        </mesh>
        <mesh position={[0, 1.27, -0.02]}>
          <sphereGeometry args={[0.215, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <Toon color="#2b2b2b" grad={grad} />
        </mesh>
      </group>
      <Card glow={cardGlow} />
      <Sign lit={lit} night={night} grad={grad} />
      <pointLight position={[-1.6, 2.0, -1.6]} intensity={night * 9} distance={6} decay={1.5} color="#ffbf6e" />
    </group>
  );
};

const Person: React.FC<{ s: CustomerState; shirt: string; hair: string; grad: THREE.Texture; seed: number }> = ({ s, shirt, hair, grad, seed }) => {
  const swing = s.walking ? Math.sin(s.t * 0.55 + seed) : 0;
  const bob = s.walking ? Math.abs(Math.sin(s.t * 0.55 + seed)) * 0.05 : 0;
  return (
    <group position={[s.x, bob, s.z]} rotation={[0, s.dir, 0]} scale={s.scale}>
      <Box p={[-0.1, 0.22, swing * 0.06]} s={[0.12, 0.44, 0.12]} r={[swing * 0.5, 0, 0]} color="#3d4454" grad={grad} />
      <Box p={[0.1, 0.22, -swing * 0.06]} s={[0.12, 0.44, 0.12]} r={[-swing * 0.5, 0, 0]} color="#3d4454" grad={grad} />
      <mesh position={[0, 0.72, 0]} castShadow>
        <capsuleGeometry args={[0.21, 0.36, 4, 8]} />
        <Toon color={shirt} grad={grad} />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <sphereGeometry args={[0.19, 12, 10]} />
        <Toon color="#f2c49b" grad={grad} />
      </mesh>
      <mesh position={[0, 1.27, -0.02]}>
        <sphereGeometry args={[0.205, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Toon color={hair} grad={grad} />
      </mesh>
      {s.phone ? (
        <group position={[0.2, 1.0, 0.3]} rotation={[-0.5, 0, 0]}>
          <Box p={[0, 0, 0]} s={[0.12, 0.22, 0.03]} color="#1d1d24" grad={grad} />
          <Box p={[0, 0, 0.018]} s={[0.1, 0.18, 0.005]} color="#7ec8ff" grad={grad} emissive="#7ec8ff" ei={0.6} cast={false} />
        </group>
      ) : null}
    </group>
  );
};

const STAR_SHAPE = (() => {
  const s = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const r = k % 2 ? 0.06 : 0.14;
    const x = Math.cos(a) * r;
    const y = -Math.sin(a) * r;
    if (k === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
})();

const FlyingStar: React.FC<{ from: V3; to: V3; k: number }> = ({ from, to, k }) => {
  const e = smooth(k);
  const p: V3 = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e + Math.sin(k * Math.PI) * 1.1, from[2] + (to[2] - from[2]) * e];
  return (
    <group position={p} rotation={[0, 0, k * 8]} scale={0.9 + Math.sin(k * Math.PI) * 0.6}>
      <mesh>
        <extrudeGeometry args={[STAR_SHAPE, { depth: 0.04, bevelEnabled: false }]} />
        <meshBasicMaterial color="#fbbc05" toneMapped={false} />
      </mesh>
      <pointLight intensity={2} distance={1.6} color="#ffd25a" />
    </group>
  );
};

// Ondas NFC al tocar la tarjeta.
const TapRings: React.FC<{ t: number }> = ({ t }) => (
  <group position={[CARD_POS[0], CARD_POS[1], CARD_POS[2] + 0.04]}>
    {[0, 1, 2].map((k) => {
      const u = (t - k * 5) / 20;
      if (u < 0 || u > 1) return null;
      return (
        <mesh key={k} scale={0.25 + u * 0.9}>
          <ringGeometry args={[0.36, 0.4, 40]} />
          <meshBasicMaterial color={["#8AB4F8", "#81C995", "#FDD663"][k]} transparent opacity={1 - u} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      );
    })}
  </group>
);

const OrthoRig: React.FC<{ target: V3; zoom: number; angle: number }> = ({ target, zoom, angle }) => {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const [tx, ty, tz] = target;
  useLayoutEffect(() => {
    const r = 30;
    const a = Math.PI / 4 + angle;
    camera.position.set(tx + Math.sin(a) * r, ty + r * 0.82, tz + Math.cos(a) * r);
    camera.lookAt(tx, ty, tz);
    camera.zoom = zoom;
    camera.near = 0.1;
    camera.far = 200;
    camera.updateProjectionMatrix();
  }, [camera, tx, ty, tz, zoom, angle]);
  return null;
};

export const World: React.FC<{ frame: number; target: V3; zoom: number; angle: number }> = ({ frame, target, zoom, angle }) => {
  const grad = useToon();
  const h = hourAt(frame);
  const night = nightAt(h);
  const day = (h - 8) / 13;
  const sunA = -0.9 + day * 2.4;
  const sunColor = lerpColor([[8, "#ffd9a8"], [12, "#fff6e8"], [17, "#ffc58a"], [19.5, "#ff8a5c"], [21, "#7d8cff"]], h);
  const sunI = lerpNum([[8, 1.6], [12, 2.3], [17, 1.9], [19.5, 1.0], [21, 0.35], [22, 0.3]], h);
  const hemiSky = lerpColor([[8, "#ffe9d0"], [12, "#dff1ff"], [17, "#ffe0c4"], [19.5, "#c58ac9"], [21, "#2c3570"]], h);
  const lit = T.customers.filter((_, i) => frame >= arriveFrame(i)).length;
  const glow = T.customers.reduce((g, _, i) => {
    const d = frame - tapFrame(i);
    return d >= 0 && d < 12 ? Math.max(g, 1 - d / 12) : g;
  }, 0);
  return (
    <>
      <OrthoRig target={target} zoom={zoom} angle={angle} />
      <hemisphereLight color={hemiSky} groundColor="#6b5a4a" intensity={0.9 - night * 0.5} />
      <directionalLight
        position={[Math.sin(sunA) * 12, 9 + Math.sin(day * Math.PI) * 6, Math.cos(sunA) * 8 + 6]}
        intensity={sunI}
        color={sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
      />
      <Island grad={grad} />
      <Stones grad={grad} />
      <Cafe night={night} grad={grad} lit={lit} cardGlow={glow} />
      <Tree p={[-3.1, 0, 2.9]} grad={grad} />
      <Tree p={[3.2, 0, -3.2]} s={1.15} grad={grad} tone="#5f9f50" />
      <Tree p={[-3.4, 0, 0.6]} s={0.7} grad={grad} />
      <Table p={[2.2, 0, -1.6]} color="#F28B82" grad={grad} />
      <Table p={[2.9, 0, 0.6]} color="#8AB4F8" grad={grad} />
      <Lamp p={[0.6, 0, 1.1]} night={night} grad={grad} />
      <Box p={[-2.2, 0.25, 1.6]} s={[1.3, 0.12, 0.4]} color="#c99a6a" grad={grad} />
      <Box p={[-2.7, 0.12, 1.6]} s={[0.1, 0.24, 0.35]} color="#555b66" grad={grad} />
      <Box p={[-1.7, 0.12, 1.6]} s={[0.1, 0.24, 0.35]} color="#555b66" grad={grad} />
      {[
        [1.6, 3.2, "#F28B82"],
        [2.0, 3.4, "#FDD663"],
        [-0.8, 3.3, "#C58AF9"],
        [-1.2, 3.5, "#8AB4F8"],
        [3.4, 2.2, "#FDD663"],
      ].map(([x, z, c]) => (
        <mesh key={`${x}-${z}`} position={[x as number, 0.12, z as number]} castShadow>
          <icosahedronGeometry args={[0.13, 0]} />
          <Toon color={c as string} grad={grad} />
        </mesh>
      ))}
      {T.customers.map((c, i) => {
        const s = customerAt(i, frame);
        return s ? <Person key={i} s={s} shirt={c.shirt} hair={c.hair} grad={grad} seed={i} /> : null;
      })}
      {T.customers.map((_, i) => {
        const d = frame - tapFrame(i);
        return d >= 0 && d < 26 ? <TapRings key={`r${i}`} t={d} /> : null;
      })}
      {T.customers.map((_, i) => {
        const k = (frame - tapFrame(i)) / T.flight;
        return k >= 0 && k < 1 ? <FlyingStar key={`s${i}`} from={CARD_POS} to={slotPos(i)} k={k} /> : null;
      })}
    </>
  );
};
