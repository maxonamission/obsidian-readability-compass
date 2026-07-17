import esbuild from "esbuild";
import process from "process";
import { builtinModules } from "module";
import { readFileSync } from "fs";

const prod = process.argv[2] === "production";

// Stamp the plugin version into a banner so every build produces a main.js whose
// bytes (and therefore sha256 digest) are unique per version. That keeps each
// release asset's build-provenance attestation on its own digest, instead of
// sharing a digest with an older version — the collision that made the 0.8.2
// directory review fail on a stale attestation (BC_E1_S26).
const version = JSON.parse(readFileSync("manifest.json", "utf8")).version;

const context = await esbuild.context({
	entryPoints: ["src/main.ts"],
	bundle: true,
	// Node builtins come from Node's own `module.builtinModules` — the plugin
	// source imports none, but esbuild still wants them marked external. Using
	// the built-in list drops the third-party `builtin-modules` dependency the
	// obsidianmd review flags.
	external: [
		"obsidian",
		"electron",
		"@codemirror/state",
		"@codemirror/view",
		...builtinModules,
	],
	banner: {
		js: `/* Readability Compass ${version} — https://github.com/maxonamission/obsidian-readability-compass */`,
	},
	format: "cjs",
	target: "es2018",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	outfile: "main.js",
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}
