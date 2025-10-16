import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const target = (process.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(
  /\/$/,
  ""
);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target,
        changeOrigin: true,
        secure: false,
      },
      "/quiz": {
        target,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
