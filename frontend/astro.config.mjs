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
    host: true,
  },
  vite: {
    server: {
      allowedHosts: true, // Permitir todos los hosts
    },
  },
  output: "static",
});
