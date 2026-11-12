import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages serves the site from /<repo>/, so assets use relative paths.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
