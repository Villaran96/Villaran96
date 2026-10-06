import type React from "react";
import { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { EASE_OUT } from "../components/motion";

type V3 = [number, number, number];

// Ondas NFC en 3D sobre la cara de la tarjeta (coordenadas locales de la cara).
export const Ripples3D: React.FC<{ at: number; center: V3; color?: string; maxRadius?: number }> = ({ at, center, color = "#2f74f5", maxRadius = 0.42 }) => {
  const frame = useCurrentFrame();
  const geo = useMemo(() => new THREE.RingGeometry(0.84, 1, 96), []);
  return (
    <>
      {[0, 1, 2, 3].map((i) => {
        const t = frame - at - i * 7;
        if (t < 0 || t > 40) return null;
        const p = interpolate(t, [0, 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
        return (
          <mesh key={i} geometry={geo} position={[center[0], center[1], center[2] + 0.002 + i * 0.0005]} scale={0.06 + p * maxRadius} renderOrder={5}>
            <meshBasicMaterial color={color} transparent opacity={(1 - p) * 0.85} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
    </>
  );
};
