// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  // Build output and the sample plugin's Node build scripts are not plugin code.
  globalIgnores(["node_modules", "dist", "main.js", "esbuild.config.mjs", "version-bump.mjs"]),
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"],
        },
      },
    },
    rules: {
      // example: turn off a rule from the recommended set
      "obsidianmd/sample-names": "off",
    },
  },
]);