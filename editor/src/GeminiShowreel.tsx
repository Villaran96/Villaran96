import { loadFont } from "@remotion/fonts";
import { Audio } from "@remotion/media";
import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { fontsLoaded, SERIF } from "./fonts";

// Showreel de 18 s (6 escenas × 180 fotogramas) dibujado en un único <canvas>.
// Cada fotograma se calcula solo a partir de `frame`: sin estado entre fotogramas ni Math.random().

const DISPLAY = "Inter";
const MONO = "JetBrains Mono";

const canvasFonts = Promise.all([
  fontsLoaded,
  loadFont({ family: DISPLAY, url: staticFile("fonts/Inter-900.woff2"), weight: "900" }),
  loadFont({ family: MONO, url: staticFile("fonts/JetBrainsMono-var.woff2"), weight: "100 800" }),
]);

const W = 1920;
const H = 1080;
const SCENE_FRAMES = 180;
const TOTAL_FRAMES = 1080;
const TAU = Math.PI * 2;
const LIME = "#d4ff00";
const CYAN = "#00f0ff";
const PINK = "#ff2a5f";
const WHITE = "#ffffff";
const INK = "#121216";

type Ctx = CanvasRenderingContext2D;
type FrameInfo = { frame: number; t: number; localFrame: number; localT: number; beatPulse: number };
type Theme = { fg: string; accent: string };
type SceneOut = { x: number; y: number; reticle: boolean; top: Theme; bottom: Theme };

const DARK_THEME: Theme = { fg: WHITE, accent: LIME };
const LIGHT_THEME: Theme = { fg: INK, accent: PINK };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const easeOutExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

// Pseudoaleatorio fijo por (índice, canal): la semilla de cada partícula/nodo.
const hash = (i: number, k: number) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const text = (
  ctx: Ctx,
  str: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = "left",
  spacing = 0,
) => {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(str, x, y);
};

const drawGrid = (ctx: Ctx, color: string, x0 = 0, x1 = W) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = Math.floor(x0 / 60) * 60; x <= x1; x += 60) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
  }
  for (let y = 0; y <= H; y += 60) {
    ctx.moveTo(x0, y + 0.5);
    ctx.lineTo(x1, y + 0.5);
  }
  ctx.stroke();
};

const SCENE_NAMES = [
  "SCN 01 // EPICICLOS DE FOURIER",
  "SCN 02 // TIPOGRAFÍA CINÉTICA",
  "SCN 03 // CURL FLOW FIELD",
  "SCN 04 // TORUS KNOT (3,5)",
  "SCN 05 // TOPOLOGÍA DE REDES",
  "SCN 06 // GEMINI STUDIO",
];

// ── Escena 1: epiciclos de Fourier ─────────────────────────────────────────

const EPI_R = [165, 78, 42, 24, 12];
const EPI_S = [2.4, -7.2, 12.0, -16.8, 26.4];
const EPI_C = [LIME, CYAN, PINK, WHITE, LIME];
const EPI_X = W * 0.32;
const EPI_Y = H * 0.5;
const WAVE_X = W * 0.56;
const WAVE_POINTS = 240;
const WAVE_DX = 3.25;

const epicycleTip = (time: number, scale: number) => {
  let x = EPI_X;
  let y = EPI_Y;
  for (let k = 0; k < EPI_R.length; k++) {
    x += EPI_R[k] * scale * Math.cos(EPI_S[k] * time);
    y += EPI_R[k] * scale * Math.sin(EPI_S[k] * time);
  }
  return { x, y };
};

const drawFourier = (ctx: Ctx, f: FrameInfo): SceneOut => {
  const { t, localFrame, beatPulse } = f;
  ctx.fillStyle = "#07080c";
  ctx.fillRect(0, 0, W, H);
  drawGrid(ctx, "rgba(255, 255, 255, 0.045)");

  const scale = easeOutBack(clamp01(localFrame / 36));
  const reveal = easeOutCubic(clamp01(localFrame / 80));
  const tip = epicycleTip(t, scale);

  // Ejes de la onda
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(WAVE_X, H * 0.16);
  ctx.lineTo(WAVE_X, H * 0.84);
  ctx.moveTo(WAVE_X, EPI_Y);
  ctx.lineTo(WAVE_X + WAVE_POINTS * WAVE_DX, EPI_Y);
  ctx.stroke();

  // Estela de la punta (1,4 s hacia atrás)
  ctx.lineWidth = 1.5;
  let prev = tip;
  for (let i = 1; i <= 280; i++) {
    const p = epicycleTip(t - i * 0.005, scale);
    ctx.strokeStyle = `rgba(212, 255, 0, ${0.4 * (1 - i / 280) * reveal})`;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    prev = p;
  }

  // Cadena de epiciclos
  let cx = EPI_X;
  let cy = EPI_Y;
  for (let k = 0; k < EPI_R.length; k++) {
    const r = EPI_R[k] * scale;
    const nx = cx + r * Math.cos(EPI_S[k] * t);
    const ny = cy + r * Math.sin(EPI_S[k] * t);
    ctx.strokeStyle = rgba(EPI_C[k], 0.28);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0, r), 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = EPI_C[k];
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    ctx.fillStyle = EPI_C[k];
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, TAU);
    ctx.fill();
    cx = nx;
    cy = ny;
  }

  // Conector punta → onda
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(WAVE_X, tip.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Onda: la suma evaluada en t - i·0,012 para i = 0..240
  const count = Math.max(1, Math.floor(WAVE_POINTS * reveal));
  ctx.beginPath();
  for (let i = 0; i <= count; i++) {
    const p = epicycleTip(t - i * 0.012, scale);
    const x = WAVE_X + i * WAVE_DX;
    if (i === 0) ctx.moveTo(x, p.y);
    else ctx.lineTo(x, p.y);
  }
  const grad = ctx.createLinearGradient(WAVE_X, 0, WAVE_X + WAVE_POINTS * WAVE_DX, 0);
  grad.addColorStop(0, LIME);
  grad.addColorStop(0.55, CYAN);
  grad.addColorStop(1, "rgba(0, 240, 255, 0)");
  ctx.save();
  ctx.strokeStyle = grad;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.shadowColor = LIME;
  ctx.shadowBlur = 14;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = LIME;
  ctx.beginPath();
  ctx.arc(WAVE_X, tip.y, 5, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.shadowColor = LIME;
  ctx.shadowBlur = 20 + beatPulse * 30;
  ctx.fillStyle = LIME;
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 6 + beatPulse * 5, 0, TAU);
  ctx.fill();
  ctx.restore();

  const label = `500 15px "${MONO}"`;
  const dim = `rgba(255, 255, 255, ${0.55 * reveal})`;
  text(ctx, "y(t) = Σ r[k] · sin(ω[k] · t)", WAVE_X, H * 0.16 - 18, label, dim, "left", 1);
  text(ctx, "r = [165, 78, 42, 24, 12]", 96, H - 150, label, dim, "left", 1);
  text(ctx, "ω = [2.4, −7.2, 12.0, −16.8, 26.4]", 96, H - 124, label, dim, "left", 1);
  text(ctx, "N = 5 · Δt = 0.012 s · 241 muestras", 96, H - 98, label, dim, "left", 1);

  return { x: tip.x, y: tip.y, reticle: true, top: DARK_THEME, bottom: DARK_THEME };
};

// ── Escena 2: tipografía cinética en 14 bandas ─────────────────────────────

type Slide = { main: string; sub: string; bg: string; fg: string };
const SLIDES: Slide[] = [
  { main: "CÓDIGO", sub: "arquitectura visual algorítmica", bg: "#d4ff00", fg: "#070709" },
  { main: "PRECISIÓN", sub: "curvas matemáticas a 60 fotogramas", bg: "#ff2a5f", fg: "#ffffff" },
  { main: "SISTEMA", sub: "diseño generativo en tiempo real", bg: "#07080c", fg: "#00f0ff" },
];
const BANDS = 14;
const SLIDE_FRAMES = 60;

const drawSlide = (ctx: Ctx, slide: Slide, index: number) => {
  ctx.fillStyle = slide.bg;
  ctx.fillRect(-W, 0, W * 3, H);
  drawGrid(ctx, rgba(slide.fg, 0.07), -240, W + 240);

  ctx.font = `900 100px "${DISPLAY}"`;
  ctx.letterSpacing = "0px";
  const size = Math.min(300, ((W * 0.84) / ctx.measureText(slide.main).width) * 100);
  const baseline = H * 0.5 + size * 0.3;
  text(ctx, slide.main, W / 2, baseline, `900 ${size}px "${DISPLAY}"`, slide.fg, "center", -size * 0.02);
  // El subtítulo cabe entero en la banda 9 (694–771 px) para que la vibración no lo parta.
  text(ctx, slide.sub, W / 2, 744, `500 30px "${MONO}"`, rgba(slide.fg, 0.85), "center", 6);

  ctx.fillStyle = rgba(slide.fg, 0.35);
  ctx.fillRect(96, H * 0.2, W - 192, 1);
  ctx.fillRect(96, H * 0.8, W - 192, 1);
  const small = `500 14px "${MONO}"`;
  text(ctx, `[ SLIDE 0x0${index + 1} / 03 ]`, 96, H * 0.2 - 14, small, rgba(slide.fg, 0.75), "left", 3);
  text(ctx, `${slide.bg.toUpperCase()} / ${slide.fg.toUpperCase()}`, W - 96, H * 0.2 - 14, small, rgba(slide.fg, 0.75), "right", 3);
  text(ctx, "EASE-OUT-BACK × 14 BANDAS", 96, H * 0.8 + 28, small, rgba(slide.fg, 0.75), "left", 3);
};

const drawKinetic = (ctx: Ctx, f: FrameInfo): SceneOut => {
  const seg = Math.min(SLIDES.length - 1, Math.floor(f.localFrame / SLIDE_FRAMES));
  const segFrame = f.localFrame - seg * SLIDE_FRAMES;
  const slide = SLIDES[seg];

  // Debajo queda la diapositiva anterior; las bandas de la nueva entran por encima.
  if (seg === 0) {
    ctx.fillStyle = "#07080c";
    ctx.fillRect(0, 0, W, H);
    drawGrid(ctx, "rgba(255, 255, 255, 0.045)");
  } else {
    drawSlide(ctx, SLIDES[seg - 1], seg - 1);
  }

  const prevTheme = seg === 0 ? DARK_THEME : { fg: SLIDES[seg - 1].fg, accent: SLIDES[seg - 1].fg };
  const theme = { fg: slide.fg, accent: slide.fg };
  const progress = (b: number) => clamp01((segFrame - b * 1.2) / 26);

  let focusX = W / 2;
  for (let b = 0; b < BANDS; b++) {
    const p = progress(b);
    if (p <= 0) continue;
    const dir = b % 2 === 0 ? 1 : -1;
    const vibration = Math.sin(b * 1.9 + f.frame * 0.7) * f.beatPulse * 10;
    const offset = (1 - easeOutBack(p)) * W * 1.05 * dir + vibration;
    const y0 = Math.round((b * H) / BANDS);
    const y1 = Math.round(((b + 1) * H) / BANDS);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y0, W, y1 - y0);
    ctx.clip();
    ctx.translate(offset, 0);
    drawSlide(ctx, slide, seg);
    ctx.restore();
    if (b === BANDS / 2) focusX = W / 2 + offset;
  }

  return {
    x: focusX,
    y: H / 2,
    reticle: false,
    top: progress(0) >= 0.5 ? theme : prevTheme,
    bottom: progress(BANDS - 1) >= 0.5 ? theme : prevTheme,
  };
};

// ── Escena 3: curl flow field ──────────────────────────────────────────────

const PARTICLES = 450;
const FLOW_STEPS = 18;

const drawFlow = (ctx: Ctx, f: FrameInfo): SceneOut => {
  const { t, localFrame, beatPulse } = f;
  ctx.fillStyle = "#06070b";
  ctx.fillRect(0, 0, W, H);

  const fade = clamp01(localFrame / 24);
  const span = W + 240;
  let head = { x: W / 2, y: H / 2 };
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < PARTICLES; i++) {
    let x = ((hash(i, 1) * span + t * (28 + hash(i, 3) * 46)) % span) - 120;
    let y = hash(i, 2) * (H + 160) - 80;
    const hue = 165 + hash(i, 4) * 95;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < FLOW_STEPS; s++) {
      // ψ = sin(x·0,004 + t)·cos(y·0,004 − 0,8t); el rotacional (∂ψ/∂y, −∂ψ/∂x) da un flujo sin divergencia.
      const a = x * 0.004 + t;
      const b = y * 0.004 - t * 0.8;
      const vx = -Math.sin(a) * Math.sin(b);
      const vy = -Math.cos(a) * Math.cos(b);
      const mag = Math.hypot(vx, vy) + 1e-6;
      const len = 5 + 9 * Math.min(1, mag);
      x += (vx / mag) * len;
      y += (vy / mag) * len;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `hsla(${hue.toFixed(1)}, 95%, 62%, ${(0.42 + beatPulse * 0.25) * fade})`;
    ctx.lineWidth = 1 + hash(i, 5) * 1.6 + beatPulse * 0.6;
    ctx.stroke();
    ctx.fillStyle = `hsla(${hue.toFixed(1)}, 100%, 78%, ${0.9 * fade})`;
    ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    if (i === 0) head = { x, y };
  }
  ctx.globalCompositeOperation = "source-over";

  // Tarjeta translúcida: se desenfoca lo que hay debajo y se oscurece.
  const appear = easeOutBack(clamp01((localFrame - 12) / 30));
  if (appear > 0) {
    const alpha = clamp01(appear);
    const s = 0.92 + 0.08 * appear;
    ctx.font = `900 64px "${DISPLAY}"`;
    ctx.letterSpacing = "1px";
    const cw = (ctx.measureText("TURBULENCIA VECTORIAL").width + 180) * s;
    const ch = 236 * s;
    const x0 = W / 2 - cw / 2;
    const y0 = H / 2 - ch / 2;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x0, y0, cw, ch, 24 * s);
    ctx.clip();
    ctx.globalAlpha = alpha;
    ctx.filter = "blur(16px)";
    ctx.drawImage(ctx.canvas, x0 - 40, y0 - 40, cw + 80, ch + 80, x0 - 40, y0 - 40, cw + 80, ch + 80);
    ctx.filter = "none";
    ctx.fillStyle = "rgba(6, 7, 11, 0.55)";
    ctx.fillRect(x0, y0, cw, ch);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.16 + 0.3 * beatPulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x0, y0, cw, ch, 24 * s);
    ctx.stroke();
    ctx.translate(W / 2, H / 2);
    ctx.scale(s, s);
    text(ctx, "CURL FLOW FIELD // 450 × 18", 0, -62, `600 15px "${MONO}"`, CYAN, "center", 5);
    text(ctx, "TURBULENCIA VECTORIAL", 0, 22, `900 64px "${DISPLAY}"`, WHITE, "center", 1);
    text(ctx, "v = rot ψ · ψ = sin(0.004x + t) · cos(0.004y − 0.8t)", 0, 72, `400 18px "${MONO}"`, "rgba(255, 255, 255, 0.6)", "center", 1);
    ctx.restore();
  }

  return { x: head.x, y: head.y, reticle: true, top: DARK_THEME, bottom: DARK_THEME };
};

// ── Escena 4: torus knot (3,5) ─────────────────────────────────────────────

const KNOT_N = 320;
const KNOT_P = 3;
const KNOT_Q = 5;
const KNOT_D = 12;

const drawKnot = (ctx: Ctx, f: FrameInfo): SceneOut => {
  const { t, localT, localFrame, beatPulse } = f;
  ctx.fillStyle = "#08060e";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 720);
  glow.addColorStop(0, `rgba(110, 50, 255, ${0.16 + 0.08 * beatPulse})`);
  glow.addColorStop(1, "rgba(110, 50, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  drawGrid(ctx, "rgba(255, 255, 255, 0.03)");

  const rotX = t * 0.9;
  const rotY = t * 1.25;
  const swell = Math.sin(localT * Math.PI);
  const intro = easeOutExpo(clamp01(localFrame / 40));
  const S = 92 * (0.88 + 0.16 * swell) * (1 + 0.06 * beatPulse) * intro;
  const cX = Math.cos(rotX);
  const sX = Math.sin(rotX);
  const cY = Math.cos(rotY);
  const sY = Math.sin(rotY);

  const px = new Float32Array(KNOT_N);
  const py = new Float32Array(KNOT_N);
  const pz = new Float32Array(KNOT_N);
  const pp = new Float32Array(KNOT_N);
  for (let i = 0; i < KNOT_N; i++) {
    const phi = (i / KNOT_N) * TAU;
    const r = 2 + Math.cos(KNOT_Q * phi) * (0.85 + 0.3 * swell) + beatPulse * 0.14 * Math.sin(phi * KNOT_Q * 2 + t * 6);
    const x = r * Math.cos(KNOT_P * phi);
    const y = r * Math.sin(KNOT_P * phi);
    const z = -Math.sin(KNOT_Q * phi) * (1 + 0.35 * swell);
    const y1 = y * cX - z * sX;
    const z1 = y * sX + z * cX;
    const x2 = x * cY + z1 * sY;
    const z2 = -x * sY + z1 * cY;
    const persp = KNOT_D / (KNOT_D + z2);
    px[i] = W / 2 + x2 * S * persp;
    py[i] = H / 2 + y1 * S * persp;
    pz[i] = z2;
    pp[i] = persp;
  }

  // Aristas contiguas (i, i+1) y transversales (i, i+18); el alpha cae con la profundidad.
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (let i = 0; i < KNOT_N; i++) {
    const hue = (i / KNOT_N) * 360;
    for (let e = 0; e < 2; e++) {
      const j = (i + (e === 0 ? 1 : 18)) % KNOT_N;
      const depth = clamp01(((pz[i] + pz[j]) / 2 + 3.4) / 6.8);
      const alpha = (e === 0 ? 0.95 : 0.4) * (1 - depth * 0.85) * intro;
      ctx.strokeStyle = `hsla(${hue.toFixed(1)}, 100%, ${e === 0 ? 62 : 70}%, ${alpha})`;
      ctx.lineWidth = (e === 0 ? 3 : 1.1) * ((pp[i] + pp[j]) / 2);
      ctx.beginPath();
      ctx.moveTo(px[i], py[i]);
      ctx.lineTo(px[j], py[j]);
      ctx.stroke();
    }
  }
  for (let i = 0; i < KNOT_N; i += 8) {
    const depth = clamp01((pz[i] + 3.4) / 6.8);
    ctx.fillStyle = `rgba(255, 255, 255, ${(0.9 - depth * 0.75) * intro})`;
    ctx.beginPath();
    ctx.arc(px[i], py[i], 2.2 * pp[i], 0, TAU);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";

  const label = `500 15px "${MONO}"`;
  const dim = "rgba(255, 255, 255, 0.55)";
  text(ctx, "TORUS KNOT (p = 3, q = 5)", 96, H - 150, label, dim, "left", 1);
  text(ctx, "V = 320 · E = 640 · aristas i+1 / i+18", 96, H - 124, label, dim, "left", 1);
  text(ctx, `rotX = ${rotX.toFixed(2)} rad · rotY = ${rotY.toFixed(2)} rad`, 96, H - 98, label, dim, "left", 1);

  return { x: px[0], y: py[0], reticle: true, top: DARK_THEME, bottom: DARK_THEME };
};

// ── Escena 5: topología de redes dinámicas ─────────────────────────────────

const NODES = 55;

const drawNetwork = (ctx: Ctx, f: FrameInfo): SceneOut => {
  const { t, localFrame, beatPulse } = f;
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(0, 0, W, H);
  drawGrid(ctx, "rgba(18, 18, 22, 0.05)");

  const xs = new Float32Array(NODES);
  const ys = new Float32Array(NODES);
  const sc = new Float32Array(NODES);
  for (let i = 0; i < NODES; i++) {
    const ax = 0.32 + hash(i, 11) * 0.5;
    const ay = 0.27 + hash(i, 12) * 0.5;
    const phx = hash(i, 13) * TAU;
    const phy = hash(i, 14) * TAU;
    xs[i] = W * 0.5 + Math.sin(t * ax + phx) * W * (0.26 + 0.2 * hash(i, 15)) + Math.cos(t * ay * 1.6 + phy) * 70;
    ys[i] = H * 0.5 + Math.cos(t * ay + phy) * H * (0.24 + 0.18 * hash(i, 16)) + Math.sin(t * ax * 1.4 + phx) * 50;
    sc[i] = clamp01(easeOutBack(clamp01((localFrame - i * 0.7) / 22)));
  }
  const dist = new Float32Array(NODES * NODES);
  for (let i = 0; i < NODES; i++) {
    for (let j = i + 1; j < NODES; j++) {
      const d = Math.hypot(xs[i] - xs[j], ys[i] - ys[j]);
      dist[i * NODES + j] = d;
      dist[j * NODES + i] = d;
    }
  }

  // Triángulos: tres nodos a menos de 180 px entre sí
  for (let i = 0; i < NODES; i++) {
    for (let j = i + 1; j < NODES; j++) {
      const dij = dist[i * NODES + j];
      if (dij >= 180) continue;
      for (let k = j + 1; k < NODES; k++) {
        const dik = dist[i * NODES + k];
        const djk = dist[j * NODES + k];
        if (dik >= 180 || djk >= 180) continue;
        const maxD = Math.max(dij, dik, djk);
        const alpha = (0.05 + 0.2 * (1 - maxD / 180)) * (1 + 0.4 * beatPulse) * Math.min(sc[i], sc[j], sc[k]);
        ctx.fillStyle = `rgba(255, 42, 95, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(xs[i], ys[i]);
        ctx.lineTo(xs[j], ys[j]);
        ctx.lineTo(xs[k], ys[k]);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Aristas: distancia < 260 px
  ctx.lineWidth = 1.1;
  for (let i = 0; i < NODES; i++) {
    for (let j = i + 1; j < NODES; j++) {
      const d = dist[i * NODES + j];
      if (d >= 260) continue;
      ctx.strokeStyle = `rgba(18, 18, 24, ${0.6 * (1 - d / 260) * Math.min(sc[i], sc[j])})`;
      ctx.beginPath();
      ctx.moveTo(xs[i], ys[i]);
      ctx.lineTo(xs[j], ys[j]);
      ctx.stroke();
    }
  }

  for (let i = 0; i < NODES; i++) {
    const hub = i % 9 === 0;
    const r = (3.5 + (hub ? 3 : 0) + beatPulse * 1.6) * sc[i];
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(xs[i], ys[i], r, 0, TAU);
    ctx.fill();
    if (hub) {
      ctx.strokeStyle = PINK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(xs[i], ys[i], r + 6, 0, TAU);
      ctx.stroke();
    }
  }

  // Título en serif cursiva con halo crema para que se lea sobre las aristas
  const tIn = easeOutCubic(clamp01((localFrame - 10) / 30));
  ctx.save();
  ctx.globalAlpha = tIn;
  ctx.translate(0, (1 - tIn) * 40);
  text(ctx, "55 NODOS · ARISTAS d < 260 PX · TRIÁNGULOS d < 180 PX", 100, H - 232, `600 15px "${MONO}"`, PINK, "left", 3);
  ctx.font = `italic 400 116px "${SERIF}"`;
  ctx.letterSpacing = "0px";
  ctx.textAlign = "left";
  ctx.lineJoin = "round";
  ctx.lineWidth = 18;
  ctx.strokeStyle = "#f4f1ea";
  ctx.strokeText("Topología de Redes Dinámicas", 96, H - 110);
  ctx.fillStyle = INK;
  ctx.fillText("Topología de Redes Dinámicas", 96, H - 110);
  ctx.restore();

  return { x: xs[0], y: ys[0], reticle: true, top: LIGHT_THEME, bottom: LIGHT_THEME };
};

// ── Escena 6: cierre GEMINI STUDIO ─────────────────────────────────────────

const drawFinale = (ctx: Ctx, f: FrameInfo): SceneOut => {
  const { t, localFrame, beatPulse } = f;
  const cx = W / 2;
  const cy = H / 2;
  ctx.fillStyle = "#07070b";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 640);
  glow.addColorStop(0, `rgba(212, 255, 0, ${0.05 + 0.04 * beatPulse})`);
  glow.addColorStop(1, "rgba(212, 255, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // 5 anillos concéntricos con easeOutExpo escalonado
  for (let k = 0; k < 5; k++) {
    const e = easeOutExpo(clamp01((localFrame - k * 5) / 60));
    if (e <= 0) continue;
    const R = (170 + k * 88) * e + beatPulse * (k + 1) * 1.5;
    ctx.lineWidth = k === 0 ? 2 : 1.4;
    if (k % 2 === 1) {
      ctx.setLineDash([4, 10]);
      ctx.lineDashOffset = t * 30 * (k === 1 ? 1 : -1);
      ctx.strokeStyle = `rgba(212, 255, 0, ${0.45 * e})`;
    } else {
      ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.16 * e})`;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * e);
    ctx.stroke();
    if (k === 4) {
      ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * e})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let m = 0; m < 72; m++) {
        const a = (m / 72) * TAU + t * 0.1;
        const len = m % 6 === 0 ? 16 : 8;
        ctx.moveTo(cx + Math.cos(a) * (R + 10), cy + Math.sin(a) * (R + 10));
        ctx.lineTo(cx + Math.cos(a) * (R + 10 + len), cy + Math.sin(a) * (R + 10 + len));
      }
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);

  // Estrella de 8 puntas
  const sIn = easeOutBack(clamp01((localFrame - 16) / 30));
  const rot = t * 1.1;
  const outer = Math.max(0, 58 * (1 + 0.14 * beatPulse) * sIn);
  const starX = cx;
  const starY = cy - 175;
  ctx.save();
  ctx.shadowColor = LIME;
  ctx.shadowBlur = 30;
  ctx.fillStyle = LIME;
  ctx.beginPath();
  for (let v = 0; v < 16; v++) {
    const a = rot - Math.PI / 2 + (v / 16) * TAU;
    const r = v % 2 === 0 ? outer : outer * 0.42;
    if (v === 0) ctx.moveTo(starX + Math.cos(a) * r, starY + Math.sin(a) * r);
    else ctx.lineTo(starX + Math.cos(a) * r, starY + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const tIn = easeOutExpo(clamp01((localFrame - 24) / 50));
  ctx.save();
  ctx.globalAlpha = tIn;
  text(ctx, "GEMINI STUDIO", cx, cy + 50, `900 138px "${DISPLAY}"`, WHITE, "center", 30 * (1 - tIn) - 2);
  ctx.restore();

  const subIn = easeOutCubic(clamp01((localFrame - 46) / 36));
  ctx.save();
  ctx.globalAlpha = subIn;
  text(ctx, "creative coding & generative motion", cx, cy + 125, `400 30px "${MONO}"`, "rgba(255, 255, 255, 0.72)", "center", 5);
  ctx.fillStyle = LIME;
  ctx.fillRect(cx - 210 * subIn, cy + 160, 420 * subIn, 3);
  ctx.restore();

  const tipA = rot - Math.PI / 2;
  return {
    x: starX + Math.cos(tipA) * outer,
    y: starY + Math.sin(tipA) * outer,
    reticle: false,
    top: DARK_THEME,
    bottom: DARK_THEME,
  };
};

const SCENES = [drawFourier, drawKinetic, drawFlow, drawKnot, drawNetwork, drawFinale];

// ── HUD técnico ────────────────────────────────────────────────────────────

const coord = (v: number) => (v < 0 ? "-" : "") + Math.abs(v).toFixed(2).padStart(7, "0");

const drawHud = (ctx: Ctx, frame: number, scene: number, beatPulse: number, out: SceneOut) => {
  const font = `500 15px "${MONO}"`;
  const { top, bottom } = out;

  if (out.reticle) {
    ctx.strokeStyle = rgba(top.fg, 0.75);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(out.x, out.y, 16, 0, TAU);
    ctx.moveTo(out.x - 26, out.y);
    ctx.lineTo(out.x - 20, out.y);
    ctx.moveTo(out.x + 20, out.y);
    ctx.lineTo(out.x + 26, out.y);
    ctx.moveTo(out.x, out.y - 26);
    ctx.lineTo(out.x, out.y - 20);
    ctx.moveTo(out.x, out.y + 20);
    ctx.lineTo(out.x, out.y + 26);
    ctx.stroke();
  }

  ctx.fillStyle = top.accent;
  ctx.fillRect(48, 44, 10, 10);
  text(ctx, SCENE_NAMES[scene], 70, 55, font, rgba(top.fg, 0.9), "left", 2);
  text(ctx, `X ${coord(out.x)}   Y ${coord(out.y)}`, W / 2, 55, font, rgba(top.fg, 0.9), "center", 2);
  text(ctx, "128 BPM // SYNC LOCKED", W - 48, 55, font, rgba(top.fg, 0.9), "right", 2);
  const bpmWidth = ctx.measureText("128 BPM // SYNC LOCKED").width;
  ctx.fillStyle = rgba(top.accent, 0.5 + 0.5 * beatPulse);
  ctx.beginPath();
  ctx.arc(W - 48 - bpmWidth - 16, 50, 4 + 3 * beatPulse, 0, TAU);
  ctx.fill();

  text(ctx, `FRAME ${String(frame).padStart(4, "0")} / ${TOTAL_FRAMES}`, W - 48, H - 30, font, rgba(bottom.fg, 0.9), "right", 2);

  ctx.fillStyle = rgba(bottom.fg, 0.14);
  ctx.fillRect(0, H - 8, W, 8);
  ctx.fillStyle = bottom.accent;
  ctx.fillRect(0, H - 8, (W * (frame + 1)) / TOTAL_FRAMES, 8);
  ctx.fillStyle = rgba(bottom.fg, 0.5);
  for (let k = 1; k < SCENES.length; k++) ctx.fillRect((W * k) / SCENES.length - 1, H - 8, 2, 8);
};

const resetContext = (ctx: Ctx) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  ctx.letterSpacing = "0px";
};

const drawFrame = (ctx: Ctx, frame: number, fps: number) => {
  const t = frame / fps;
  const stepDuration = 60 / 128 / 2;
  const beatProgress = (t % stepDuration) / stepDuration;
  const beatPulse = Math.pow(1 - beatProgress, 3);

  const scene = Math.min(SCENES.length - 1, Math.floor(frame / SCENE_FRAMES));
  const localFrame = frame - scene * SCENE_FRAMES;
  const info: FrameInfo = { frame, t, localFrame, localT: localFrame / SCENE_FRAMES, beatPulse };

  resetContext(ctx);
  const out = SCENES[scene](ctx, info);
  resetContext(ctx);
  drawHud(ctx, frame, scene, beatPulse, out);
};

export const GeminiShowreel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("Cargando fuentes del canvas"));
  const [fontsReady, setFontsReady] = useState(false);
  const released = useRef(false);

  useEffect(() => {
    canvasFonts.then(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !fontsReady) return;
    drawFrame(ctx, frame, fps);
    if (!released.current) {
      released.current = true;
      continueRender(handle);
    }
  }, [frame, fps, fontsReady, handle]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#07080c" }}>
      <Audio src={staticFile("synth_beat.wav")} />
      <canvas ref={canvasRef} width={1920} height={1080} style={{ width, height }} />
    </AbsoluteFill>
  );
};
