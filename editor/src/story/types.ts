// Contrato de datos de los vídeos «Story» (historias animadas para canales de nicho).
//
//   public/story/<slug>/script.json   → guion: narración + qué escena dibuja cada tramo
//   public/story/<slug>/timing.json   → lo genera scripts/explainer/build-voice.py --kind story
//   public/story/<slug>/voice.wav     → ídem
//
// La narración admite *acento* (la palabra sale en el color de acento en los subtítulos).

import type { Meta, SceneTiming, Timing } from "../explainer/types";

export type Transition = "fade" | "slide" | "zoom" | "cut";

export type SfxCue = { name: string; at?: number; atWord?: number; volume?: number };

export type StoryScene = {
  id: string;
  narration: string;
  /** Nombre de la escena registrada en src/story/scenes/index.ts. */
  scene: string;
  /** Parámetros que recibe el componente de la escena (profundidad inicial/final, textos…). */
  props?: Record<string, unknown>;
  /** Cómo entra esta escena sobre la anterior (por defecto, fundido). */
  transition?: Transition;
  /** Efectos de sonido puntuales: segundos desde el inicio de la escena o índice de palabra. */
  sfx?: SfxCue[];
  /** Silencio tras la locución (s). */
  pad?: number;
};

export type StoryMeta = Meta & {
  /** Nombre del canal: sale en la etiqueta superior. */
  channel?: string;
  episode?: number;
  /** Color de acento de los subtítulos y los destacados. */
  accent?: string;
};

export type StoryScript = { meta: StoryMeta; scenes: StoryScene[] };

export type StoryProps = { slug: string; script?: StoryScript; timing?: Timing };

/** Lo que recibe cada componente de escena. */
export type SceneCtx = {
  scene: StoryScene;
  st: SceneTiming;
  /** Segundos desde el inicio de la escena (negativo durante el solape con la anterior). */
  t: number;
  /** Segundos desde el inicio del vídeo. */
  g: number;
  /** Duración de la escena (s). */
  dur: number;
  /** Segundos (desde el inicio de la escena) en que se dice la palabra n de la narración. */
  cue: (word: number) => number;
  props: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
};
