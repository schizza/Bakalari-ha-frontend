import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/main.ts",
      formats: ["es"],
      fileName: () => "bakalari-cards.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        compact: true,
      },
    },
    outDir: "dist",
    sourcemap: true,
    minify: "esbuild",
    target: "es2020",
  },
  esbuild: {
    minifyIdentifiers: true,
    minifyWhitespace: true,
    minifySyntax: true,
  },
});
