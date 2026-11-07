import { Audio } from "@remotion/media";
import React, { useMemo } from "react";
import { AbsoluteFill, CalculateMetadataFunction, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CARDS, DEFAULT_SLOT } from "./cards";
import { Character } from "./Character";
import { Headline, Kicker } from "./Header";
import { Karaoke, buildPages } from "./Karaoke";
import { Paper } from "./Paper";
import { STICKERS } from "./stickers";
import { C, F, SLOTS, clamp01, fontsReady } from "./theme"; // fontsReady: carga Anton y JetBrains Mono
import type { Card, Cue, ExplainerProps, Scene, SceneTiming, Sticker } from "./types";

void fontsReady;

const EXIT_FRAMES = 8;
const SFX = (name: string) => staticFile(`explainer/sfx/${name}.wav`);

/** Lee guion y tiempos del vídeo `slug` y ajusta la duración a la voz. */
export const calculateExplainerMetadata: CalculateMetadataFunction<ExplainerProps> = async ({ props }) => {
  const base = `explainer/${props.slug}`;
  const get = async (file: string) => {
    const res = await fetch(staticFile(`${base}/${file}`));
    if (!res.ok) {
      throw new Error(`Falta public/${base}/${file}. Para generarlo: .venv/bin/python scripts/explainer/build-voice.py ${props.slug}`);
    }
    return res.json();
  };
  const [script, timing] = await Promise.all([get("script.json"), get("timing.json")]);
  return { durationInFrames: Math.ceil(timing.duration * timing.fps), fps: timing.fps, props: { ...props, script, timing } };
};

// ───────────────────────────────────────────────────────── Elementos colocados en la maqueta

const META_KEYS = new Set(["type", "at", "atWord", "slot", "x", "y", "w", "h", "rotate", "until", "sfx"]);

const Placed: React.FC<{ item: Card | Sticker; kind: "card" | "sticker" }> = ({ item, kind }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const sfx = (item.sfx as string | undefined) ?? (kind === "sticker" ? "thud" : "pop");

  const exitP = item.until !== undefined ? clamp01((frame - (durationInFrames - EXIT_FRAMES)) / EXIT_FRAMES) : 0;
  const props = Object.fromEntries(Object.entries(item).filter(([k]) => !META_KEYS.has(k)));

  let body: React.ReactNode;
  let style: React.CSSProperties;

  if (kind === "card") {
    const Comp = CARDS[item.type];
    if (!Comp) throw new Error(`Tipo de tarjeta desconocido: «${item.type}». Disponibles: ${Object.keys(CARDS).join(", ")}`);
    const slot = SLOTS[item.slot ?? DEFAULT_SLOT[item.type] ?? "main"];
    const x = item.x ?? slot.x;
    const y = item.y ?? slot.y;
    const w = item.w ?? slot.w;
    const h = item.h ?? slot.h;
    const p = spring({ frame, fps, config: { damping: 15, stiffness: 150, mass: 0.8 } });
    body = <Comp {...props} w={w} h={h} />;
    style = {
      position: "absolute",
      left: x - w / 2,
      top: y - h / 2,
      width: w,
      height: h,
      opacity: clamp01(p * 2) * (1 - exitP),
      translate: `0px ${interpolate(p, [0, 1], [70, 0]) + exitP * 26}px`,
      scale: String(interpolate(p, [0, 1], [0.86, 1]) * (1 - 0.04 * exitP)),
      rotate: `${item.rotate ?? 0}deg`,
    };
  } else {
    const Comp = STICKERS[item.type];
    if (!Comp) throw new Error(`Tipo de pegatina desconocido: «${item.type}». Disponibles: ${Object.keys(STICKERS).join(", ")}`);
    body = <Comp {...(props as { text: string })} />;
    style = {
      position: "absolute",
      left: item.x ?? 540,
      top: item.y ?? 700,
      translate: "-50% -50%",
      rotate: `${item.rotate ?? -4}deg`,
      opacity: 1 - exitP,
    };
  }

  return (
    <>
      <div style={style}>{body}</div>
      {sfx !== "none" ? <Audio src={SFX(sfx)} volume={kind === "sticker" ? 0.55 : 0.4} /> : null}
    </>
  );
};

// ───────────────────────────────────────────────────────── Escena

const resolveCue = (cue: Cue, st: SceneTiming, fallback: number): number => {
  if (cue.at !== undefined) return cue.at;
  if (cue.atWord !== undefined && st.words[cue.atWord]) return Math.max(0, st.words[cue.atWord].s - st.start);
  return fallback;
};

const SceneView: React.FC<{ scene: Scene; st: SceneTiming; steps: number }> = ({ scene, st, steps }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const leave = clamp01((frame - (durationInFrames - EXIT_FRAMES)) / EXIT_FRAMES);
  const sceneLen = durationInFrames / fps;

  const place = (item: Card | Sticker, i: number, kind: "card" | "sticker") => {
    const at = resolveCue(item, st, 0.35 + i * 0.3);
    const from = Math.round(at * fps);
    const to = item.until !== undefined ? Math.round(item.until * fps) : durationInFrames;
    return (
      <Sequence key={`${kind}-${i}`} from={from} durationInFrames={Math.max(1, to - from)} premountFor={fps} name={`${kind}:${item.type}`}>
        <Placed item={item} kind={kind} />
      </Sequence>
    );
  };

  return (
    <AbsoluteFill style={{ opacity: 1 - leave, translate: `0px ${leave * -18}px` }}>
      {scene.kicker ? <Kicker text={scene.kicker} /> : null}
      {scene.head ? (
        <Sequence durationInFrames={durationInFrames} name="Titular">
          <Headline head={scene.head} at={Math.min(resolveCue(scene.head, st, 0.05), sceneLen - 0.5)} total={steps} />
          <Sequence from={Math.round(resolveCue(scene.head, st, 0.05) * fps)}>
            <Audio src={SFX("whoosh")} volume={0.3} />
          </Sequence>
        </Sequence>
      ) : null}
      {(scene.cards ?? []).map((c, i) => place(c, i, "card"))}
      {(scene.stickers ?? []).map((s, i) => place(s, (scene.cards?.length ?? 0) + i, "sticker"))}
    </AbsoluteFill>
  );
};

// ───────────────────────────────────────────────────────── Vídeo completo

export const Explainer: React.FC<ExplainerProps> = ({ slug, script, timing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pages = useMemo(() => (script && timing ? buildPages(script, timing) : []), [script, timing]);
  if (!script || !timing) return null;

  const base = `explainer/${slug}`;
  const steps = script.meta.steps ?? script.scenes.filter((s) => s.head?.badge).length;
  const bounds = timing.scenes.map((st) => ({ from: Math.round(st.start * fps), to: Math.round(st.end * fps) }));
  const current = Math.max(0, bounds.findIndex((b) => frame >= b.from && frame < b.to));
  const mouth = Number(timing.mouth[frame] ?? 0);

  return (
    <AbsoluteFill style={{ background: C.paper, overflow: "hidden" }}>
      <Paper />

      {script.scenes.map((scene, i) => (
        <Sequence key={scene.id} from={bounds[i].from} durationInFrames={bounds[i].to - bounds[i].from} premountFor={fps} name={scene.id}>
          <SceneView scene={scene} st={timing.scenes[i]} steps={steps} />
        </Sequence>
      ))}

      <Karaoke pages={pages} />
      <Character mouth={mouth} sinceScene={frame - bounds[current].from} sprites={script.meta.character} />

      {script.meta.handle ? (
        <div style={{ position: "absolute", left: 84, bottom: 70, fontFamily: F.mono, fontSize: 30, fontWeight: 500, color: C.mute, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: C.red }} />
          {script.meta.handle}
        </div>
      ) : null}

      <Audio src={staticFile(`${base}/voice.wav`)} premountFor={fps} />
      {script.meta.music ? <Audio src={staticFile(script.meta.music)} loop volume={script.meta.musicVolume ?? 0.1} premountFor={fps} /> : null}
    </AbsoluteFill>
  );
};
