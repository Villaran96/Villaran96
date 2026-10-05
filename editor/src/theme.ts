import timelineJson from "./timeline.json";

export const timeline = timelineJson;
export const cues = timelineJson.cues;

export const COLORS = {
  ink: "#07090d",
  night: "#0b1020",
  panel: "#131826",
  white: "#ffffff",
  mist: "rgba(255,255,255,0.62)",
  gold: "#FFC531",
  blue: "#4285F4",
  red: "#EA4335",
  yellow: "#FBBC05",
  green: "#34A853",
};

export const BRAND_DOTS = [COLORS.blue, COLORS.red, COLORS.yellow, COLORS.green];

// Inicio absoluto de cada escena (las transiciones solapan, los overlays no).
export const sceneStarts = (() => {
  const starts: Record<string, number> = {};
  let start = 0;
  timelineJson.scenes.forEach((scene, i) => {
    starts[scene.id] = start;
    const join = timelineJson.joins[i];
    const end = start + scene.duration;
    start = join && join.type === "transition" ? end - join.duration : end;
  });
  return starts;
})();

export const TOTAL_FRAMES = (() => {
  const last = timelineJson.scenes[timelineJson.scenes.length - 1];
  return sceneStarts[last.id] + last.duration;
})();

export const sceneDuration = (id: string) =>
  timelineJson.scenes.find((s) => s.id === id)!.duration;
