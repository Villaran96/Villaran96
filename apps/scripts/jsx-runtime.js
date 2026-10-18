// Sustituto de react/jsx-runtime para la build de artefacto, donde React llega como global desde cdnjs
// (la build UMD de React no expone el runtime automático de JSX).
import React from "react";

export const Fragment = React.Fragment;

export function jsx(type, props, key) {
  return React.createElement(type, key === undefined ? props : { ...props, key });
}

export const jsxs = jsx;
