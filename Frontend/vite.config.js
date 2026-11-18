import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const ALVO_BACKEND = process.env.VITE_PROXY_TARGET || "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.test.{js,jsx}"],
  },
  server: {
    proxy: {
      "/api": {
        target: ALVO_BACKEND,
        changeOrigin: true,
        rewrite: (caminho) => caminho.replace(/^\/api/, ""),
      },
    },
  },
});
