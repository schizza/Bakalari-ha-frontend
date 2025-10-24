import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/main.ts",
      name: "BakalariCards",
      formats: ["es"],
      fileName: () => "bakalari-cards.js"
    },
    outDir: "dist",
    sourcemap: true
  }
});
