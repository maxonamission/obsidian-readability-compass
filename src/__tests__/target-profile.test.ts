import { describe, expect, it } from "vitest";
import {
	NoteContext,
	resolveTarget,
	TargetProfileSettings,
	TargetRule,
} from "../readability/target-profile";

function settings(overrides: Partial<TargetProfileSettings> = {}): TargetProfileSettings {
	return {
		deriveFromDiataxis: true,
		tagRules: [],
		folderRules: [],
		globalBand: "b2",
		globalCustomMaxLix: 45,
		...overrides,
	};
}

function note(overrides: Partial<NoteContext> = {}): NoteContext {
	return { path: "notes/plain.md", tags: [], frontmatter: null, ...overrides };
}

function rule(pattern: string, band: TargetRule["band"] = "b1", customMaxLix = 45): TargetRule {
	return { pattern, band, customMaxLix };
}

describe("resolveTarget", () => {
	it("falls back to the global band without context", () => {
		const resolved = resolveTarget(null, settings());
		expect(resolved).toMatchObject({ maxLix: 45, band: "b2", source: "global" });
	});

	it("falls back to the global custom ceiling", () => {
		const resolved = resolveTarget(
			note(),
			settings({ globalBand: "custom", globalCustomMaxLix: 38 }),
		);
		expect(resolved).toMatchObject({ maxLix: 38, band: "custom", source: "global" });
	});

	// --- Front matter --------------------------------------------------------

	it("honours readability-target with a band name", () => {
		const resolved = resolveTarget(
			note({ frontmatter: { "readability-target": "B1" } }),
			settings(),
		);
		expect(resolved).toMatchObject({ maxLix: 40, band: "b1", source: "note" });
	});

	it("honours readability-target with a bare number and numeric string", () => {
		expect(
			resolveTarget(note({ frontmatter: { "readability-target": 42 } }), settings()),
		).toMatchObject({ maxLix: 42, band: "custom", source: "note" });
		expect(
			resolveTarget(note({ frontmatter: { "readability-target": "42" } }), settings()),
		).toMatchObject({ maxLix: 42, band: "custom", source: "note" });
	});

	it("ignores invalid readability-target values", () => {
		for (const bad of ["strict", -5, 0, true, {}]) {
			const resolved = resolveTarget(
				note({ frontmatter: { "readability-target": bad } }),
				settings(),
			);
			expect(resolved.source).toBe("global");
		}
	});

	it("lets readability-target beat every other source", () => {
		const resolved = resolveTarget(
			note({
				path: "blog/post.md",
				tags: ["#blog"],
				frontmatter: { "readability-target": "c1", diataxis: "tutorial" },
			}),
			settings({
				tagRules: [rule("blog", "b1")],
				folderRules: [rule("blog", "b1")],
			}),
		);
		expect(resolved).toMatchObject({ maxLix: 55, band: "c1", source: "note" });
	});

	// --- Diataxis -------------------------------------------------------------

	it("derives the band from the diataxis type", () => {
		const resolved = resolveTarget(
			note({ frontmatter: { diataxis: "Tutorial" } }),
			settings(),
		);
		expect(resolved).toMatchObject({
			maxLix: 40,
			band: "b1",
			source: "diataxis",
			detail: "diataxis: tutorial",
		});
	});

	it("maps how-to, reference and explanation to B2", () => {
		for (const type of ["how-to", "howto", "reference", "explanation"]) {
			const resolved = resolveTarget(
				note({ frontmatter: { diataxis: type } }),
				settings({ globalBand: "c1" }),
			);
			expect(resolved).toMatchObject({ maxLix: 45, band: "b2", source: "diataxis" });
		}
	});

	it("skips diataxis when disabled or unknown", () => {
		expect(
			resolveTarget(
				note({ frontmatter: { diataxis: "tutorial" } }),
				settings({ deriveFromDiataxis: false }),
			).source,
		).toBe("global");
		expect(
			resolveTarget(note({ frontmatter: { diataxis: "essay" } }), settings()).source,
		).toBe("global");
	});

	it("lets diataxis beat tag and folder rules", () => {
		const resolved = resolveTarget(
			note({
				path: "docs/guide.md",
				tags: ["#docs"],
				frontmatter: { diataxis: "tutorial" },
			}),
			settings({
				tagRules: [rule("docs", "c1")],
				folderRules: [rule("docs", "c1")],
			}),
		);
		expect(resolved.source).toBe("diataxis");
	});

	// --- Tags ------------------------------------------------------------------

	it("matches tag rules regardless of '#' and case", () => {
		const resolved = resolveTarget(
			note({ tags: ["#Blog"] }),
			settings({ tagRules: [rule("blog", "b1")] }),
		);
		expect(resolved).toMatchObject({ maxLix: 40, band: "b1", source: "tag", detail: "#blog" });
	});

	it("matches nested tags under a rule tag", () => {
		const resolved = resolveTarget(
			note({ tags: ["#blog/tech"] }),
			settings({ tagRules: [rule("blog", "b1")] }),
		);
		expect(resolved.source).toBe("tag");
	});

	it("uses the first matching tag rule and skips empty patterns", () => {
		const resolved = resolveTarget(
			note({ tags: ["#blog", "#docs"] }),
			settings({
				tagRules: [rule("", "c1"), rule("docs", "custom", 30), rule("blog", "b1")],
			}),
		);
		expect(resolved).toMatchObject({ maxLix: 30, band: "custom", source: "tag" });
	});

	it("lets tag rules beat folder rules", () => {
		const resolved = resolveTarget(
			note({ path: "blog/post.md", tags: ["#draft"] }),
			settings({
				tagRules: [rule("draft", "c1")],
				folderRules: [rule("blog", "b1")],
			}),
		);
		expect(resolved.source).toBe("tag");
	});

	// --- Folders ----------------------------------------------------------------

	it("matches a folder rule as a path prefix", () => {
		const resolved = resolveTarget(
			note({ path: "blog/2026/post.md" }),
			settings({ folderRules: [rule("blog", "b1")] }),
		);
		expect(resolved).toMatchObject({ maxLix: 40, band: "b1", source: "folder", detail: "blog/" });
	});

	it("does not match partial folder names", () => {
		const resolved = resolveTarget(
			note({ path: "blogging/post.md" }),
			settings({ folderRules: [rule("blog", "b1")] }),
		);
		expect(resolved.source).toBe("global");
	});

	it("prefers the most specific folder rule and tolerates slashes", () => {
		const resolved = resolveTarget(
			note({ path: "docs/tutorials/intro.md" }),
			settings({
				folderRules: [rule("docs", "c1"), rule("/docs/tutorials/", "b1")],
			}),
		);
		expect(resolved).toMatchObject({ band: "b1", source: "folder", detail: "docs/tutorials/" });
	});

	it("supports custom ceilings in rules", () => {
		const resolved = resolveTarget(
			note({ path: "blog/post.md" }),
			settings({ folderRules: [rule("blog", "custom", 33)] }),
		);
		expect(resolved).toMatchObject({ maxLix: 33, band: "custom" });
	});
});
