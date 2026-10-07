// Motor mínimo de pixel art: paleta, fuente de mapa de bits 5×7, sprites y primitivas sobre un canvas de 180×320.

export const W = 180;
export const H = 320;
export const SCALE = 6;

export const PAL: Record<string, string> = {
  k: "#0b0b14",
  n: "#1b2340",
  N: "#2c3a66",
  p: "#4b2c5e",
  d: "#1f6f4a",
  o: "#8a4b2a",
  c: "#d9a066",
  g: "#5e5a66",
  l: "#b8b6c2",
  w: "#fff6ec",
  r: "#ea4335",
  y: "#fbbc05",
  G: "#34a853",
  b: "#4285f4",
  s: "#f2c49b",
  S: "#c98b5e",
  m: "#ff8fb1",
  h: "#e8cfa6",
  H: "#cdaf83",
  e: "#2a1d14",
  t: "#7ec8ff",
};

const GLYPHS: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".####"],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "#.#.#", ".#.#."],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", "..#..", ".#..."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "¡": ["..#..", ".....", "..#..", "..#..", "..#..", "..#..", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "¿": ["..#..", ".....", "..#..", ".#...", "#....", "#...#", ".###."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "*": ["..#..", "..#..", "#####", ".###.", ".#.#.", "#...#", "....."],
  "♥": [".....", ".#.#.", "#####", "#####", ".###.", "..#..", "....."],
  "▶": ["#....", "##...", "###..", "####.", "###..", "##...", "#...."],
  "©": [".###.", "#...#", "#.#.#", "##..#", "#.#.#", "#...#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
};

const ACCENTS: Record<string, [string, string[]]> = {
  Á: ["A", ["...#.", "..#.."]],
  É: ["E", ["...#.", "..#.."]],
  Í: ["I", ["...#.", "..#.."]],
  Ó: ["O", ["...#.", "..#.."]],
  Ú: ["U", ["...#.", "..#.."]],
  Ñ: ["N", [".##.#", "#..#."]],
  Ü: ["U", [".#.#.", "....."]],
};

export const fill = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = PAL[color] ?? color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

const drawBits = (ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, s: number) => {
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) if (row[rx] === "#") ctx.fillRect(Math.round(x + rx * s), Math.round(y + ry * s), s, s);
  });
};

export const textWidth = (text: string, s = 1) => text.length * 6 * s - s;

type TextOpts = {
  scale?: number;
  color?: string;
  shadow?: string;
  align?: "left" | "center" | "right";
  // Desplazamiento por letra (para ondas y saltos).
  offset?: (i: number) => { dx?: number; dy?: number; color?: string };
  max?: number;
};

export const text = (ctx: CanvasRenderingContext2D, str: string, x: number, y: number, opts: TextOpts = {}) => {
  const { scale = 1, color = "w", shadow, align = "left", offset, max } = opts;
  const s = str.toUpperCase();
  const w = textWidth(s, scale);
  let cx = align === "center" ? Math.round(x - w / 2) : align === "right" ? x - w : x;
  const count = max === undefined ? s.length : Math.max(0, Math.min(s.length, Math.floor(max)));
  for (let i = 0; i < count; i++) {
    const ch = s[i];
    const acc = ACCENTS[ch];
    const rows = GLYPHS[acc ? acc[0] : ch] ?? GLYPHS["?"];
    const o = offset ? offset(i) : {};
    const gx = cx + (o.dx ?? 0);
    const gy = y + (o.dy ?? 0);
    const draw = (dx: number, dy: number, col: string) => {
      ctx.fillStyle = PAL[col] ?? col;
      drawBits(ctx, rows, gx + dx, gy + dy, scale);
      if (acc) drawBits(ctx, acc[1], gx + dx, gy + dy - 3 * scale, scale);
    };
    if (shadow) draw(scale, scale, shadow);
    draw(0, 0, o.color ?? color);
    cx += 6 * scale;
  }
};

// Sprite a partir de filas de letras de la paleta ("." = transparente).
export const sprite = (ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, s = 1, flip = false, map?: Record<string, string>) => {
  const w = rows[0].length;
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < w; rx++) {
      const k = row[rx];
      if (k === ".") continue;
      const key = map?.[k] ?? k;
      ctx.fillStyle = PAL[key] ?? key;
      const px = flip ? w - 1 - rx : rx;
      ctx.fillRect(Math.round(x + px * s), Math.round(y + ry * s), s, s);
    }
  });
};

export const STAR = ["...k...", "..kyk..", "kkkyykk", "kyyyyyk", ".kyyyk.", "kyykyyk", "kk...kk"];
export const STAR_OFF = ["...k...", "..kgk..", "kkkggkk", "kgggggk", ".kgggk.", "kggkggk", "kk...kk"];
export const BIG_STAR = [
  "......kk......",
  ".....kyyk.....",
  ".....kyyk.....",
  "....kyyyyk....",
  "kkkkkyyyyykkkk",
  "kyyyyyyyyyyyyk",
  ".kyyyyyyywyyk.",
  "..kyyyyyywyk..",
  "...kyyyyyyk...",
  "..kyyyyyyyyk..",
  "..kyyykkyyyk..",
  ".kyyyk..kyyyk.",
  ".kyk......kyk.",
  ".kk........kk.",
];
export const HEART = [".kk.kk.", "kmmkmmk", "kmwmmmk", "kmmmmmk", ".kmmmk.", "..kmk..", "...k..."];
export const PHONE = ["kkk", "ktk", "ktk", "kkk"];
export const CUP = [".www.", "wwwwk", "wcwwk", "wwww.", ".ww.."];
export const CHEST_CLOSED = [
  "..kkkkkkkkkk..",
  ".kooooooooook.",
  "kooooooooooook",
  "kkkkkkkkkkkkkk",
  "kyyyyykkyyyyyk",
  "kooooookoooook",
  "kooooookoooook",
  "kooooookoooook",
  "kooooooooooook",
  "kkkkkkkkkkkkkk",
];
export const CHEST_BASE = CHEST_CLOSED.slice(3);
export const CHEST_LID = CHEST_CLOSED.slice(0, 4);

// Cliente (10×14): pelo, piel, camiseta, pantalón y zapatos. Tres poses: quieto, paso A y paso B.
const BODY_TOP = ["...hhhh...", "..hhhhhh..", "..hssssh..", "..sseses..", "..ssssss..", "...ssss...", "..cccccc..", ".cccccccc.", ".sccccccs.", ".sccccccs."];
export const CUSTOMER = {
  stand: [...BODY_TOP, "..cccccc..", "..pp..pp..", "..pp..pp..", "..ee..ee.."],
  walkA: [...BODY_TOP, "..cccccc..", "..pp..pp..", ".pp....pp.", ".ee....ee."],
  walkB: [...BODY_TOP, "..cccccc..", "...pppp...", "...pppp...", "...eeee..."],
  phone: [
    "...hhhh...",
    "..hhhhhh..",
    "..hssssh..",
    "..sseses..",
    "..ssssss.s",
    "...ssss..s",
    "..cccccccs",
    ".ccccccc..",
    ".scccccc..",
    ".scccccc..",
    "..cccccc..",
    "..pp..pp..",
    "..pp..pp..",
    "..ee..ee..",
  ],
};

export const HAIR = ["e", "o", "k", "y", "p", "S"];
export const SHIRTS = ["b", "r", "G", "y", "m", "p", "t"];

export const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3));
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

// Pseudoaleatorio estable.
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
