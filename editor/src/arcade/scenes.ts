import type { DrawFn } from "./PixelScene";
import { pixelate } from "./PixelScene";
import { BIG_STAR, CHEST_BASE, CHEST_LID, CUP, CUSTOMER, H, HAIR, HEART, PAL, PHONE, SHIRTS, STAR, STAR_OFF, W, clamp01, ease, fill, rnd, sprite, text } from "./pixel";
import timeline from "./timeline.json";

const cue = timeline.cues;
const TYPE = timeline.typeSpeed;
const CARD_PAL = ["w", "k", "r", "y", "G", "b", "l", "g", "t"];
const RAINBOW = ["r", "y", "G", "b"];

// ---------- piezas comunes ----------
const starfield = (ctx: CanvasRenderingContext2D, f: number, speed = 0.6) => {
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(rnd(i) * W);
    const depth = 0.3 + rnd(i + 99) * 0.7;
    const y = Math.floor((rnd(i + 7) * H + f * speed * depth) % H);
    const tw = (f + i * 5) % 40 < 4;
    fill(ctx, x, y, 1, 1, tw ? "y" : depth > 0.7 ? "w" : "l");
  }
};

const rect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
  fill(ctx, x, y, w, 1, color);
  fill(ctx, x, y + h - 1, w, 1, color);
  fill(ctx, x, y, 1, h, color);
  fill(ctx, x + w - 1, y, 1, h, color);
};

const pad3 = (n: number) => String(n).padStart(3, "0");

const hud = (ctx: CanvasRenderingContext2D, reviews: number, stars: number, alarm = false, f = 0) => {
  fill(ctx, 0, 0, W, 22, "k");
  text(ctx, "TU NEGOCIO", 4, 3, { color: "w" });
  for (let i = 0; i < 5; i++) sprite(ctx, i < stars ? STAR : STAR_OFF, 4 + i * 9, 12);
  const red = alarm && Math.floor(f / 4) % 2 === 0;
  text(ctx, `RESEÑAS ${pad3(reviews)}`, 176, 5, { align: "right", color: red ? "r" : "y" });
};

const wrap = (str: string, max = 26) => {
  const words = str.split(" ");
  const lines: string[] = [];
  let line = "";
  words.forEach((w) => {
    if ((line + " " + w).trim().length > max) {
      lines.push(line.trim());
      line = w;
    } else line = `${line} ${w}`;
  });
  if (line.trim()) lines.push(line.trim());
  return lines;
};

const dialog = (ctx: CanvasRenderingContext2D, f: number, items: { at: number; text: string }[]) => {
  const current = [...items].reverse().find((d) => f >= d.at);
  fill(ctx, 2, 264, W - 4, 54, "k");
  rect(ctx, 4, 266, W - 8, 50, "w");
  rect(ctx, 6, 268, W - 12, 46, "g");
  if (!current) return;
  const shown = (f - current.at) / TYPE;
  let used = 0;
  wrap(current.text).forEach((line, i) => {
    text(ctx, line, 12, 276 + i * 13, { max: shown - used, color: "w" });
    used += line.length + 1;
  });
  if (shown > current.text.length + 2 && Math.floor(f / 6) % 2 === 0) text(ctx, "▶", 164, 302, { color: "y" });
};

const banner = (ctx: CanvasRenderingContext2D, f: number, [a, b]: number[], title: string, sub: string) => {
  if (f >= b + 8) return;
  const up = clamp01((f - b) / 8);
  const y0 = -Math.round(ease(up) * H);
  fill(ctx, 0, y0, W, H, "k");
  starfield(ctx, f + 300, 0.3);
  if (f < a) return;
  const drop = ease(clamp01((f - a) / 8));
  text(ctx, title, W / 2, y0 + 120 - Math.round((1 - drop) * 40), { scale: 3, align: "center", color: "y", shadow: "r" });
  if (f > a + 8) text(ctx, sub, W / 2, y0 + 160, { align: "center", color: "w" });
};

const shop = (ctx: CanvasRenderingContext2D, f: number) => {
  // Pared de ladrillo, ventana con nubes, letrero y estante.
  fill(ctx, 0, 22, W, 182, "h");
  for (let y = 30; y < 200; y += 10) {
    fill(ctx, 0, y, W, 1, "H");
    for (let x = (y / 10) % 2 ? 0 : 10; x < W; x += 20) fill(ctx, x, y - 9, 1, 9, "H");
  }
  fill(ctx, 12, 46, 64, 66, "o");
  fill(ctx, 15, 49, 58, 60, "t");
  const cx = ((f * 0.25) % 90) - 20;
  fill(ctx, 15 + Math.max(0, cx), 62, Math.max(0, Math.min(22, 58 - cx)), 6, "w");
  fill(ctx, 19 + Math.max(0, cx), 58, Math.max(0, Math.min(12, 54 - cx)), 4, "w");
  fill(ctx, 43, 49, 2, 60, "o");
  fill(ctx, 15, 78, 58, 2, "o");
  fill(ctx, 96, 32, 76, 26, "k");
  rect(ctx, 97, 33, 74, 24, "o");
  const flicker = (f % 70) > 64 ? "p" : "m";
  text(ctx, "CAFÉ", 134, 40, { scale: 2, align: "center", color: flicker });
  fill(ctx, 100, 82, 70, 3, "o");
  for (let i = 0; i < 4; i++) sprite(ctx, CUP, 104 + i * 17, 77);
  // Suelo y zócalo.
  fill(ctx, 0, 200, W, 4, "o");
  for (let y = 204; y < 264; y += 10) for (let x = 0; x < W; x += 10) fill(ctx, x, y, 10, 10, ((x + y) / 10) % 2 ? "w" : "l");
  // Planta.
  fill(ctx, 4, 186, 12, 14, "o");
  fill(ctx, 2, 170, 6, 16, "G");
  fill(ctx, 9, 164, 6, 22, "d");
  fill(ctx, 14, 172, 4, 14, "G");
};

const counterFront = (ctx: CanvasRenderingContext2D) => {
  fill(ctx, 92, 164, 88, 6, "c");
  fill(ctx, 92, 170, 88, 34, "o");
  for (let x = 98; x < 180; x += 20) rect(ctx, x, 174, 16, 26, "e");
  // Cafetera.
  fill(ctx, 154, 138, 20, 26, "g");
  fill(ctx, 154, 136, 20, 3, "l");
  fill(ctx, 162, 150, 4, 4, "k");
  sprite(ctx, CUP, 160, 156);
};

const barista = (ctx: CanvasRenderingContext2D, f: number) => {
  const bob = Math.floor(f / 10) % 2;
  sprite(ctx, CUSTOMER.stand, 122, 136 + bob, 2, true, { h: "k", c: "w" });
};

const customer = (ctx: CanvasRenderingContext2D, x: number, pose: keyof typeof CUSTOMER, flip: boolean, seed: number, bob = 0) => {
  sprite(ctx, CUSTOMER[pose], Math.round(x), 208 + bob, 2, flip, { h: HAIR[seed % HAIR.length], c: SHIRTS[seed % SHIRTS.length] });
};

const STAND_X = 66;

// Recorrido de un cliente: entra, se queda en la barra y se va. sp > 1 = cámara rápida.
const walker = (f: number, t0: number, sp = 1, stay = 18) => {
  const t = (f - t0) * sp;
  if (t < 0) return null;
  const walkIn = 16;
  const out0 = walkIn + stay;
  if (t < walkIn) return { x: -24 + (STAND_X + 24) * (t / walkIn), pose: (Math.floor(t / 3) % 2 ? "walkA" : "walkB") as keyof typeof CUSTOMER, flip: false, phase: "in" as const, t };
  if (t < out0) return { x: STAND_X, pose: "stand" as keyof typeof CUSTOMER, flip: false, phase: "stay" as const, t };
  const k = (t - out0) / 16;
  if (k > 1) return null;
  return { x: STAND_X - (STAND_X + 30) * k, pose: (Math.floor(t / 3) % 2 ? "walkA" : "walkB") as keyof typeof CUSTOMER, flip: true, phase: "out" as const, t };
};

const dissolve = (ctx: CanvasRenderingContext2D, p: number) => {
  for (let by = 0; by < H; by += 10) for (let bx = 0; bx < W; bx += 10) if (rnd(bx * 7 + by * 13) < p) fill(ctx, bx, by, 10, 10, "k");
};

// ---------- escenas ----------
export const drawTitle: DrawFn = (ctx, f) => {
  const c = cue.title;
  fill(ctx, 0, 0, W, H, "n");
  starfield(ctx, f, 0.8);
  // Planeta al fondo.
  for (let y = -30; y <= 30; y++) {
    const w = Math.round(Math.sqrt(900 - y * y));
    fill(ctx, 140 - w, 270 + y, w * 2, 1, y < -10 ? "N" : "p");
  }
  if (f < c.titleIn) {
    const k = clamp01(f / 10) * clamp01((c.titleIn - f) / 8);
    const col = k < 0.34 ? "g" : k < 0.67 ? "l" : "w";
    text(ctx, "CIERZO NFC", W / 2, 140, { scale: 2, align: "center", color: col });
    text(ctx, "PRESENTA", W / 2, 162, { align: "center", color: col });
    return;
  }
  const t = f - c.titleIn;
  const drop = ease(clamp01(t / 12));
  const wave = (i: number) => ({ dy: Math.round(Math.sin((f + i * 4) / 5) * 2), color: RAINBOW[(i + Math.floor(f / 6)) % 4] });
  text(ctx, "MISIÓN", W / 2, 70 - Math.round((1 - drop) * 90), { scale: 4, align: "center", shadow: "k", offset: wave });
  text(ctx, "5 ESTRELLAS", W / 2, 110 - Math.round((1 - drop) * 90), { scale: 2, align: "center", color: "w", shadow: "k" });
  // Estrella que gira (giro "de píxel": se estrecha y se ensancha).
  const spin = Math.abs(Math.cos(f / 9));
  const sw = Math.max(1, Math.round(42 * spin));
  const sc = document.createElement("canvas");
  sc.width = 14;
  sc.height = 14;
  sprite(sc.getContext("2d")!, BIG_STAR, 0, 0, 1);
  const bounce = Math.round(Math.abs(Math.sin(f / 8)) * 8);
  ctx.drawImage(sc, Math.round(W / 2 - sw / 2), 150 - bounce, sw, 42);
  if (t > 10 && (f < c.start ? Math.floor(f / 8) % 2 === 0 : Math.floor(f / 2) % 2 === 0)) {
    text(ctx, "PULSA START", W / 2, 230, { align: "center", color: f >= c.start ? "y" : "w" });
  }
  text(ctx, "© 2026 CIERZO NFC", W / 2, 300, { align: "center", color: "l" });
  if (f >= c.flash) {
    const k = clamp01((f - c.flash) / 6);
    if (k < 0.5) fill(ctx, 0, 0, W, H, "w");
    else dissolve(ctx, (k - 0.5) * 2);
  }
};

export const drawLevel1: DrawFn = (ctx, f) => {
  const c = cue.level1;
  shop(ctx, f);
  barista(ctx, f);
  c.customers.forEach((t0, i) => {
    const wk = walker(f, t0, 1, 20);
    if (!wk) return;
    const bob = wk.phase === "stay" ? 0 : Math.floor(wk.t / 3) % 2;
    customer(ctx, wk.x, wk.pose, wk.flip, i + 1, bob);
    if (wk.phase === "stay") {
      const st = wk.t - 16;
      if (st > 2) sprite(ctx, CUP, STAND_X + 22, 158);
      if (st > 4 && st < 18) sprite(ctx, HEART, STAND_X + 6, 196 - Math.min(6, st - 4), 1);
      if (st > 12) text(ctx, "...", STAND_X + 2, 186, { color: "g" });
    }
  });
  counterFront(ctx);
  hud(ctx, 0, 0, f >= c.alarm, f);
  dialog(ctx, f, c.dialog);
  banner(ctx, f, c.banner, "NIVEL 1", "LA CAFETERÍA");
  if (f >= c.dissolve) dissolve(ctx, clamp01((f - c.dissolve) / 16));
};

const rays = (ctx: CanvasRenderingContext2D, f: number, cx: number, cy: number, a: string, b: string) => {
  const img = ctx.getImageData(0, 0, W, H);
  const ca = PAL[a];
  const cb = PAL[b];
  const A = [parseInt(ca.slice(1, 3), 16), parseInt(ca.slice(3, 5), 16), parseInt(ca.slice(5, 7), 16)];
  const B = [parseInt(cb.slice(1, 3), 16), parseInt(cb.slice(3, 5), 16), parseInt(cb.slice(5, 7), 16)];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ang = Math.atan2(y - cy, x - cx) + f * 0.03;
      const band = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 16) % 2;
      const col = band ? A : B;
      const i = (y * W + x) * 4;
      img.data[i] = col[0];
      img.data[i + 1] = col[1];
      img.data[i + 2] = col[2];
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
};

const sparkle = (ctx: CanvasRenderingContext2D, x: number, y: number, f: number, seed: number, color = "w") => {
  const k = (f + seed * 7) % 20;
  if (k > 10) return;
  const r = k < 5 ? k / 2 : (10 - k) / 2;
  fill(ctx, x, y - r, 1, r * 2 + 1, color);
  fill(ctx, x - r, y, r * 2 + 1, 1, color);
};

export const drawPowerup: DrawFn = (ctx, f, assets) => {
  const c = cue.powerup;
  rays(ctx, f, W / 2, 110, "n", "k");
  const shake = f >= c.shake && f < c.open ? (f % 2 ? 1 : -1) : 0;
  const lid = f >= c.open ? Math.min(10, (f - c.open) * 2) : 0;
  // Cono de luz con trama de puntos que sale del cofre.
  if (f >= c.open) {
    const glow = Math.min(1, (f - c.open) / 6);
    for (let y = 30; y < 200; y++) {
      const half = Math.round((12 + (200 - y) * 0.22) * glow);
      for (let x = W / 2 - half; x < W / 2 + half; x++) {
        const edge = Math.abs(x - W / 2) / Math.max(1, half);
        if (edge > 0.55 && (x + y + f) % 2) continue;
        fill(ctx, x, y, 1, 1, edge < 0.25 ? "w" : "y");
      }
    }
  }
  sprite(ctx, CHEST_BASE, 62 + shake, 200, 4);
  sprite(ctx, CHEST_LID, 62 + shake, 188 - lid, 4);
  // La tarjeta sale del cofre girando y se queda en el centro.
  if (f >= c.open) {
    const t = clamp01((f - c.open) / (c.land - c.open));
    const size = Math.round(32 + 64 * ease(t));
    const y = Math.round(196 - (196 - 58) * ease(t)) - (f >= c.land ? Math.round(Math.sin((f - c.land) / 6) * 2) : 0);
    const spin = f < c.land ? Math.abs(Math.cos(t * Math.PI * 3)) : 1;
    const card = pixelate(assets.card, 48, 48, CARD_PAL);
    const w = Math.max(2, Math.round(size * spin));
    fill(ctx, Math.round(W / 2 - w / 2) - 2, y - 2, w + 4, size + 4, "k");
    ctx.drawImage(card, Math.round(W / 2 - w / 2), y, w, size);
    for (let i = 0; i < 6; i++) sparkle(ctx, 30 + Math.round(rnd(i) * 120), 50 + Math.round(rnd(i + 3) * 120), f, i, i % 2 ? "y" : "w");
  }
  if (f >= c.text[0]) text(ctx, "HAS CONSEGUIDO", W / 2, 34, { align: "center", color: "w", shadow: "k" });
  if (f >= c.text[1]) text(ctx, "TARJETA NFC", W / 2, 244, { scale: 2, align: "center", color: "y", shadow: "r" });
  if (f >= c.text[2]) text(ctx, "DE RESEÑAS", W / 2, 266, { scale: 2, align: "center", color: "w", shadow: "k" });
  if (f >= c.blinds) {
    const k = clamp01((f - c.blinds) / 12);
    for (let y = 0; y < H; y += 8) fill(ctx, 0, y, W, Math.ceil(8 * k), "k");
  }
};

const arcs = (ctx: CanvasRenderingContext2D, x: number, y: number, t: number) => {
  for (let k = 0; k < 3; k++) {
    const r = 4 + k * 5 + Math.floor(t / 2);
    if (t - k * 2 < 0 || t > 14) continue;
    for (let a = -0.9; a <= 0.9; a += 0.08) {
      fill(ctx, x - Math.round(Math.cos(a) * r), y + Math.round(Math.sin(a) * r), 1, 1, RAINBOW[k + 1]);
    }
  }
};

export const drawLevel2: DrawFn = (ctx, f, assets) => {
  const c = cue.level2;
  shop(ctx, f);
  barista(ctx, f);
  const speeds = [1, 1, 1.3, 1.6, 2, 2.4];
  // Llegadas de estrellas al marcador.
  let reviews = 0;
  const flying: { x: number; y: number }[] = [];
  const pops: { x: number; y: number; t: number }[] = [];
  c.customers.forEach((t0, i) => {
    const sp = speeds[i];
    const tap = t0 + 22 / sp;
    const arrive = tap + 18 / sp;
    if (f >= arrive) reviews++;
    else if (f >= tap + 2 / sp) {
      const k = clamp01((f - tap - 2 / sp) / (16 / sp));
      const sx = 105;
      const sy = 150;
      const ex = 8 + Math.min(reviews, 4) * 9;
      const ey = 12;
      flying.push({ x: sx + (ex - sx) * ease(k), y: sy + (ey - sy) * ease(k) - Math.sin(k * Math.PI) * 30 });
    }
    if (f >= tap && f < tap + 12) pops.push({ x: 92, y: 140, t: f - tap });
  });
  c.customers.forEach((t0, i) => {
    const sp = speeds[i];
    const wk = walker(f, t0, sp, 22);
    if (!wk) return;
    const tapping = wk.phase === "stay" && wk.t >= 18 && wk.t < 30;
    const bob = wk.phase === "stay" ? 0 : Math.floor(wk.t / 3) % 2;
    customer(ctx, wk.x, tapping ? "phone" : wk.pose, wk.flip, i + 3, bob);
    if (tapping) {
      // El brazo sube el móvil hasta la tarjeta de la barra.
      const reach = clamp01((wk.t - 18) / 3);
      const py = Math.round(206 - (206 - 160) * ease(reach));
      fill(ctx, STAND_X + 20, py + 6, 2, 210 - py, "s");
      sprite(ctx, PHONE, STAND_X + 18, py, 2);
    }
  });
  counterFront(ctx);
  // La tarjeta de pie sobre la barra.
  const card = pixelate(assets.card, 16, 16, CARD_PAL);
  fill(ctx, 97, 147, 18, 18, "k");
  ctx.drawImage(card, 98, 148);
  fill(ctx, 101, 164, 10, 2, "k");
  sparkle(ctx, 114, 146, f, 2, "y");
  c.customers.forEach((t0, i) => {
    const tap = t0 + 22 / speeds[i];
    if (f >= tap && f < tap + 16) arcs(ctx, 96, 156, f - tap);
  });
  pops.forEach((p) => text(ctx, "+1", p.x, p.y - p.t, { color: p.t % 4 < 2 ? "y" : "w", shadow: "k" }));
  flying.forEach((s) => sprite(ctx, STAR, Math.round(s.x), Math.round(s.y)));
  hud(ctx, reviews, Math.min(5, reviews));
  if (reviews >= 2) {
    text(ctx, `COMBO X${reviews}`, 176, 14, { align: "right", offset: (i) => ({ color: RAINBOW[(i + Math.floor(f / 3)) % 4] }) });
  }
  if (f >= c.fastForward && Math.floor(f / 6) % 2 === 0) text(ctx, "▶▶ X4", 6, 30, { color: "w", shadow: "k" });
  dialog(ctx, f, c.dialog);
  banner(ctx, f, c.banner, "NIVEL 2", "CON TARJETA NFC");
  if (f >= c.flash) fill(ctx, 0, 0, W, H, (f - c.flash) % 4 < 2 ? "w" : "y");
};

export const drawClear: DrawFn = (ctx, f) => {
  const c = cue.clear;
  fill(ctx, 0, 0, W, H, "n");
  starfield(ctx, f, 1.2);
  if (f >= c.titleIn) {
    const k = ease(clamp01((f - c.titleIn) / 10));
    const wave = (i: number) => ({ dy: Math.round(Math.sin((f + i * 3) / 4) * 2), color: RAINBOW[(i + Math.floor(f / 4)) % 4] });
    text(ctx, "NIVEL", W / 2, 46 - Math.round((1 - k) * 60), { scale: 3, align: "center", shadow: "k", offset: wave });
    text(ctx, "SUPERADO", W / 2, 72 - Math.round((1 - k) * 60), { scale: 3, align: "center", shadow: "k", offset: wave });
  }
  c.stars.forEach((at, i) => {
    const x = W / 2 + (i - 2) * 32;
    if (f < at) {
      sprite(ctx, STAR_OFF, x - 7, 120, 2);
      return;
    }
    const big = f - at < 3 ? 3 : 2;
    sprite(ctx, BIG_STAR, x - 7 * big, 126 - 7 * big, big);
    if (f - at < 8) sparkle(ctx, x + 14, 112, f, i, "w");
  });
  const stats = [
    ["APPS NECESARIAS", "0"],
    ["PILAS", "0"],
    ["TOQUES", "1"],
  ];
  stats.forEach(([label, value], i) => {
    const at = c.stats[i];
    if (f < at) return;
    const dots = ".".repeat(Math.max(2, 24 - label.length - value.length));
    text(ctx, `${label}${dots}${value}`, 14, 182 + i * 18, { max: (f - at) * 2, color: i === 2 ? "y" : "w" });
  });
  if (f > c.stars[0]) {
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(rnd(i * 3) * W);
      const y = Math.floor(((f - c.stars[0]) * (1.5 + rnd(i) * 2) + rnd(i + 5) * 60) % H);
      fill(ctx, x, y, 2, 2, RAINBOW[i % 4]);
    }
  }
};

export const drawContinue: DrawFn = (ctx, f, assets) => {
  const c = cue.continue;
  fill(ctx, 0, 0, W, H, "k");
  starfield(ctx, f, 0.4);
  if (Math.floor(f / 10) % 2 === 0 || f > c.lines[1]) text(ctx, "¿CONTINUAR?", W / 2, 34, { scale: 2, align: "center", color: "w" });
  if (f >= c.card) {
    const k = ease(clamp01((f - c.card) / 10));
    const size = Math.round(64 * k);
    const y = 66 + Math.round(Math.sin(f / 8) * 3);
    const card = pixelate(assets.card, 32, 32, CARD_PAL);
    if (size > 2) {
      fill(ctx, Math.round(W / 2 - size / 2) - 2, y - 2, size + 4, size + 4, "y");
      ctx.drawImage(card, Math.round(W / 2 - size / 2), y, size, size);
    }
  }
  if (f >= c.lines[0]) text(ctx, "PIDE TUS TARJETAS", W / 2, 156, { align: "center", color: "y", max: (f - c.lines[0]) * 2 });
  if (f >= c.lines[1]) {
    text(ctx, "CIERZO NFC", W / 2, 178, { scale: 2, align: "center", shadow: "n", offset: (i) => ({ color: RAINBOW[(i + Math.floor(f / 5)) % 4] }) });
    const logo = pixelate(assets.logo, 33, 24, ["k", "b", "G", "t", "d", "N"]);
    ctx.drawImage(logo, Math.round(W / 2 - 33), 210, 66, 48);
  }
  if (f >= c.blink && Math.floor(f / 8) % 2 === 0) text(ctx, "PULSA START", W / 2, 292, { align: "center", color: "w" });
};
