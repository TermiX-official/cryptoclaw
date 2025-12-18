import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/ui/",
  build: {
    outDir: path.resolve(here, "../dist/control-ui"),
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
});
