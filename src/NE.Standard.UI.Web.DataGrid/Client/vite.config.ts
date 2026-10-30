import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
    build: {
        emptyOutDir: true,
        outDir: "dist",
        modulePreload: false,
        cssCodeSplit: false,
        rolldownOptions: {
            input: resolve(import.meta.dirname, "src/data-grid.ts"),
            output: {
                entryFileNames: "ui-data-grid.js",
                assetFileNames: "ui-data-grid[extname]"
            }
        }
    }
});
