import type React from "react";
import type { SceneCtx } from "../types";
import { OCEAN_SCENES } from "./ocean";

/** Registro de escenas: el campo `scene` del guion elige el componente. Cada nicho añade el suyo aquí. */
export const SCENES: Record<string, React.FC<SceneCtx>> = {
  ...OCEAN_SCENES,
};
