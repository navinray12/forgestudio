import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, "/");
          if (normalizedId.includes("/node_modules/")) {
            if (
              normalizedId.includes("/node_modules/react/") ||
              normalizedId.includes("/node_modules/react-dom/") ||
              normalizedId.includes("/node_modules/react-router-dom/") ||
              normalizedId.includes("/node_modules/react-router/")
            ) {
              return "vendor-react";
            }
            if (normalizedId.includes("/node_modules/lucide-react/")) {
              return "vendor-icons";
            }
            if (
              normalizedId.includes("/node_modules/dompurify/") ||
              normalizedId.includes("/node_modules/canvas-confetti/")
            ) {
              return "vendor-utils";
            }
            if (
              normalizedId.includes("/node_modules/@monaco-editor/") ||
              normalizedId.includes("/node_modules/monaco-editor/")
            ) {
              return "vendor-monaco";
            }
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  }
});