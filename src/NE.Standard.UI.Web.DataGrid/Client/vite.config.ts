import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
    build: {
        emptyOutDir: true,
        outDir: "dist",
        lib: {
            entry: resolve(__dirname, "src/data-grid.ts"),
            formats: ["es"],
            fileName: () => "ui-data-grid.js",
            cssFileName: "ui-data-grid"
        }
    }
});
