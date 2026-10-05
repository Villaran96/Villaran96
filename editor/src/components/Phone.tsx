import type React from "react";

export const PHONE_W = 430;
export const PHONE_H = 880;

type Props = {
  readonly children?: React.ReactNode;
  readonly style?: React.CSSProperties;
};

// Móvil genérico (no imita ningún modelo concreto): marco metálico, isla y pantalla.
export const Phone: React.FC<Props> = ({ children, style }) => (
  <div
    style={{
      position: "absolute",
      width: PHONE_W,
      height: PHONE_H,
      borderRadius: 72,
      padding: 14,
      background: "linear-gradient(145deg, #5b606b 0%, #1d2027 30%, #0c0d10 60%, #3c4049 100%)",
      boxShadow: "0 60px 120px rgba(0,0,0,0.55), inset 0 0 0 2px rgba(255,255,255,0.12)",
      ...style,
    }}
  >
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: 60,
        overflow: "hidden",
        background: "#0b0d12",
      }}
    >
      {children}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: "50%",
          width: 128,
          height: 36,
          marginLeft: -64,
          borderRadius: 18,
          background: "#000",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(120deg, rgba(255,255,255,0.10) 0%, transparent 35%)",
          pointerEvents: "none",
        }}
      />
    </div>
  </div>
);
