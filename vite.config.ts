import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./client/src") } },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    // The embedding runtime is large and only needed once an analysis starts,
    // so it stays a chunk of its own instead of joining the entry bundle.
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes("@huggingface/transformers") ? "transformers" : undefined),
      },
    },
  },
  optimizeDeps: { exclude: ["@huggingface/transformers"] },
  worker: { format: "es" },
  server: { port: 3000, host: true },
});
