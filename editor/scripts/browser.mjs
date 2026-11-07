// Localiza el Chromium headless del sistema (la carpeta lleva el número de revisión, que cambia entre imágenes).
import fs from "node:fs";
import path from "node:path";

export const findHeadlessShell = () => {
  const root = "/opt/pw-browsers";
  if (!fs.existsSync(root)) return undefined;
  for (const dir of fs.readdirSync(root).filter((d) => d.startsWith("chromium_headless_shell-")).sort().reverse()) {
    for (const rel of ["chrome-headless-shell-linux64/chrome-headless-shell", "chrome-linux/headless_shell"]) {
      const candidate = path.join(root, dir, rel);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return undefined;
};
