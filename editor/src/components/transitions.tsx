import type {
  TransitionPresentation,
  TransitionPresentationComponentProps,
} from "@remotion/transitions";
import React from "react";
import { AbsoluteFill, interpolate } from "remotion";

// Transiciones propias en CSS puro: las de shader necesitan HTML-in-canvas,
// que el Chromium de este entorno no soporta.

type WhipProps = { direction: "left" | "right" };

// Barrido rápido de cámara con desenfoque direccional (filtro SVG en un solo eje).
const WhipPanComponent: React.FC<TransitionPresentationComponentProps<WhipProps>> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const id = React.useId().replace(/:/g, "");
  const dir = passedProps.direction === "left" ? -1 : 1;
  const p = presentationProgress;
  const x =
    presentationDirection === "exiting"
      ? interpolate(p, [0, 1], [0, -110 * dir])
      : interpolate(p, [0, 1], [110 * dir, 0]);
  // Velocidad máxima a mitad de transición → máximo desenfoque.
  const blur = Math.sin(p * Math.PI) * 60;
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={`whip-${id}`} x="-20%" y="0" width="140%" height="100%">
          <feGaussianBlur stdDeviation={`${blur} 0`} />
        </filter>
      </svg>
      <AbsoluteFill style={{ translate: `${x}% 0`, filter: blur > 0.5 ? `url(#whip-${id})` : undefined }}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const whipPan = (props: WhipProps = { direction: "left" }): TransitionPresentation<WhipProps> => ({
  component: WhipPanComponent,
  props,
});

type ZoomProps = { flash: boolean };

// "Punch" de zoom: la escena saliente acelera hacia cámara y la entrante aterriza desde atrás, con destello.
const ZoomPunchComponent: React.FC<TransitionPresentationComponentProps<ZoomProps>> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const p = presentationProgress;
  const exiting = presentationDirection === "exiting";
  const scale = exiting ? interpolate(p, [0, 1], [1, 2.6]) : interpolate(p, [0, 1], [0.55, 1]);
  const blur = exiting ? p * 24 : (1 - p) * 24;
  const opacity = exiting ? interpolate(p, [0.4, 0.75], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : interpolate(p, [0.3, 0.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const flash = passedProps.flash && !exiting ? Math.max(0, 1 - Math.abs(p - 0.5) * 5) : 0;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ scale: String(scale), filter: `blur(${blur}px)`, opacity }}>{children}</AbsoluteFill>
      {flash > 0 ? <AbsoluteFill style={{ background: "white", opacity: flash * 0.45 }} /> : null}
    </AbsoluteFill>
  );
};

export const zoomPunch = (props: ZoomProps = { flash: true }): TransitionPresentation<ZoomProps> => ({
  component: ZoomPunchComponent,
  props,
});

type CropProps = { radius: number };

// "Recorte": la escena saliente se recorta en una tarjeta redondeada y se aleja,
// descubriendo debajo la entrante, que asienta su escala.
const CropOutComponent: React.FC<TransitionPresentationComponentProps<CropProps>> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const p = presentationProgress;
  if (presentationDirection === "exiting") {
    const crop = interpolate(p, [0, 0.55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const away = interpolate(p, [0.35, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return (
      <AbsoluteFill style={{ zIndex: 1 }}>
        <AbsoluteFill
          style={{
            clipPath: `inset(${crop * 12}% ${crop * 9}% round ${crop * passedProps.radius}px)`,
            scale: String(1 - crop * 0.08 - away * 0.25),
            translate: `0 ${away * -70}%`,
            rotate: `${away * -6}deg`,
            opacity: interpolate(p, [0.8, 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            filter: `drop-shadow(0 40px 60px rgba(0,0,0,${0.6 * crop}))`,
          }}
        >
          {children}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ scale: String(interpolate(p, [0, 1], [1.12, 1])), filter: `brightness(${interpolate(p, [0, 1], [0.55, 1])})` }}>
      {children}
    </AbsoluteFill>
  );
};

export const cropOut = (props: CropProps = { radius: 60 }): TransitionPresentation<CropProps> => ({
  component: CropOutComponent,
  props,
});
