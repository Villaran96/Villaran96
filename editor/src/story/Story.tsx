import { Audio } from "@remotion/media";
import React, { useMemo } from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { buildPages } from "../explainer/Karaoke";
import { makeMetadata } from "../explainer/load";
import { F } from "../explainer/theme";
import type { SceneTiming } from "../explainer/types";
import { StoryCaptions } from "./Captions";
import { SCENES } from "./scenes";
import type { SceneCtx, StoryProps, StoryScene } from "./types";
import { clamp } from "./util";
import { H } from "./kit/water";
import "../explainer/theme"; // registra las fuentes (Anton, JetBrains Mono, Inter Tight)

/** Fotogramas de solape entre una escena y la siguiente (transición). */
const OVERLAP = 10;
const sfx = (name: string) => staticFile(`explainer/sfx/${name}.wav`);
/** Margen de mezcla: voz normalizada a −1 dBFS + música + un efecto fuerte recortaría. */
const VOICE_GAIN = 0.82;
const SFX_GAIN = 0.8;

export const calculateStoryMetadata = makeMetadata<StoryProps>("story");

const SceneShell: React.FC<{ scene: StoryScene; st: SceneTiming; ov: number; from: number }> = ({ scene, st, ov, from }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const Comp = SCENES[scene.scene];
  if (!Comp) throw new Error(`Escena desconocida «${scene.scene}». Registradas: ${Object.keys(SCENES).join(", ")}`);

  const tr = scene.transition ?? "fade";
  const p = ov > 0 ? Easing.inOut(Easing.ease)(clamp(frame / ov)) : 1;
  const style: React.CSSProperties = {};
  if (ov > 0 && tr === "fade") style.opacity = p;
  if (ov > 0 && tr === "slide") style.translate = `0px ${(1 - p) * H}px`;
  if (ov > 0 && tr === "zoom") {
    style.opacity = p;
    style.scale = String(1.22 - 0.22 * p);
  }

  const ctx: SceneCtx = {
    scene,
    st,
    t: (frame - ov) / fps,
    g: (from + frame) / fps,
    dur: (durationInFrames - ov) / fps,
    cue: (word) => Math.max(0, (st.words[word]?.s ?? st.voiceStart) - st.start),
    props: scene.props ?? {},
  };
  return (
    <AbsoluteFill style={style}>
      <Comp {...ctx} />
    </AbsoluteFill>
  );
};

export const Story: React.FC<StoryProps> = ({ slug, script, timing }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const pages = useMemo(() => (script && timing ? buildPages(script, timing, { maxWords: 3, maxChars: 20, minClause: 2 }) : []), [script, timing]);
  if (!script || !timing) return null;

  const { meta } = script;
  const accent = meta.accent ?? "#ffd34d";
  const base = `story/${slug}`;
  const starts = timing.scenes.map((st, i) => {
    const ov = i > 0 && (script.scenes[i].transition ?? "fade") !== "cut" ? OVERLAP : 0;
    const from = Math.round(st.start * fps) - ov;
    return { ov, from, to: Math.round(st.end * fps) };
  });
  const musicVol = meta.musicVolume ?? 0.3;

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {script.scenes.map((scene, i) => (
        <Sequence key={scene.id} from={starts[i].from} durationInFrames={starts[i].to - starts[i].from} premountFor={fps} name={scene.id}>
          <SceneShell scene={scene} st={timing.scenes[i]} ov={starts[i].ov} from={starts[i].from} />
        </Sequence>
      ))}

      {/* degradado inferior para que los subtítulos se lean sobre cualquier fondo */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />

      {meta.channel ? (
        <div style={{ position: "absolute", left: 56, top: 90, fontFamily: F.mono, fontWeight: 600, fontSize: 28, color: "#fff", opacity: 0.88, textShadow: "0 2px 8px rgba(0,0,0,.6)", letterSpacing: "0.02em", textTransform: "uppercase" }}>
          {meta.channel}
          {meta.episode ? <span style={{ color: accent }}> · #{meta.episode}</span> : null}
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 0, top: 0, height: 8, width: `${(frame / durationInFrames) * 100}%`, background: accent }} />

      <StoryCaptions pages={pages} accent={accent} />

      <Audio src={staticFile(`${base}/voice.wav`)} volume={VOICE_GAIN} premountFor={fps} />
      {meta.music ? (
        <Audio
          src={staticFile(meta.music)}
          loop
          loopVolumeCurveBehavior="extend"
          volume={(f) => interpolate(f, [0, fps * 1.2, durationInFrames - fps * 1.8, durationInFrames], [0, musicVol, musicVol, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
          premountFor={fps}
        />
      ) : null}

      {/* whoosh en cada cambio de escena + efectos puntuales del guion */}
      {starts.slice(1).map((s, i) => (
        <Sequence key={`w${i}`} from={s.from + 2} durationInFrames={Math.round(fps * 0.6)}>
          <Audio src={sfx("whoosh")} volume={0.2 * SFX_GAIN} />
        </Sequence>
      ))}
      {script.scenes.flatMap((scene, i) =>
        (scene.sfx ?? []).map((cue, k) => {
          const st = timing.scenes[i];
          const at = cue.at ?? (cue.atWord !== undefined ? (st.words[cue.atWord]?.s ?? st.voiceStart) - st.start : 0);
          return (
            <Sequence key={`s${i}-${k}`} from={Math.round((st.start + at) * fps)} durationInFrames={Math.round(fps * 2.5)}>
              <Audio src={sfx(cue.name)} volume={(cue.volume ?? 0.5) * SFX_GAIN} />
            </Sequence>
          );
        }),
      )}
    </AbsoluteFill>
  );
};
