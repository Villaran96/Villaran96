import { Audio } from "@remotion/media";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { iris } from "@remotion/transitions/iris";
import { pushCut } from "@remotion/transitions/push-cut";
import { slide } from "@remotion/transitions/slide";
import type React from "react";
import { AbsoluteFill, staticFile, useVideoConfig } from "remotion";
import { FilmLook, LightLeakOverlay } from "./components/Fx";
import { whipPan, zoomPunch } from "./components/transitions";
import { CtaScene } from "./scenes/CtaScene";
import { DetailsScene } from "./scenes/DetailsScene";
import { FeaturesScene } from "./scenes/FeaturesScene";
import { HookScene } from "./scenes/HookScene";
import { HowItWorksScene } from "./scenes/HowItWorksScene";
import { PhotoScene } from "./scenes/PhotoScene";
import { QuestionScene } from "./scenes/QuestionScene";
import { ResultsScene } from "./scenes/ResultsScene";
import { RevealScene } from "./scenes/RevealScene";
import { sceneDuration, timeline } from "./theme";

type Props = {
  readonly businessName: string;
  // Diseño de la tarjeta en public/ (por defecto tarjetas/diseno.jpg)
  readonly frontImage?: string;
  readonly withMusic: boolean;
};

const join = (i: number) => timeline.joins[i].duration;

export const NfcPromo: React.FC<Props> = ({ businessName, frontImage, withMusic }) => {
  const { fps, width, height } = useVideoConfig();
  const image = frontImage || undefined;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence name="1 · Gancho" durationInFrames={sceneDuration("hook")} premountFor={fps}>
          <HookScene line1="Tus clientes están encantados." line2="Pero nadie deja reseña." />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={pushCut({ flashColor: "#ffffff", flashOpacity: 0.3 })} timing={linearTiming({ durationInFrames: join(0) })} />
        <TransitionSeries.Sequence name="2 · Pregunta" durationInFrames={sceneDuration("question")} premountFor={fps}>
          <QuestionScene line1="¿Y si conseguirla" line2="costara solo" highlight="1 segundo?" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Overlay durationInFrames={join(1)} premountFor={fps}>
          <LightLeakOverlay seed={4} hueShift={200} />
        </TransitionSeries.Overlay>
        <TransitionSeries.Sequence name="3 · Revelación" durationInFrames={sceneDuration("reveal")} premountFor={fps}>
          <RevealScene title="Tarjeta NFC" titleAccent="de reseñas" subtitle="Un toque. Una reseña." frontImage={image} />
        </TransitionSeries.Sequence>
        {/* Fundido con encuadre idéntico: la cámara continúa sin corte visible */}
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: join(2) })} />
        <TransitionSeries.Sequence name="4 · Detalles" durationInFrames={sceneDuration("details")} premountFor={fps}>
          <DetailsScene
            title1="Mensaje claro"
            sub1="Invita a valorar con 5 estrellas"
            title2="Directo a Google"
            sub2="Abre tu perfil para dejar la reseña"
            title3="Chip NFC integrado"
            sub3="Basta con acercar el móvil"
            title4="Acabado acrílico"
            sub4="Elegante en cualquier mostrador"
            frontImage={image}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={whipPan({ direction: "left" })} timing={linearTiming({ durationInFrames: join(3) })} />
        <TransitionSeries.Sequence name="5 · Foto real" durationInFrames={sceneDuration("photo")} premountFor={fps}>
          <PhotoScene photo="tarjetas/foto-real-hd.jpg" tag="FOTO REAL" title="Así de real." sub="Producto real, sin renders" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: join(4) })} />
        <TransitionSeries.Sequence name="6 · Cómo funciona" durationInFrames={sceneDuration("how")} premountFor={fps}>
          <HowItWorksScene
            step1="Acerca el móvil"
            step2="Valora en 5 estrellas"
            step3="Publicada al instante"
            businessName={businessName}
            reviewText="¡Servicio de 10! Volveremos seguro."
            frontImage={image}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={iris({ width, height })} timing={linearTiming({ durationInFrames: join(5) })} />
        <TransitionSeries.Sequence name="7 · Resultados" durationInFrames={sceneDuration("results")} premountFor={fps}>
          <ResultsScene
            headline="Más reseñas."
            headlineAccent="Más clientes."
            reviewsFrom={27}
            reviewsTo={214}
            ratingFrom={3.8}
            ratingTo={4.9}
            footnote="*Simulación con datos de ejemplo"
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={zoomPunch({ flash: true })} timing={linearTiming({ durationInFrames: join(6) })} />
        <TransitionSeries.Sequence name="8 · Ventajas" durationInFrames={sceneDuration("features")} premountFor={fps}>
          <FeaturesScene
            title1="Sin apps"
            accent1="que descargar"
            title2="Sin batería"
            accent2="ni cargas"
            title3="iPhone y Android"
            accent3="compatibles"
            title4="Con tu logo"
            accent4="y tus colores"
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Overlay durationInFrames={join(7)} premountFor={fps}>
          <LightLeakOverlay seed={9} hueShift={20} />
        </TransitionSeries.Overlay>
        <TransitionSeries.Sequence name="9 · Llamada a la acción" durationInFrames={sceneDuration("cta")} premountFor={fps}>
          <CtaScene
            headline="Más reseñas,"
            headlineAccent="en un solo toque."
            cta="Pide la tuya →"
            small="Link en la bio"
            logo="tarjetas/logo-cierzo.png"
            frontImage={image}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <FilmLook />
      {withMusic ? <Audio src={staticFile("audio/nfc-promo.wav")} premountFor={fps} /> : null}
    </AbsoluteFill>
  );
};
