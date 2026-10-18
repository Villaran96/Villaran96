// Genera cada app como un único archivo HTML con todo incluido.
//
//   node scripts/build.mjs             -> dist/<app>/index.html (React dentro; se abre con doble clic)
//   node scripts/build.mjs --artifact  -> dist-artifact/<app>.html (fragmento para publicar en claude.ai:
//                                         React desde cdnjs y sin <html>/<head>/<body> propios)
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ALL = ["mi-vida", "asesor-financiero", "entrenador-ia", "segundo-cerebro"];
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const APPS = ONLY.length ? ALL.filter((a) => ONLY.includes(a)) : ALL;
const ARTIFACT = process.argv.includes("--artifact");
const OUT = path.join(ROOT, ARTIFACT ? "dist-artifact" : "dist");

const REACT_CDN = ["https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js", "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"];

// Una build completa empieza de cero; una parcial solo sustituye las apps pedidas.
if (!ONLY.length) await rm(OUT, { recursive: true, force: true });

for (const app of APPS) {
  const tmp = path.join(OUT, ".tmp", app);
  await build({
    root: ROOT,
    configFile: false,
    logLevel: "warn",
    plugins: [react(), tailwindcss(), viteSingleFile({ removeViteModuleLoader: true })],
    resolve: ARTIFACT ? { alias: { "react/jsx-runtime": path.join(ROOT, "scripts/jsx-runtime.js") } } : {},
    build: {
      outDir: tmp,
      emptyOutDir: true,
      modulePreload: false,
      rollupOptions: {
        input: path.join(ROOT, app, "index.html"),
        ...(ARTIFACT && {
          external: ["react", "react-dom", "react-dom/client"],
          output: {
            format: "iife",
            globals: { react: "React", "react-dom": "ReactDOM", "react-dom/client": "ReactDOM" },
          },
        }),
      },
    },
  });

  const html = await readFile(path.join(tmp, app, "index.html"), "utf8");
  if (ARTIFACT) {
    await writeFile(path.join(OUT, `${app}.html`), toFragment(html));
  } else {
    await mkdir(path.join(OUT, app), { recursive: true });
    await writeFile(path.join(OUT, app, "index.html"), html);
  }
  console.log(`✓ ${app}`);
}

await rm(path.join(OUT, ".tmp"), { recursive: true, force: true });
if (!ARTIFACT) await copyFile(path.join(ROOT, "index.html"), path.join(OUT, "index.html"));

// El publicador de artefactos envuelve la página en su propio esqueleto: nos quedamos con el título,
// las fuentes, los estilos y el código, y React se carga antes que el script de la app.
function toFragment(html) {
  const pick = (re) => [...html.matchAll(re)].map((m) => m[0]);
  const title = pick(/<title>[\s\S]*?<\/title>/g);
  const links = pick(/<link\b[^>]*fonts\.(?:googleapis|gstatic)\.com[^>]*>/g);
  const styles = pick(/<style\b[^>]*>[\s\S]*?<\/style>/g);
  const scripts = pick(/<script\b[^>]*>[\s\S]*?<\/script>/g);
  const body = html
    .match(/<body[^>]*>([\s\S]*?)<\/body>/)[1]
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
    .trim();
  return [
    ...title,
    '<meta name="claude:viewport-fit-sides" content="cover">',
    ...links,
    ...styles,
    body,
    ...REACT_CDN.map((src) => `<script src="${src}" crossorigin="anonymous"></script>`),
    ...scripts.map((s) => s.replace(/<script\b[^>]*>/, "<script>")),
    "",
  ].join("\n");
}
