// Renderiza varios fotogramas con un único bundle y los junta en una hoja de contactos.
// Uso: node scripts/stills.mjs <salida.png> Comp:frame [Comp:frame ...]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const [out, ...specs] = process.argv.slice(2);
if (!out || specs.length === 0) {
  console.error("Uso: node scripts/stills.mjs <salida.png> Comp:frame ...");
  process.exit(1);
}

const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const chromiumOptions = { gl: "angle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const dir = mkdtempSync(path.join(tmpdir(), "stills-"));
const files = [];

for (const [i, spec] of specs.entries()) {
  const [id, frame] = spec.split(":");
  const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions });
  const file = path.join(dir, `${String(i).padStart(2, "0")}.png`);
  await renderStill({ composition, serveUrl, output: file, frame: Number(frame), browserExecutable, chromiumOptions, scale: 0.5 });
  files.push(file);
  console.log(`${spec} -> ok`);
}

// Pillow normaliza RGB/RGBA (ffmpeg corta la secuencia si cambia el formato de píxel).
execFileSync("python3", [
  "-c",
  `import sys
from PIL import Image
out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert("RGB") for f in files]
w, h = ims[0].size
cols = min(4, len(ims)); rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w + (cols - 1) * 8, rows * h + (rows - 1) * 8), "white")
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * (w + 8), (i // cols) * (h + 8)))
sheet.save(out)`,
  out,
  ...files,
]);
console.log(`hoja -> ${out}`);
