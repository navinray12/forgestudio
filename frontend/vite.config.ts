/**
 * @file Vite config: frontend module support.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  build: { manifest: true },
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    strictPort: true,
  }
});
