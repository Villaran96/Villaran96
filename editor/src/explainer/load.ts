import type { CalculateMetadataFunction } from "remotion";
import { staticFile } from "remotion";

/** Lee guion y tiempos de public/<kind>/<slug>/ y ajusta la duración a la voz. */
export const makeMetadata =
  <P extends { slug: string }>(kind: string): CalculateMetadataFunction<P> =>
  async ({ props }) => {
    const base = `${kind}/${props.slug}`;
    const get = async (file: string) => {
      const res = await fetch(staticFile(`${base}/${file}`));
      if (!res.ok) {
        throw new Error(`Falta public/${base}/${file}. Para generarlo: .venv/bin/python scripts/explainer/build-voice.py ${props.slug} --kind ${kind}`);
      }
      return res.json();
    };
    const [script, timing] = await Promise.all([get("script.json"), get("timing.json")]);
    return { durationInFrames: Math.ceil(timing.duration * timing.fps), fps: timing.fps, props: { ...props, script, timing } };
  };
