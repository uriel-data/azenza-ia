import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
    globalIgnores(["dist", ".dev-db", ".netlify"]),
    {
        files: ["src/**/*.{js,jsx}"],
        extends: [js.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
        languageOptions: {
            ecmaVersion: "latest",
            globals: globals.browser,
            parserOptions: { ecmaFeatures: { jsx: true }, sourceType: "module" },
        },
        rules: {
            "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
        },
    },
    {
        files: ["servidor/**/*.js", "netlify/**/*.mjs", "scripts/**/*.mjs", "test/**/*.js", "*.config.js"],
        extends: [js.configs.recommended],
        languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: globals.node },
    },
]);
