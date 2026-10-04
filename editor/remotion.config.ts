/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";
import { existsSync } from "node:fs";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Contenedor cloud de Claude Code: usa el Chromium ya instalado en vez de descargar uno.
// En tu máquina este fichero no existe y Remotion usa su propio navegador.
const CLOUD_HEADLESS_SHELL =
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
if (existsSync(CLOUD_HEADLESS_SHELL)) {
  Config.setBrowserExecutable(CLOUD_HEADLESS_SHELL);
}
