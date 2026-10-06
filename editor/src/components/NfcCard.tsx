import type React from "react";
import { Img, staticFile } from "remotion";

// Tarjeta real del cliente: cuadrada, acrílico blanco impreso, esquinas redondeadas.
export const CARD_SIZE = 640;
const RADIUS = 30;
const THICKNESS = 16; // canto de acrílico (px a tamaño base)
export const DEFAULT_CARD_IMAGE = "tarjetas/diseno.jpg";

// Puntos de interés del diseño, en px relativos al centro de la tarjeta (tamaño base).
export const CARD_SPOTS = {
  stars: { x: 0, y: -243 },
  heading: { x: 0, y: -150 },
  logo: { x: 0, y: -10 },
  nfc: { x: 0, y: 127 },
  brand: { x: 252, y: 252 },
};

type Props = {
  readonly rotateX?: number;
  readonly rotateY?: number;
  readonly rotateZ?: number;
  readonly scale?: number;
  // 0→1 recorre el reflejo especular por la cara
  readonly shine?: number;
  // Punto de la tarjeta que queda en el centro de cámara (los giros pivotan sobre él)
  readonly focusX?: number;
  readonly focusY?: number;
  readonly frontImage?: string;
  readonly style?: React.CSSProperties;
};

const face: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: RADIUS,
  overflow: "hidden",
  backfaceVisibility: "hidden",
};

const rad = (d: number) => (d * Math.PI) / 180;

export const NfcCard: React.FC<Props> = ({
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  scale = 1,
  shine = 0,
  focusX = 0,
  focusY = 0,
  frontImage,
  style,
}) => {
  const src = staticFile(frontImage || DEFAULT_CARD_IMAGE);
  // Cuánto mira la cara a cámara (1 = de frente): oscurece al girar, como con luz real.
  const facing = Math.abs(Math.cos(rad(rotateX)) * Math.cos(rad(rotateY)));
  const shade = (1 - facing) * 0.32;
  // El reflejo se desplaza con el giro y con el parámetro shine.
  const pos = -40 + shine * 180 + rotateY * 0.9 - rotateX * 0.4;
  const specular = `linear-gradient(110deg, transparent ${pos - 22}%, rgba(255,255,255,0.10) ${pos - 10}%, rgba(255,255,255,0.55) ${pos}%, rgba(255,255,255,0.10) ${pos + 10}%, transparent ${pos + 22}%)`;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: CARD_SIZE,
        height: CARD_SIZE,
        marginLeft: -CARD_SIZE / 2,
        marginTop: -CARD_SIZE / 2,
        transformStyle: "preserve-3d",
        transform: `scale(${scale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) translate3d(${-focusX}px, ${-focusY}px, 0)`,
        ...style,
      }}
    >
      {/* Canto de acrílico: capas apiladas en Z, translúcidas y algo verdosas como el metacrilato */}
      {new Array(THICKNESS).fill(0).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: RADIUS,
            background: i === 0 || i === THICKNESS - 1 ? "rgb(214,226,228)" : "rgba(232,242,240,0.92)",
            boxShadow: "inset 0 0 0 1px rgba(160,190,190,0.35)",
            transform: `translateZ(${-THICKNESS / 2 + i}px)`,
          }}
        />
      ))}

      {/* Cara frontal: el diseño real */}
      <div style={{ ...face, transform: `translateZ(${THICKNESS / 2 + 0.5}px)`, background: "white" }}>
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(255,255,255,0.22) 0%, transparent 35%, transparent 70%, rgba(0,0,0,0.05) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: specular, mixBlendMode: "screen" }} />
        <div style={{ position: "absolute", inset: 0, background: `rgba(10,20,40,${shade})` }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: RADIUS, boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.85), inset 0 0 18px rgba(255,255,255,0.35)" }} />
      </div>

      {/* Cara trasera: la impresión vista a través del acrílico (espejada y velada) */}
      <div style={{ ...face, transform: `translateZ(${-THICKNESS / 2 - 0.5}px) rotateY(180deg)`, background: "linear-gradient(135deg, #f4f8f8, #e3ecec)" }}>
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", scale: "-1 1", opacity: 0.22, filter: "blur(2px) saturate(0.7)" }} />
        <div style={{ position: "absolute", inset: 0, background: specular, mixBlendMode: "screen" }} />
        <div style={{ position: "absolute", inset: 0, background: `rgba(10,20,40,${shade})` }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: RADIUS, boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.8)" }} />
      </div>
    </div>
  );
};

// Sombra de contacto en el "suelo": se encoge y difumina cuanto más alta está la tarjeta.
export const CardShadow: React.FC<{ lift: number; y?: number; width?: number }> = ({ lift, y = 360, width = CARD_SIZE }) => (
  <div
    style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      width: width * (1 - lift * 0.35),
      height: 60,
      marginLeft: (-width * (1 - lift * 0.35)) / 2,
      marginTop: y,
      borderRadius: "50%",
      background: "rgba(0,0,0,0.75)",
      filter: `blur(${18 + lift * 30}px)`,
      opacity: 0.85 - lift * 0.45,
    }}
  />
);

// Reflejo en el suelo pulido: replica el contenido espejado bajo el eje `mirrorY` y lo funde.
export const FloorReflection: React.FC<{ mirrorY: number; depth?: number; opacity?: number; children: React.ReactNode }> = ({
  mirrorY,
  depth = 340,
  opacity = 0.32,
  children,
}) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      transformOrigin: "0 0",
      transform: `translateY(${2 * mirrorY}px) scaleY(-1)`,
      opacity,
      filter: "blur(1.5px)",
      maskImage: `linear-gradient(to bottom, transparent ${mirrorY - depth}px, rgba(0,0,0,1) ${mirrorY}px)`,
      WebkitMaskImage: `linear-gradient(to bottom, transparent ${mirrorY - depth}px, rgba(0,0,0,1) ${mirrorY}px)`,
      pointerEvents: "none",
    }}
  >
    {children}
  </div>
);
