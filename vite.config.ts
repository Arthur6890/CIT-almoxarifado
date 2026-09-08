import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-icon.svg"],
      manifest: {
        name: "CIT - Almoxarifado",
        short_name: "CIT Almox",
        description: "Sistema de controle de almoxarifado",
        theme_color: "#1976d2",
        background_color: "#f5f7fa",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "pwa-icon.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "pwa-icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
          {
            src: "pwa-icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
