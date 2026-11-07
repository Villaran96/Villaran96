/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";
import fs from "node:fs";
import path from "node:path";

// Chromium headless del sistema. La carpeta lleva el número de revisión (chromium_headless_shell-1243…),
// que cambia de una imagen a otra, así que se busca en vez de fijarla.
const findHeadlessShell = (): string | undefined => {
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

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
const browser = findHeadlessShell();
if (browser) Config.setBrowserExecutable(browser);
Config.setChromiumOpenGlRenderer("angle");
