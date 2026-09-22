/**
 * @file Vite config: frontend module support.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      react: path.resolve(import.meta.dirname, "./node_modules/react"),
      "react-dom": path.resolve(import.meta.dirname, "./node_modules/react-dom"),
      "react-router-dom": path.resolve(import.meta.dirname, "./node_modules/react-router-dom"),
    },
    dedupe: ["react", "react-dom", "react-router-dom", "react-router"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
  },
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


