import type React from "react";
import { Img, random, staticFile } from "remotion";
import { SANS, SERIF } from "../fonts";
import { BRAND_DOTS, COLORS } from "../theme";

export const CARD_W = 760;
export const CARD_H = 479; // proporción ISO 7810 (85,6 × 54 mm)
const RADIUS = 36;
const THICKNESS = 10;

type Props = {
  readonly rotateX?: number;
  readonly rotateY?: number;
  readonly rotateZ?: number;
  readonly scale?: number;
  // 0→1 recorre el reflejo especular de izquierda a derecha
  readonly shine?: number;
  readonly businessName?: string;
  // Rutas en public/ con fotos reales de la tarjeta; sustituyen al diseño generado.
  readonly frontImage?: string;
  readonly backImage?: string;
  readonly style?: React.CSSProperties;
};

const Stars: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ display: "flex", gap: size * 0.18 }}>
    {[0, 1, 2, 3, 4].map((i) => (
      <svg key={i} width={size} height={size} viewBox="0 0 24 24">
        <path
          d="M12 1.8l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.9l-6.4 3.5 1.4-7.1-5.3-5 7.2-.9z"
          fill={COLORS.gold}
        />
      </svg>
    ))}
  </div>
);

const NfcGlyph: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="white" strokeWidth={3.2} strokeLinecap="round">
    <rect x="8" y="14" width="22" height="38" rx="4" />
    <circle cx="19" cy="46" r="1.6" fill="white" stroke="none" />
    <path d="M38 24c4 4 4 12 0 16" opacity={0.95} />
    <path d="M44 18c7.5 7.5 7.5 20.5 0 28" opacity={0.75} />
    <path d="M50 12c11 11 11 29 0 40" opacity={0.5} />
  </svg>
);

const faceBase: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  borderRadius: RADIUS,
  overflow: "hidden",
  backfaceVisibility: "hidden",
};

const Shine: React.FC<{ shine: number; tilt: number }> = ({ shine, tilt }) => {
  // El reflejo también se desplaza con la inclinación de la tarjeta, como un material real.
  const pos = -60 + (shine + tilt * 0.004) * 220;
  return (
    <>
      <div
        style={{
          ...faceBase,
          background: `linear-gradient(105deg, transparent ${pos - 18}%, rgba(255,255,255,0.08) ${pos - 8}%, rgba(255,255,255,0.42) ${pos}%, rgba(255,255,255,0.08) ${pos + 8}%, transparent ${pos + 18}%)`,
          mixBlendMode: "screen",
        }}
      />
      <div
        style={{
          ...faceBase,
          background: "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 38%)",
        }}
      />
    </>
  );
};

const Front: React.FC<{ businessName: string; frontImage?: string; shine: number; tilt: number }> = ({
  businessName,
  frontImage,
  shine,
  tilt,
}) => (
  <div
    style={{
      ...faceBase,
      background: "linear-gradient(135deg, #20242d 0%, #0d0f14 55%, #181b22 100%)",
      boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.10)",
    }}
  >
    {frontImage ? (
      <Img src={staticFile(frontImage)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    ) : (
      <>
        <Img
          src={staticFile("textures/grain.png")}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.06, mixBlendMode: "overlay" }}
        />
        <div
          style={{
            position: "absolute",
            top: 44,
            left: 50,
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: 6,
            color: COLORS.mist,
          }}
        >
          {businessName}
        </div>
        <div style={{ position: "absolute", left: 50, top: 118 }}>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 56, color: "white", lineHeight: 1 }}>
            ¿Te ha gustado?
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 50, color: "white", marginTop: 10, letterSpacing: -1 }}>
            Déjanos tu reseña
          </div>
          <div style={{ marginTop: 22 }}>
            <Stars size={40} />
          </div>
        </div>
        <div style={{ position: "absolute", left: 50, bottom: 44, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {BRAND_DOTS.map((c) => (
              <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
            ))}
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 22, color: "rgba(255,255,255,0.8)" }}>
            Reseñas en Google
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            right: 46,
            top: "50%",
            translate: "0 -50%",
            width: 168,
            height: 168,
            borderRadius: 84,
            border: "2px solid rgba(255,255,255,0.18)",
            background: "radial-gradient(circle, rgba(66,133,244,0.25), rgba(66,133,244,0) 70%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <NfcGlyph size={74} />
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 15, color: COLORS.mist, letterSpacing: 1 }}>
            ACERCA TU MÓVIL
          </div>
        </div>
      </>
    )}
    <Shine shine={shine} tilt={tilt} />
  </div>
);

const QrPattern: React.FC = () => {
  const cells = 21;
  const size = 9;
  const finder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= cells - 7 && y < 7) || (x < 7 && y >= cells - 7);
  return (
    <svg width={cells * size} height={cells * size}>
      {new Array(cells * cells).fill(0).map((_, i) => {
        const x = i % cells;
        const y = Math.floor(i / cells);
        if (finder(x, y)) return null;
        return random(`qr-${i}`) > 0.52 ? (
          <rect key={i} x={x * size} y={y * size} width={size} height={size} fill="white" />
        ) : null;
      })}
      {[
        [0, 0],
        [cells - 7, 0],
        [0, cells - 7],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x * size} y={y * size} width={7 * size} height={7 * size} fill="white" />
          <rect x={(x + 1) * size} y={(y + 1) * size} width={5 * size} height={5 * size} fill="#0d0f14" />
          <rect x={(x + 2) * size} y={(y + 2) * size} width={3 * size} height={3 * size} fill="white" />
        </g>
      ))}
    </svg>
  );
};

const Back: React.FC<{ businessName: string; backImage?: string; shine: number; tilt: number }> = ({
  businessName,
  backImage,
  shine,
  tilt,
}) => (
  <div
    style={{
      ...faceBase,
      rotate: "y 180deg",
      background: "linear-gradient(135deg, #181b22 0%, #0d0f14 60%, #20242d 100%)",
      boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.10)",
    }}
  >
    {backImage ? (
      <Img src={staticFile(backImage)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    ) : (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 60px" }}>
        <div>
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 54, color: "white", letterSpacing: 2 }}>{businessName}</div>
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 34, color: COLORS.mist, marginTop: 8 }}>
            Escanea o acerca tu móvil
          </div>
        </div>
        <div style={{ padding: 14, background: "#0d0f14", borderRadius: 14, border: "2px solid rgba(255,255,255,0.15)" }}>
          <QrPattern />
        </div>
      </div>
    )}
    <Shine shine={1 - shine} tilt={-tilt} />
  </div>
);

export const NfcCard: React.FC<Props> = ({
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  scale = 1,
  shine = 0,
  businessName = "TU NEGOCIO",
  frontImage,
  backImage,
  style,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: CARD_W,
        height: CARD_H,
        marginLeft: -CARD_W / 2,
        marginTop: -CARD_H / 2,
        transformStyle: "preserve-3d",
        transform: `scale(${scale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
        ...style,
      }}
    >
      {/* Canto: capas apiladas en Z para que la tarjeta tenga grosor al girar */}
      {new Array(THICKNESS).fill(0).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: RADIUS,
            background: i === 0 || i === THICKNESS - 1 ? "#2a2f3a" : "#0a0c10",
            transform: `translateZ(${-THICKNESS / 2 + i}px)`,
          }}
        />
      ))}
      <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `translateZ(${THICKNESS / 2 + 0.5}px)` }}>
        <Front businessName={businessName} frontImage={frontImage} shine={shine} tilt={rotateY + rotateX} />
      </div>
      <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `translateZ(${-THICKNESS / 2 - 0.5}px)` }}>
        <Back businessName={businessName} backImage={backImage} shine={shine} tilt={rotateY + rotateX} />
      </div>
    </div>
  );
};

// Sombra de contacto en el "suelo": se encoge y difumina cuanto más alta está la tarjeta.
export const CardShadow: React.FC<{ lift: number; y?: number; width?: number }> = ({ lift, y = 360, width = CARD_W }) => (
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
