import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default tseslint.config(
	// eslint-plugin-obsidianmd exports `recommended` as a full flat-config
	// array (incl. typescript-eslint + the obsidianmd rules).
	...obsidianmd.configs.recommended,
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			parserOptions: {
				// Tests are part of tsconfig's project (no default-project cap).
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			// Allow unused vars prefixed with _.
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
			// Deprecations stay visible as a non-blocking warning.
			"@typescript-eslint/no-deprecated": "warn",
			// The sentence-case heuristic lowercases our proper nouns (LIX,
			// CEFR, Flesch-Douma). UI text is hand-kept in sentence case with
			// proper nouns preserved.
			"obsidianmd/ui/sentence-case": "off",
		},
	},
	{
		// Tests run under vitest/node, never inside an Obsidian window; the
		// obsidianmd runtime-compatibility rules do not apply there.
		files: ["src/__tests__/**/*.ts"],
		rules: {
			"obsidianmd/prefer-window-timers": "off",
			"obsidianmd/prefer-active-doc": "off",
		},
	},
	{
		ignores: ["main.js", "node_modules/"],
	},
);
