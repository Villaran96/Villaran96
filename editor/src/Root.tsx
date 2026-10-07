import { Composition, Folder } from "remotion";
import "./fonts";
import { NfcPromo } from "./NfcPromo";
import { CtaScene } from "./scenes/CtaScene";
import { FilmScene } from "./scenes/FilmScene";
import { FeaturesScene } from "./scenes/FeaturesScene";
import { HookScene } from "./scenes/HookScene";
import { HowItWorksScene } from "./scenes/HowItWorksScene";
import { PhotoScene } from "./scenes/PhotoScene";
import { QuestionScene } from "./scenes/QuestionScene";
import { ResultsScene } from "./scenes/ResultsScene";
import { TOTAL_FRAMES } from "./theme";
import { Card3D } from "./three/Card3D";
import { ARCADE_TOTAL, ArcadePromo } from "./arcade/ArcadePromo";
import { EDITORIAL_TOTAL, EditorialPromo } from "./editorial/Editorial";
import { ISO_TOTAL, IsoPromo } from "./iso/IsoPromo";
import { MotionPromo } from "./motion/MotionPromo";
import { MgBenefits } from "./motion/scenes/MgBenefits";
import { MgCta } from "./motion/scenes/MgCta";
import { MgHook } from "./motion/scenes/MgHook";
import { MgHow } from "./motion/scenes/MgHow";
import { MgProblem } from "./motion/scenes/MgProblem";
import { MgReveal } from "./motion/scenes/MgReveal";
import { MG_TOTAL } from "./motion/theme";
import { WebCounter, WebEdge, WebStack } from "./web/WebStills";

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
        <Composition id="Film" component={FilmScene} durationInFrames={495} fps={30} width={1080} height={1920} defaultProps={{ title: "Tarjeta NFC", titleAccent: "de reseñas", subtitle: "Un toque. Una reseña.", title1: "Mensaje claro", sub1: "Invita a valorar con 5 estrellas", title2: "Directo a Google", sub2: "Abre tu perfil para dejar la reseña", title3: "Chip NFC integrado", sub3: "Basta con acercar el móvil", title4: "Acabado acrílico", sub4: "Elegante en cualquier mostrador", heroLine: "Hecha para destacar.", heroSub: "En tu mostrador." }} />
        <Composition id="Photo" component={PhotoScene} durationInFrames={120} fps={30} width={1080} height={1920} defaultProps={{ photo: "tarjetas/foto-real-hd.jpg", tag: "FOTO REAL", title: "Así de real.", sub: "Producto real, sin renders" }} />
        <Composition id="HowItWorks" component={HowItWorksScene} durationInFrames={270} fps={30} width={1080} height={1920} defaultProps={{ step1: "Acerca el móvil", step2: "Valora en 5 estrellas", step3: "Publicada al instante", businessName: "TU NEGOCIO", reviewText: "¡Servicio de 10! Volveremos seguro." }} />
        <Composition id="Results" component={ResultsScene} durationInFrames={165} fps={30} width={1080} height={1920} defaultProps={{ headline: "Más reseñas.", headlineAccent: "Más clientes.", reviewsFrom: 27, reviewsTo: 214, ratingFrom: 3.8, ratingTo: 4.9, footnote: "*Simulación con datos de ejemplo" }} />
        <Composition id="Features" component={FeaturesScene} durationInFrames={180} fps={30} width={1080} height={1920} defaultProps={{ title1: "Sin apps", accent1: "que descargar", title2: "Sin batería", accent2: "ni cargas", title3: "iPhone y Android", accent3: "compatibles", title4: "Con tu logo", accent4: "y tus colores" }} />
        <Composition id="Cta" component={CtaScene} durationInFrames={210} fps={30} width={1080} height={1920} defaultProps={{ headline: "Más reseñas,", headlineAccent: "en un solo toque.", cta: "Pide la tuya →", small: "Link en la bio", logo: "tarjetas/logo-cierzo.png" }} />
      </Folder>
      <Composition
        id="MotionPromo"
        component={MotionPromo}
        durationInFrames={MG_TOTAL}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ businessName: "Tu negocio", withMusic: true }}
      />
      <Composition id="ArcadePromo" component={ArcadePromo} durationInFrames={ARCADE_TOTAL} fps={30} width={1080} height={1920} defaultProps={{ withMusic: true }} />
      <Composition id="EditorialPromo" component={EditorialPromo} durationInFrames={EDITORIAL_TOTAL} fps={30} width={1920} height={1080} defaultProps={{ withMusic: true }} />
      <Composition id="IsoPromo" component={IsoPromo} durationInFrames={ISO_TOTAL} fps={30} width={1080} height={1080} defaultProps={{ withMusic: true }} />
      <Folder name="Motion">
        <Composition id="MgHook" component={MgHook} durationInFrames={120} fps={30} width={1080} height={1920} defaultProps={{ line1: "Tu negocio", line2: "merece", accent: "5 estrellas" }} />
        <Composition id="MgProblem" component={MgProblem} durationInFrames={120} fps={30} width={1080} height={1920} defaultProps={{ line1: "Pero las reseñas", line2: "no llegan", accent: "solas." }} />
        <Composition id="MgReveal" component={MgReveal} durationInFrames={180} fps={30} width={1080} height={1920} defaultProps={{ title: "Tarjeta NFC", accent: "de reseñas", backLabel: "Chip NFC" }} />
        <Composition id="MgHow" component={MgHow} durationInFrames={240} fps={30} width={1080} height={1920} defaultProps={{ title: "Así de fácil.", step1: "Acerca", step2: "Valora", step3: "Publica", businessName: "Tu negocio", caption: "Publicada en segundos." }} />
        <Composition id="MgBenefits" component={MgBenefits} durationInFrames={180} fps={30} width={1080} height={1920} defaultProps={{ title1: "Sin app", sub1: "Nada que descargar.", title2: "Sin batería", sub2: "No se carga ni se enchufa.", title3: "iPhone y Android", sub3: "Móviles actuales con NFC.", title4: "Con tu logo", sub4: "Y con tus colores.", heading: "Todo de serie." }} />
        <Composition id="MgCta" component={MgCta} durationInFrames={180} fps={30} width={1080} height={1920} defaultProps={{ line1: "Un toque.", line2: "Una reseña.", brand: "Cierzo NFC", button: "Pide la tuya" }} />
      </Folder>
      <Folder name="Web">
        <Composition id="WebEdge" component={WebEdge} durationInFrames={1} fps={30} width={1600} height={1200} />
        <Composition id="WebCounter" component={WebCounter} durationInFrames={1} fps={30} width={1800} height={1000} />
        <Composition id="WebStack" component={WebStack} durationInFrames={1} fps={30} width={1200} height={900} defaultProps={{ count: 3 }} />
      </Folder>
      <Folder name="ThreeJS">
        <Composition id="Card3D" component={Card3D} durationInFrames={120} fps={30} width={1080} height={1920} defaultProps={{ image: "tarjetas/diseno.jpg" }} />
      </Folder>
    </>
  );
};
