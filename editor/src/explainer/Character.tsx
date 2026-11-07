import React from "react";
import { Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

type Props = {
  /** Apertura de la boca 0–3 en este fotograma (de timing.mouth). */
  mouth: number;
  /** Fotogramas desde el inicio de la escena actual: da un pequeño salto al cambiar de paso. */
  sinceScene: number;
  /** Carpeta de public/ con 0.png…3.png (boca cerrada → muy abierta). Si falta, se dibuja el personaje de serie. */
  sprites?: string;
};

const SKIN = "#E8AE78";
const SKIN_DARK = "#C98655";
const HAIR = "#17171c";
const BLUE = "#2B5FF0";
const BLUE_DARK = "#1B3FB8";

const MOUTH_SHAPES = [
  { rx: 0, ry: 0 }, // cerrada: línea
  { rx: 15, ry: 7 },
  { rx: 20, ry: 15 },
  { rx: 23, ry: 22 },
];

/**
 * Personaje de serie en SVG con aspecto «arcilla»: respira, parpadea, señala hacia el contenido
 * y mueve la boca con la envolvente de la voz. Para usar el propio, pasa `meta.character`
 * (carpeta con 0.png…3.png de 700 × 640 px).
 */
export const Character: React.FC<Props> = ({ mouth, sinceScene, sprites }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const hop = spring({ frame: sinceScene, fps, config: { damping: 9, stiffness: 160, mass: 0.6 } });
  const hopY = -26 * Math.max(0, 1 - hop) * (sinceScene < 24 ? 1 : 0);
  const breathe = 1 + Math.sin(t * 2.1) * 0.006;
  const tilt = Math.sin(t * 1.3) * 1.2 + (mouth >= 2 ? -0.8 : 0);
  const point = Math.sin(t * 3.4) * 5;
  const blinkPhase = (t % 3.4) / 3.4;
  const blink = blinkPhase > 0.955 ? 0.12 : 1;

  const frameStyle: React.CSSProperties = {
    position: "absolute",
    right: -86,
    bottom: -78,
    width: 800,
    height: 732,
    translate: `0px ${hopY}px`,
    transformOrigin: "70% 100%",
    scale: String(breathe),
  };

  if (sprites) {
    return (
      <div style={frameStyle}>
        <Img src={staticFile(`${sprites}/${Math.min(3, Math.max(0, mouth))}.png`)} style={{ width: "100%", height: "100%" }} />
      </div>
    );
  }

  const m = MOUTH_SHAPES[Math.min(3, Math.max(0, mouth))];

  return (
    <div style={frameStyle}>
      <svg viewBox="0 0 700 640" width="100%" height="100%" style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id="skinG" cx="38%" cy="30%" r="80%">
            <stop offset="0" stopColor="#F6C99A" />
            <stop offset="0.55" stopColor={SKIN} />
            <stop offset="1" stopColor={SKIN_DARK} />
          </radialGradient>
          <linearGradient id="hoodG" x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor="#4C80FF" />
            <stop offset="0.5" stopColor={BLUE} />
            <stop offset="1" stopColor={BLUE_DARK} />
          </linearGradient>
          <linearGradient id="sleeveG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4A7DFF" />
            <stop offset="1" stopColor="#2450D8" />
          </linearGradient>
          <linearGradient id="hairG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#32323c" />
            <stop offset="1" stopColor={HAIR} />
          </linearGradient>
          <clipPath id="mouthClip">
            <ellipse cx="450" cy="300" rx={Math.max(1, m.rx)} ry={Math.max(1, m.ry)} />
          </clipPath>
        </defs>

        {/* Sombra de contacto */}
        <ellipse cx="470" cy="632" rx="250" ry="22" fill="rgba(60,40,20,0.12)" />

        {/* Torso (sube 22 u. para acortar el cuello) */}
        <g transform="translate(0 -22)">
          <path
            d="M 300 720 C 296 580 306 480 358 428 C 398 392 440 366 480 360 C 570 352 650 390 690 460 C 712 505 716 600 716 720 Z"
            fill="url(#hoodG)"
          />
          <path d="M 520 392 C 524 480 530 600 534 720" stroke="#EAF0FF" strokeWidth="9" fill="none" strokeLinecap="round" opacity="0.92" />
          <path d="M 400 368 C 425 396 482 400 516 368" stroke={BLUE_DARK} strokeWidth="15" fill="none" strokeLinecap="round" opacity="0.55" />
          {/* Bolsillo canguro: da volumen al torso */}
          <path d="M 560 560 C 600 548 668 560 700 600" stroke={BLUE_DARK} strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.35" />
        </g>

        {/* Cuello */}
        <path d="M 405 330 L 405 366 C 430 388 480 388 505 366 L 505 330 Z" fill={SKIN_DARK} />

        {/* Cabeza */}
        <g style={{ transformOrigin: "450px 330px", rotate: `${tilt}deg` }}>
          {/* Oreja */}
          <ellipse cx="560" cy="226" rx="20" ry="30" fill={SKIN_DARK} />
          <ellipse cx="561" cy="228" rx="9" ry="16" fill="#B9774A" />
          {/* Cráneo */}
          <path
            d="M 330 215 C 326 130 380 84 452 84 C 530 84 574 140 570 216 C 566 290 520 344 452 344 C 380 344 334 292 330 215 Z"
            fill="url(#skinG)"
          />
          {/* Pelo */}
          <path
            d="M 322 214 C 306 118 366 56 456 58 C 540 60 590 118 574 204 C 560 168 530 142 494 138 C 462 134 420 142 388 160 C 356 178 336 196 322 214 Z"
            fill="url(#hairG)"
          />
          <path d="M 470 64 C 520 50 578 78 580 130 C 562 112 540 104 512 106 Z" fill={HAIR} />
          <ellipse cx="408" cy="108" rx="34" ry="14" fill="rgba(255,255,255,0.12)" transform="rotate(-18 408 108)" />

          {/* Cejas */}
          <path d="M 366 188 Q 392 176 418 186" stroke={HAIR} strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M 480 184 Q 508 172 534 184" stroke={HAIR} strokeWidth="10" strokeLinecap="round" fill="none" />

          {/* Ojos */}
          <g style={{ transformOrigin: "0 0" }}>
            <ellipse cx="392" cy="222" rx="9" ry={11 * blink} fill="#1a1a1a" />
            <ellipse cx="508" cy="220" rx="9" ry={11 * blink} fill="#1a1a1a" />
            <circle cx="395" cy="218" r="3" fill="#fff" opacity={blink > 0.5 ? 0.9 : 0} />
            <circle cx="511" cy="216" r="3" fill="#fff" opacity={blink > 0.5 ? 0.9 : 0} />
          </g>

          {/* Gafas */}
          <rect x="350" y="192" width="84" height="64" rx="28" fill="rgba(160,100,60,0.14)" stroke="#16161a" strokeWidth="11" />
          <rect x="466" y="190" width="84" height="64" rx="28" fill="rgba(160,100,60,0.14)" stroke="#16161a" strokeWidth="11" />
          <path d="M 434 218 Q 450 208 466 216" stroke="#16161a" strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d="M 550 214 L 566 210" stroke="#16161a" strokeWidth="10" strokeLinecap="round" />

          {/* Nariz y mejillas */}
          <ellipse cx="452" cy="262" rx="13" ry="9" fill="#D79A66" />
          <ellipse cx="449" cy="258" rx="6" ry="3.5" fill="#F0BD90" />
          <circle cx="372" cy="290" r="22" fill="#F08A7A" opacity="0.18" />
          <circle cx="540" cy="288" r="22" fill="#F08A7A" opacity="0.18" />

          {/* Boca */}
          {mouth <= 0 ? (
            <path d="M 424 296 Q 450 308 478 294" stroke="#5a2418" strokeWidth="7" strokeLinecap="round" fill="none" />
          ) : (
            <g>
              <ellipse cx="450" cy="300" rx={m.rx} ry={m.ry} fill="#4f1a12" />
              {mouth >= 2 ? (
                <ellipse cx="450" cy={300 + m.ry * 0.55} rx={m.rx * 0.7} ry={m.ry * 0.5} fill="#E5707A" clipPath="url(#mouthClip)" />
              ) : null}
            </g>
          )}
        </g>

        {/* Brazo que señala hacia el contenido (a la izquierda): sale del hombro y asoma fuera del torso */}
        <g style={{ translate: `${point * -0.7}px ${point * -0.5}px` }}>
          <path d="M 418 436 L 338 566 L 214 500" stroke="#1B3FB8" strokeWidth="104" strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(0 8)" />
          <path d="M 418 436 L 338 566 L 214 500" stroke="url(#sleeveG)" strokeWidth="98" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M 410 420 L 330 548 L 226 490" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.2" />
          {/* Puño de la manga */}
          <path d="M 190 480 L 214 500" stroke="#173596" strokeWidth="108" strokeLinecap="round" opacity="0.0" />
          {/* Mano: puño con el índice extendido */}
          <ellipse cx="170" cy="470" rx="52" ry="44" fill="url(#skinG)" transform="rotate(-28 170 470)" />
          <ellipse cx="176" cy="496" rx="36" ry="20" fill={SKIN_DARK} opacity="0.45" transform="rotate(-28 176 496)" />
          <path d="M 150 444 L 92 384" stroke={SKIN} strokeWidth="30" strokeLinecap="round" />
          <path d="M 148 438 L 98 386" stroke="#F6C99A" strokeWidth="9" strokeLinecap="round" opacity="0.75" />
          <ellipse cx="206" cy="440" rx="26" ry="16" fill={SKIN} transform="rotate(-62 206 440)" />
        </g>
      </svg>
    </div>
  );
};
