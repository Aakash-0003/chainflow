import js from "@eslint/js";
import globals from "globals";
import importPlugin from "eslint-plugin-import";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";

export default defineConfig([
  {
    // Apply to all JS files
    files: ["**/*.{js,mjs,cjs}"],

    // Register plugins explicitly
    plugins: {
      js,
      import: importPlugin
    },

    // Base recommended rules (bug prevention)
    extends: ["js/recommended", prettier],

    // Tell ESLint this is Node.js backend code
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },

    // 👇 THIS is where your custom rules go
    rules: {
      // --- Core bug prevention ---
      "no-undef": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-unreachable": "error",
      "no-dupe-keys": "error",

      // --- Safer async code ---
      "require-await": "warn",
      "no-return-await": "warn",

      // --- Import sanity (backend stability) ---
      "import/no-duplicates": "error",
      "import/no-cycle": "warn",

      // --- Allow backend logging ---
      "no-console": "off",
    },
  },
]);
