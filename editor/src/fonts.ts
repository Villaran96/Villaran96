import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Fuentes servidas en local desde public/fonts: el navegador de render no pasa por el proxy.
export const SANS = "Inter Tight";
export const SERIF = "Instrument Serif";

loadFont({ family: SANS, url: staticFile("fonts/InterTight-var.woff2"), weight: "100 900" });
loadFont({ family: SERIF, url: staticFile("fonts/InstrumentSerif-400.woff2"), weight: "400" });
loadFont({ family: SERIF, url: staticFile("fonts/InstrumentSerif-400-italic.woff2"), weight: "400", style: "italic" });
