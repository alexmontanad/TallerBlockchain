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
      allowedHosts: true, // Para desarrollo
    },
    preview: {
      allowedHosts: true, // ✅ Para producción (Railway)
      host: true,
      port: parseInt(process.env.PORT || "4321"),
    },
  },
  output: "static",
});
