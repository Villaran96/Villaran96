import { Audio } from "@remotion/media";
import type React from "react";
import { AbsoluteFill, Series, staticFile, useVideoConfig } from "remotion";
import { CrtOverlay, PixelScene } from "./PixelScene";
import { drawClear, drawContinue, drawLevel1, drawLevel2, drawPowerup, drawTitle } from "./scenes";
import timeline from "./timeline.json";

const dur = (id: string) => timeline.scenes.find((s) => s.id === id)!.duration;
export const ARCADE_TOTAL = timeline.scenes.reduce((sum, s) => sum + s.duration, 0);

// Anuncio en clave de videojuego de 8 bits: todo se dibuja en un lienzo de 180×320 píxeles.
export const ArcadePromo: React.FC<{ withMusic: boolean }> = ({ withMusic }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0b14" }}>
      <Series>
        <Series.Sequence name="Pantalla de título" durationInFrames={dur("title")} premountFor={fps}>
          <PixelScene draw={drawTitle} />
        </Series.Sequence>
        <Series.Sequence name="Nivel 1" durationInFrames={dur("level1")} premountFor={fps}>
          <PixelScene draw={drawLevel1} />
        </Series.Sequence>
        <Series.Sequence name="Objeto conseguido" durationInFrames={dur("powerup")} premountFor={fps}>
          <PixelScene draw={drawPowerup} />
        </Series.Sequence>
        <Series.Sequence name="Nivel 2" durationInFrames={dur("level2")} premountFor={fps}>
          <PixelScene draw={drawLevel2} />
        </Series.Sequence>
        <Series.Sequence name="Nivel superado" durationInFrames={dur("clear")} premountFor={fps}>
          <PixelScene draw={drawClear} />
        </Series.Sequence>
        <Series.Sequence name="¿Continuar?" durationInFrames={dur("continue")} premountFor={fps}>
          <PixelScene draw={drawContinue} />
        </Series.Sequence>
      </Series>
      <CrtOverlay />
      {withMusic ? <Audio src={staticFile("audio/arcade-promo.wav")} premountFor={fps} /> : null}
    </AbsoluteFill>
  );
};
