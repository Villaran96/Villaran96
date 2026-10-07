import { Audio } from "@remotion/media";
import { TransitionSeries } from "@remotion/transitions";
import type React from "react";
import { AbsoluteFill, staticFile, useVideoConfig } from "remotion";
import { IrisWipe, WaveWipe } from "./kit";
import { MgBenefits } from "./scenes/MgBenefits";
import { MgCta } from "./scenes/MgCta";
import { MgHook } from "./scenes/MgHook";
import { MgHow } from "./scenes/MgHow";
import { MgProblem } from "./scenes/MgProblem";
import { MgReveal } from "./scenes/MgReveal";
import { MG, mgDuration, mgTimeline } from "./theme";

type Props = {
  readonly businessName: string;
  readonly withMusic: boolean;
};

// Anuncio en motion graphics plano: colores de la tarjeta, formas líquidas, texto cinético e iconos que se dibujan.
export const MotionPromo: React.FC<Props> = ({ businessName, withMusic }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: MG.paper }}>
      <TransitionSeries>
        <TransitionSeries.Sequence name="1 · 5 estrellas" durationInFrames={mgDuration("hook")} premountFor={fps}>
          <MgHook line1="Tu negocio" line2="merece" accent="5 estrellas" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Overlay durationInFrames={mgTimeline.overlays.iris} premountFor={fps}>
          <IrisWipe color={MG.ink} />
        </TransitionSeries.Overlay>
        <TransitionSeries.Sequence name="2 · El problema" durationInFrames={mgDuration("problem")} premountFor={fps}>
          <MgProblem line1="Pero las reseñas" line2="no llegan" accent="solas." />
        </TransitionSeries.Sequence>
        <TransitionSeries.Overlay durationInFrames={mgTimeline.overlays.wave} premountFor={fps}>
          <WaveWipe />
        </TransitionSeries.Overlay>
        <TransitionSeries.Sequence name="3 · La tarjeta" durationInFrames={mgDuration("reveal")} premountFor={fps}>
          <MgReveal title="Tarjeta NFC" accent="de reseñas" backLabel="Chip NFC" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="4 · Cómo funciona" durationInFrames={mgDuration("how")} premountFor={fps}>
          <MgHow title="Así de fácil." step1="Acerca" step2="Valora" step3="Publica" businessName={businessName} caption="Publicada en segundos." />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="5 · Ventajas" durationInFrames={mgDuration("benefits")} premountFor={fps}>
          <MgBenefits
            title1="Sin app"
            sub1="Nada que descargar."
            title2="Sin batería"
            sub2="No se carga ni se enchufa."
            title3="iPhone y Android"
            sub3="Móviles actuales con NFC."
            title4="Con tu logo"
            sub4="Y con tus colores."
            heading="Todo de serie."
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="6 · Cierre" durationInFrames={mgDuration("cta")} premountFor={fps}>
          <MgCta line1="Un toque." line2="Una reseña." brand="Cierzo NFC" button="Pide la tuya" />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      {withMusic ? <Audio src={staticFile("audio/motion-promo.wav")} premountFor={fps} /> : null}
    </AbsoluteFill>
  );
};
