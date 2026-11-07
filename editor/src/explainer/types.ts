// Contrato de datos de los vídeos «Explainer».
//
//   public/explainer/<slug>/script.json   → lo escribe una persona (o Claude): escenas, tarjetas, pegatinas.
//   public/explainer/<slug>/timing.json   → lo genera scripts/explainer/build-voice.py a partir de la voz.
//   public/explainer/<slug>/voice.wav     → ídem.
//
// Marcado de texto (narración y titulares):  *acento*  → rojo (serif cursiva en subtítulos)
//                                             ~tachado~ → texto tachado en rojo (solo titulares)

export type Slot = "main" | "callout" | "left" | "right" | "free";

export type Placement = {
  /** Hueco predefinido de la maqueta; por defecto depende del tipo de tarjeta. */
  slot?: Slot;
  /** Anula el hueco: posición del centro de la tarjeta y tamaño, en píxeles de 1080 × 1920. */
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rotate?: number;
};

/** Cuándo aparece un elemento: segundos desde el inicio de la escena, o índice de palabra de la narración. */
export type Cue = { at?: number; atWord?: number };

export type Card = Placement &
  Cue & {
    type: string;
    /** Segundos desde el inicio de la escena en que desaparece (por defecto, al terminar la escena). */
    until?: number;
    [prop: string]: unknown;
  };

export type Sticker = Placement &
  Cue & {
    type: "stamp" | "tag" | "chip";
    text: string;
    /** Segundos desde el inicio de la escena en que desaparece. */
    until?: number;
    [prop: string]: unknown;
  };

export type Head = {
  /** Etiqueta pequeña en monoespaciada sobre el titular: «// en el escritorio». */
  small?: string;
  /** Titular en mayúsculas condensadas, con marcado *rojo* y ~tachado~. */
  text: string;
  /** Número de paso para la insignia (1…meta.steps). */
  badge?: number;
  atWord?: number;
  at?: number;
};

export type Scene = {
  id: string;
  /** Etiqueta mono sobre los subtítulos: «// paso 2 · la carpeta». */
  kicker?: string;
  /** Texto que se locuta. Cada palabra de aquí sale como subtítulo karaoke. */
  narration: string;
  head?: Head;
  cards?: Card[];
  stickers?: Sticker[];
  /** Silencio tras la locución (s) antes de pasar a la siguiente escena. */
  pad?: number;
};

export type Meta = {
  title: string;
  /** Pastilla en la esquina inferior derecha; vacío para no mostrarla. */
  handle?: string;
  /** Total de pasos (puntos de la insignia). */
  steps?: number;
  /** Voz de Piper, p. ej. es_ES-davefx-medium. */
  voice?: string;
  /** 1 = velocidad normal de la voz. */
  speed?: number;
  /** Cómo se pronuncia lo que la voz lee mal (solo afecta al audio): { "NFC": "ene efe ce" }. */
  pronounce?: Record<string, string>;
  /** Carpeta de public/ con 0.png…3.png (boca cerrada → muy abierta) para usar tu propio personaje. */
  character?: string;
  /** Música de fondo (ruta dentro de public/) y su volumen 0–1. */
  music?: string;
  musicVolume?: number;
};

export type Script = { meta: Meta; scenes: Scene[] };

export type TimedWord = { t: string; s: number; e: number };

export type SceneTiming = {
  id: string;
  /** Segundos absolutos. */
  start: number;
  voiceStart: number;
  voiceEnd: number;
  end: number;
  words: TimedWord[];
};

export type Timing = {
  fps: number;
  duration: number;
  /** Un dígito 0–3 por fotograma: apertura de la boca del personaje. */
  mouth: string;
  scenes: SceneTiming[];
};

export type ExplainerProps = {
  slug: string;
  script?: Script;
  timing?: Timing;
};
