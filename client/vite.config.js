import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: the React app runs on 5173 and proxies /api to the Node server on 3000.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": { target: "http://localhost:3000", changeOrigin: true } } }
});
