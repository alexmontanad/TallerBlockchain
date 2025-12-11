import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  server: {
    port: 4321,
    host: true,
  },

  // Configuración de preview (producción local)
  preview: {
    port: 8080,
    host: true,
  },

  // Vite config para Railway
  vite: {
    server: {
      host: "0.0.0.0",
    },
    preview: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: false,
    },
  },

  output: "static",
});
