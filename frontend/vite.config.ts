import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Lamha frontend build config.
// VITE_API_BASE_URL points at the deployed Worker (set in Netlify env vars);
// falls back to a local wrangler dev URL for local development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
