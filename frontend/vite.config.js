import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Inside Docker Compose the services are reachable by their service names.
// For local development outside Docker, override these, for example:
//   BACKEND_URL=http://localhost:8000 AI_ENGINE_URL=http://localhost:8001 npm run dev
const backendTarget = process.env.BACKEND_URL ?? "http://backend:8000";
const aiEngineTarget = process.env.AI_ENGINE_URL ?? "http://ai-engine:8001";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/backend-api": {
        target: backendTarget,
        changeOrigin: true,
        // Live dashboard updates use a WebSocket on the backend.
        ws: true,
        rewrite: (path) => path.replace(/^\/backend-api/, ""),
      },
      "/ai-api": {
        target: aiEngineTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai-api/, ""),
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
  },
});
