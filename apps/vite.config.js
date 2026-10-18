import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Servidor de desarrollo: cada app vive en su carpeta (/mi-vida/, /asesor-financiero/...).
// La build de un solo archivo está en scripts/build.mjs.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
