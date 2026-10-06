import { Composition, Folder } from "remotion";
import "./fonts";
import { NfcPromo } from "./NfcPromo";
import { CtaScene } from "./scenes/CtaScene";
import { DetailsScene } from "./scenes/DetailsScene";
import { FeaturesScene } from "./scenes/FeaturesScene";
import { HookScene } from "./scenes/HookScene";
import { HowItWorksScene } from "./scenes/HowItWorksScene";
import { PhotoScene } from "./scenes/PhotoScene";
import { QuestionScene } from "./scenes/QuestionScene";
import { ResultsScene } from "./scenes/ResultsScene";
import { RevealScene } from "./scenes/RevealScene";
import { TOTAL_FRAMES } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="NfcPromo"
        component={NfcPromo}
        durationInFrames={TOTAL_FRAMES}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ businessName: "TU NEGOCIO", frontImage: "", withMusic: true }}
      />
      <Folder name="Escenas">
        <Composition id="Hook" component={HookScene} durationInFrames={105} fps={30} width={1080} height={1920} defaultProps={{ line1: "Tus clientes están encantados.", line2: "Pero nadie deja reseña." }} />
        <Composition id="Question" component={QuestionScene} durationInFrames={105} fps={30} width={1080} height={1920} defaultProps={{ line1: "¿Y si conseguirla", line2: "costara solo", highlight: "1 segundo?" }} />
        <Composition id="Reveal" component={RevealScene} durationInFrames={180} fps={30} width={1080} height={1920} defaultProps={{ title: "Tarjeta NFC", titleAccent: "de reseñas", subtitle: "Un toque. Una reseña." }} />
        <Composition id="Details" component={DetailsScene} durationInFrames={330} fps={30} width={1080} height={1920} defaultProps={{ title1: "Mensaje claro", sub1: "Invita a valorar con 5 estrellas", title2: "Directo a Google", sub2: "Abre tu perfil para dejar la reseña", title3: "Chip NFC integrado", sub3: "Basta con acercar el móvil", title4: "Acabado acrílico", sub4: "Elegante en cualquier mostrador" }} />
        <Composition id="Photo" component={PhotoScene} durationInFrames={120} fps={30} width={1080} height={1920} defaultProps={{ photo: "tarjetas/foto-real-hd.jpg", tag: "FOTO REAL", title: "Así de real.", sub: "Producto real, sin renders" }} />
        <Composition id="HowItWorks" component={HowItWorksScene} durationInFrames={270} fps={30} width={1080} height={1920} defaultProps={{ step1: "Acerca el móvil", step2: "Valora en 5 estrellas", step3: "Publicada al instante", businessName: "TU NEGOCIO", reviewText: "¡Servicio de 10! Volveremos seguro." }} />
        <Composition id="Results" component={ResultsScene} durationInFrames={165} fps={30} width={1080} height={1920} defaultProps={{ headline: "Más reseñas.", headlineAccent: "Más clientes.", reviewsFrom: 27, reviewsTo: 214, ratingFrom: 3.8, ratingTo: 4.9, footnote: "*Simulación con datos de ejemplo" }} />
        <Composition id="Features" component={FeaturesScene} durationInFrames={180} fps={30} width={1080} height={1920} defaultProps={{ title1: "Sin apps", accent1: "que descargar", title2: "Sin batería", accent2: "ni cargas", title3: "iPhone y Android", accent3: "compatibles", title4: "Con tu logo", accent4: "y tus colores" }} />
        <Composition id="Cta" component={CtaScene} durationInFrames={180} fps={30} width={1080} height={1920} defaultProps={{ headline: "Más reseñas,", headlineAccent: "en un solo toque.", cta: "Pide la tuya →", small: "Link en la bio", logo: "tarjetas/logo-cierzo.png" }} />
      </Folder>
    </>
  );
};
