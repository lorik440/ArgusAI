import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/backend-api": {
        target: "http://backend:8000",
        rewrite: (path) => path.replace(/^\/backend-api/, ""),
      },
      "/ai-api": {
        target: "http://ai-engine:8001",
        rewrite: (path) => path.replace(/^\/ai-api/, ""),
      },
    },
  },
});
