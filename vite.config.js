import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { apiLocal } from "./scripts/api-local.mjs";

export default defineConfig({
    plugins: [react(), apiLocal()],
    server: { port: 5174, strictPort: true },
    preview: { port: 4174, strictPort: true },
    build: {
        // Sin <script> en línea ni módulos en data: (la CSP no los permite).
        assetsInlineLimit: 0,
        modulePreload: { polyfill: false },
        sourcemap: false,
    },
});
