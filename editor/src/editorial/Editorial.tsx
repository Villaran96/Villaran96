import { Audio } from "@remotion/media";
import type React from "react";
import { AbsoluteFill, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { SANS, SERIF } from "../fonts";
import timeline from "./timeline.json";

// Estilo editorial suizo: papel, tinta, retícula de 12 columnas y la foto de la tarjeta como único color.

const PAPER = "#ECE9E2";
const INK = "#0E0E0E";
const MARGIN = 96;
const TEXT_X = 820;
const FIG_X = 1440;
const FIG_W = 384;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const OUT = Easing.bezier(0.16, 1, 0.3, 1);
const IN = Easing.bezier(0.7, 0, 0.84, 0);
const CARD = staticFile("motion/tarjeta.png");
const LOGO = staticFile("motion/logo-mark.png");

const start = (id: string) => {
  let t = 0;
  for (const s of timeline.scenes) {
    if (s.id === id) return t;
    t += s.duration;
  }
  return t;
};
const dur = (id: string) => timeline.scenes.find((s) => s.id === id)!.duration;
export const EDITORIAL_TOTAL = timeline.scenes.reduce((sum, s) => sum + s.duration, 0);
const R = timeline.cues.rule;

// Línea que sube desde su máscara y sale hacia arriba.
const Reveal: React.FC<{ at: number; out?: number; children: React.ReactNode; style?: React.CSSProperties; dur?: number }> = ({ at, out, children, style, dur: d = 14 }) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [at, at + d], [105, 0], { ...clamp, easing: OUT });
  const exit = out === undefined ? 0 : interpolate(frame, [out, out + 10], [0, -105], { ...clamp, easing: IN });
  return (
    <div style={{ overflow: "hidden", paddingBottom: "0.1em", marginBottom: "-0.1em", ...style }}>
      <div style={{ translate: `0 ${enter + exit}%` }}>{children}</div>
    </div>
  );
};

// Recorte de la foto de la tarjeta (cx, cy: centro del recorte en 0–1; zoom: aumento).
const Crop: React.FC<{ w: number; h: number; cx: number; cy: number; zoom: number; style?: React.CSSProperties; children?: React.ReactNode }> = ({ w, h, cx, cy, zoom, style, children }) => {
  const size = Math.max(w, h) * zoom;
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", ...style }}>
      <Img src={CARD} style={{ position: "absolute", width: size, height: size, left: w / 2 - cx * size, top: h / 2 - cy * size, maxWidth: "none" }} />
      {children}
    </div>
  );
};

// Figura que se destapa con una cortina de tinta.
const Figure: React.FC<{ at: number; out: number; w: number; h: number; children: React.ReactNode; label: string; labelAt: number }> = ({ at, out, w, h, children, label, labelAt }) => {
  const frame = useCurrentFrame();
  const cover = interpolate(frame, [at, at + 10, at + 20], [0, 1, 1], { ...clamp, easing: OUT });
  const uncover = interpolate(frame, [at + 10, at + 22], [0, 1], { ...clamp, easing: OUT });
  const leave = interpolate(frame, [out, out + 10], [0, 1], { ...clamp, easing: IN });
  const zoom = interpolate(frame, [at, at + 110], [1.1, 1], clamp);
  return (
    <div style={{ position: "relative", width: w }}>
      <div style={{ position: "relative", width: w, height: h, overflow: "hidden", clipPath: `inset(${leave * 100}% 0 0 0)` }}>
        <div style={{ opacity: uncover > 0 ? 1 : 0, scale: String(zoom), width: w, height: h }}>{children}</div>
        <div style={{ position: "absolute", inset: 0, background: INK, transformOrigin: uncover > 0 ? "right" : "left", scale: `${uncover > 0 ? 1 - uncover : cover} 1` }} />
      </div>
      <div style={{ marginTop: 18, fontFamily: SANS, fontWeight: 600, fontSize: 19, letterSpacing: "0.04em", color: INK }}>
        <Reveal at={labelAt} out={out - 2}>{label}</Reveal>
      </div>
    </div>
  );
};

const Numeral: React.FC<{ n: string; out: number }> = ({ n, out }) => {
  const frame = useCurrentFrame();
  const y = interpolate(frame, [R.numeral, R.numeral + 16], [100, 0], { ...clamp, easing: OUT });
  const exit = interpolate(frame, [out, out + 12], [0, -100], { ...clamp, easing: IN });
  return (
    <div style={{ position: "absolute", left: MARGIN - 14, top: 190, height: 620, overflow: "hidden" }}>
      <div style={{ translate: `0 ${y + exit - frame * 0.03}%`, fontFamily: SANS, fontWeight: 900, fontSize: 560, lineHeight: 1.06, letterSpacing: -38, color: INK, fontVariantNumeric: "tabular-nums" }}>{n}</div>
    </div>
  );
};

const Headline: React.FC<{ lines: string[]; caption: string; out: number; width?: number; children?: React.ReactNode }> = ({ lines, caption, out, width = 560, children }) => (
  <div style={{ position: "absolute", left: TEXT_X, top: 250, width }}>
    <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 82, lineHeight: 0.98, letterSpacing: -3.5, color: INK }}>
      {lines.map((l, i) => (
        <Reveal key={l} at={R.headline[0] + i * (R.headline[1] - R.headline[0])} out={out + i * 2}>
          {l}
        </Reveal>
      ))}
    </div>
    <div style={{ marginTop: 30, fontFamily: SERIF, fontStyle: "italic", fontSize: 46, lineHeight: 1.1, color: INK }}>
      <Reveal at={R.caption} out={out + 4}>
        {caption}
      </Reveal>
    </div>
    {children}
  </div>
);

// ---------- marco fijo: retícula, cabecera y pie ----------
const Frame: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const closeAt = start("close");
  const inv = interpolate(frame, [closeAt, closeAt + 12], [0, 1], { ...clamp, easing: OUT });
  const color = inv > 0.5 ? PAPER : INK;
  const draw = interpolate(frame, [0, 22], [0, 1], { ...clamp, easing: OUT });
  const guides = interpolate(frame, [0, 30, 90], [0, 0.09, 0.05], clamp);
  const page = (() => {
    const ids = ["rule1", "rule2", "rule3", "rule4"];
    const i = ids.findIndex((id) => frame >= start(id) && frame < start(id) + dur(id));
    return i >= 0 ? `${String(i + 1).padStart(2, "0")} / 04` : "— / 04";
  })();
  const label: React.CSSProperties = { position: "absolute", fontFamily: SANS, fontWeight: 700, fontSize: 18, letterSpacing: "0.18em", textTransform: "uppercase", color };
  const colW = (width - MARGIN * 2 - 11 * 24) / 12;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {new Array(13).fill(0).map((_, i) => {
        const x = MARGIN + i * (colW + 24) - (i === 12 ? 24 : 0);
        return <div key={i} style={{ position: "absolute", left: x, top: 88, width: 1, height: (height - 176) * draw, background: color, opacity: guides }} />;
      })}
      <div style={{ position: "absolute", left: MARGIN, top: 88, height: 2, width: (width - MARGIN * 2) * draw, background: color }} />
      <div style={{ position: "absolute", right: MARGIN, top: height - 90, height: 2, width: (width - MARGIN * 2) * draw, background: color }} />
      <div style={{ ...label, left: MARGIN, top: 52, opacity: draw }}>Cierzo NFC</div>
      <div style={{ ...label, left: 0, right: 0, top: 52, textAlign: "center", opacity: draw }}>Manual Nº 1 · Reseñas</div>
      <div style={{ ...label, right: MARGIN, top: 52, opacity: draw, fontVariantNumeric: "tabular-nums" }}>{page}</div>
      <div style={{ ...label, left: MARGIN, top: height - 66, opacity: draw }}>Tarjetas NFC de reseñas</div>
      <div style={{ ...label, right: MARGIN, top: height - 66, opacity: draw }}>Zaragoza</div>
    </AbsoluteFill>
  );
};

// ---------- portada ----------
const Cover: React.FC = () => {
  const c = timeline.cues.cover;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: MARGIN, top: 250 }}>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 120, color: INK, lineHeight: 1 }}>
          <Reveal at={c.kicker} out={c.out}>
            Manual de
          </Reveal>
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 230, lineHeight: 0.92, letterSpacing: -12, color: INK, marginTop: 10 }}>
          <Reveal at={c.title[0]} out={c.out + 2}>
            las cinco
          </Reveal>
          <Reveal at={c.title[1]} out={c.out + 4}>
            estrellas.
          </Reveal>
        </div>
      </div>
      <div style={{ position: "absolute", left: FIG_X, top: 250 }}>
        <Figure at={c.title[2]} out={c.out} w={FIG_W} h={FIG_W} label="Fig. 0 — La tarjeta." labelAt={c.title[2] + 14}>
          <Crop w={FIG_W} h={FIG_W} cx={0.5} cy={0.5} zoom={1} />
        </Figure>
      </div>
    </AbsoluteFill>
  );
};

// ---------- reglas ----------
const Rule1: React.FC = () => (
  <AbsoluteFill>
    <Numeral n="01" out={R.out} />
    <Headline lines={["Pide la reseña", "en el momento", "justo."]} caption="Cuando el cliente todavía sonríe." out={R.out} />
    <div style={{ position: "absolute", left: FIG_X, top: 250 }}>
      <Figure at={R.figure} out={R.out} w={FIG_W} h={480} label="Fig. 1 — Cinco estrellas, a la vista." labelAt={R.figCaption}>
        <Crop w={FIG_W} h={480} cx={0.5} cy={0.24} zoom={2.1} />
      </Figure>
    </div>
  </AbsoluteFill>
);

const Ripples: React.FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {[0, 1, 2].map((k) => {
        const t = ((frame - at - k * 10) % 30) / 30;
        if (frame - at - k * 10 < 0) return null;
        const r = 30 + t * 150;
        return <div key={k} style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", border: `2px solid ${INK}`, opacity: 1 - t }} />;
      })}
    </>
  );
};

const ListItem: React.FC<{ at: number; out: number; children: string }> = ({ at, out, children }) => {
  const frame = useCurrentFrame();
  const line = interpolate(frame, [at, at + 14], [0, 1], { ...clamp, easing: OUT });
  const gone = interpolate(frame, [out, out + 10], [1, 0], { ...clamp, easing: IN });
  return (
    <div style={{ position: "relative", paddingTop: 14, paddingBottom: 14 }}>
      <div style={{ position: "absolute", left: 0, top: 0, height: 2, width: `${line * gone * 100}%`, background: INK }} />
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 34, letterSpacing: -0.5, color: INK }}>
        <Reveal at={at + 2} out={out}>
          {children}
        </Reveal>
      </div>
    </div>
  );
};

const Rule2: React.FC = () => (
  <AbsoluteFill>
    <Numeral n="02" out={R.out} />
    <Headline lines={["Que sea fácil."]} caption="Basta con acercar el móvil." out={R.out}>
      <div style={{ marginTop: 44 }}>
        <ListItem at={R.extra[0]} out={R.out}>
          Sin descargar ninguna app.
        </ListItem>
        <ListItem at={R.extra[1]} out={R.out + 2}>
          Sin buscar el negocio.
        </ListItem>
        <ListItem at={R.extra[2]} out={R.out + 4}>
          Sin escanear nada.
        </ListItem>
      </div>
    </Headline>
    <div style={{ position: "absolute", left: FIG_X, top: 250 }}>
      <Figure at={R.figure} out={R.out} w={FIG_W} h={480} label="Fig. 2 — Acerca tu móvil aquí." labelAt={R.figCaption}>
        <Crop w={FIG_W} h={480} cx={0.5} cy={0.66} zoom={2.2}>
          <Ripples x={FIG_W / 2} y={240} at={R.figure + 20} />
        </Crop>
      </Figure>
    </div>
  </AbsoluteFill>
);

const Pin: React.FC<{ n: number; x: number; y: number; at: number }> = ({ n, x, y, at }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [at, at + 10], [0, 1], { ...clamp, easing: Easing.bezier(0.34, 1.56, 0.64, 1) });
  return (
    <div
      style={{
        position: "absolute",
        left: x - 26,
        top: y - 26,
        width: 52,
        height: 52,
        borderRadius: 26,
        background: INK,
        color: PAPER,
        display: "grid",
        placeItems: "center",
        fontFamily: SANS,
        fontWeight: 800,
        fontSize: 24,
        scale: String(s),
      }}
    >
      {n}
    </div>
  );
};

const Rule3: React.FC = () => {
  const legend = ["Mensaje claro", "Chip NFC", "Tu logo"];
  const size = 520;
  return (
    <AbsoluteFill>
      <Numeral n="03" out={R.out} />
      <Headline lines={["Ponla donde", "se vea."]} caption="En la barra, en la mesa o junto a la caja." out={R.out} width={440}>
        <div style={{ marginTop: 40, display: "grid", gap: 10 }}>
          {legend.map((l, i) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: SANS, fontWeight: 700, fontSize: 30, color: INK }}>
              <Reveal at={R.extra[i]} out={R.out + i * 2}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 18, background: INK, color: PAPER, display: "grid", placeItems: "center", fontSize: 18 }}>{i + 1}</span>
                  {l}
                </span>
              </Reveal>
            </div>
          ))}
        </div>
      </Headline>
      <div style={{ position: "absolute", left: 1304, top: 230 }}>
        <Figure at={R.figure} out={R.out} w={size} h={size} label="Fig. 3 — Acrílico de 3 mm con adhesivo." labelAt={R.figCaption}>
          <Crop w={size} h={size} cx={0.5} cy={0.5} zoom={1}>
            <Pin n={1} x={size * 0.9} y={size * 0.26} at={R.extra[0]} />
            <Pin n={2} x={size * 0.66} y={size * 0.7} at={R.extra[1]} />
            <Pin n={3} x={size * 0.8} y={size * 0.9} at={R.extra[2]} />
          </Crop>
        </Figure>
      </div>
    </AbsoluteFill>
  );
};

const Calendar: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const frame = useCurrentFrame();
  const days = ["L", "M", "X", "J", "V", "S", "D"];
  // Estrellas por casilla (ejemplo ilustrativo).
  const stars = [1, 2, 1, 3, 2, 4, 3, 2, 1, 2, 3, 2, 4, 5];
  const gone = interpolate(frame, [out, out + 10], [1, 0], { ...clamp, easing: IN });
  return (
    <div style={{ marginTop: 40, opacity: gone }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 72px)", gap: 8, fontFamily: SANS, fontWeight: 700, fontSize: 18, letterSpacing: "0.12em", color: INK }}>
        {days.map((d) => (
          <div key={d} style={{ paddingBottom: 6 }}>
            {d}
          </div>
        ))}
        {stars.map((n, i) => {
          const t = at + i * 2.5;
          const p = interpolate(frame, [t, t + 6], [0, 1], { ...clamp, easing: OUT });
          return (
            <div key={i} style={{ height: 72, borderTop: `2px solid ${INK}`, paddingTop: 6, display: "flex", flexWrap: "wrap", alignContent: "flex-start", gap: 1, fontSize: 22, lineHeight: 1, letterSpacing: 0 }}>
              {new Array(n).fill(0).map((_, k) => (
                <span key={k} style={{ scale: String(p), display: "inline-block" }}>
                  ★
                </span>
              ))}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 10, fontFamily: SERIF, fontStyle: "italic", fontSize: 26, color: INK, opacity: interpolate(frame, [at + 30, at + 40], [0, 0.7], clamp) }}>Ejemplo ilustrativo.</div>
    </div>
  );
};

const Rule4: React.FC = () => (
  <AbsoluteFill>
    <Numeral n="04" out={R.out} />
    <Headline lines={["Repite", "cada día."]} caption="La tarjeta no se cansa de pedir." out={R.out}>
      <Calendar at={R.extra[0]} out={R.out} />
    </Headline>
    <div style={{ position: "absolute", left: FIG_X, top: 250 }}>
      <Figure at={R.figure} out={R.out} w={FIG_W} h={480} label="Fig. 4 — Siempre en el mismo sitio." labelAt={R.figCaption}>
        <Crop w={FIG_W} h={480} cx={0.5} cy={0.83} zoom={2.4} />
      </Figure>
    </div>
  </AbsoluteFill>
);

// ---------- cierre en negativo ----------
const Close: React.FC = () => {
  const frame = useCurrentFrame();
  const c = timeline.cues.close;
  const panel = interpolate(frame, [c.invert, c.invert + 12], [100, 0], { ...clamp, easing: OUT });
  const cardIn = interpolate(frame, [c.card, c.card + 18], [0, 1], { ...clamp, easing: OUT });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: INK, translate: `0 ${panel}%` }} />
      <div style={{ position: "absolute", left: MARGIN, top: 220, color: PAPER, translate: `0 ${-interpolate(frame, [40, 150], [0, 16], clamp)}px` }}>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 110, lineHeight: 1 }}>
          <Reveal at={c.line1}>Las cinco estrellas</Reveal>
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 150, lineHeight: 0.95, letterSpacing: -8, marginTop: 14 }}>
          <Reveal at={c.line2[0]}>están a un móvil</Reveal>
          <Reveal at={c.line2[1]}>de distancia.</Reveal>
        </div>
        <div style={{ marginTop: 70, display: "flex", alignItems: "center", gap: 22 }}>
          <Reveal at={c.sign[0]}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, fontFamily: SANS, fontWeight: 800, fontSize: 52, letterSpacing: -1.5 }}>
              <Img src={LOGO} style={{ width: 74, height: "auto" }} />
              Cierzo NFC
            </div>
          </Reveal>
        </div>
        <div style={{ marginTop: 16, fontFamily: SERIF, fontStyle: "italic", fontSize: 38, opacity: 0.85 }}>
          <Reveal at={c.sign[1]}>Tarjetas de reseñas con tu marca. Venta al por mayor.</Reveal>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 1400,
          top: 250,
          padding: 12,
          background: PAPER,
          rotate: `${interpolate(cardIn, [0, 1], [8, -3]) + interpolate(frame, [c.card + 18, 150], [0, 2.5], clamp)}deg`,
          translate: `0 ${(1 - cardIn) * 700 - interpolate(frame, [c.card + 18, 150], [0, 24], clamp)}px`,
        }}
      >
        <Img src={CARD} style={{ display: "block", width: 400, height: 400 }} />
      </div>
    </AbsoluteFill>
  );
};

export const EditorialPromo: React.FC<{ withMusic: boolean }> = ({ withMusic }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <Sequence name="Portada" from={start("cover")} durationInFrames={dur("cover")} premountFor={fps}>
        <Cover />
      </Sequence>
      <Sequence name="01 · El momento" from={start("rule1")} durationInFrames={dur("rule1")} premountFor={fps}>
        <Rule1 />
      </Sequence>
      <Sequence name="02 · Fácil" from={start("rule2")} durationInFrames={dur("rule2")} premountFor={fps}>
        <Rule2 />
      </Sequence>
      <Sequence name="03 · A la vista" from={start("rule3")} durationInFrames={dur("rule3")} premountFor={fps}>
        <Rule3 />
      </Sequence>
      <Sequence name="04 · Cada día" from={start("rule4")} durationInFrames={dur("rule4")} premountFor={fps}>
        <Rule4 />
      </Sequence>
      <Sequence name="Cierre" from={start("close")} durationInFrames={dur("close")} premountFor={fps}>
        <Close />
      </Sequence>
      <Frame />
      {withMusic ? <Audio src={staticFile("audio/editorial-promo.wav")} premountFor={fps} /> : null}
    </AbsoluteFill>
  );
};
