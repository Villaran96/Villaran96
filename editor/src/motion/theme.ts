import timelineJson from "./timeline.json";

// Paleta sacada de la tarjeta: las cuatro ondas de color, el negro del texto y el degradado del logo.
export const MG = {
  red: "#EA4335",
  yellow: "#FBBC05",
  green: "#34A853",
  blue: "#4285F4",
  ink: "#15171C",
  paper: "#FFFFFF",
  mist: "#F2F3F5",
  gray: "#C7CBD2",
  slate: "#3A3F49",
  tealA: "#1689C6",
  tealB: "#1F9E5F",
};

export const BANDS = [MG.red, MG.yellow, MG.green, MG.blue];

export const mgTimeline = timelineJson;
export const mgCues = timelineJson.cues;

// Sin solapes: las cortinillas son overlays sobre el corte, así que las escenas van una detrás de otra.
export const mgStarts = (() => {
  const starts: Record<string, number> = {};
  let t = 0;
  timelineJson.scenes.forEach((s) => {
    starts[s.id] = t;
    t += s.duration;
  });
  return starts;
})();

export const MG_TOTAL = timelineJson.scenes.reduce((sum, s) => sum + s.duration, 0);

export const mgDuration = (id: string) => timelineJson.scenes.find((s) => s.id === id)!.duration;

export const CARD_IMAGE = "motion/tarjeta.png";
export const LOGO_MARK = "motion/logo-mark.png";
