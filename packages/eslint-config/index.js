import pluginJs from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import perfectionist from "eslint-plugin-perfectionist"
import globals from "globals"
import tseslint from "typescript-eslint"


/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  {languageOptions: { globals: globals.browser }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
   perfectionist.configs["recommended-natural"],
  {
    rules: {
      "perfectionist/sort-exports": "off",
      "perfectionist/sort-modules": "off",
      "@typescript-eslint/no-explicit-any": "off"
    },
  },
  eslintConfigPrettier
]