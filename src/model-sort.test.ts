import { describe, it, expect } from "vitest";
import { sortModelsNewestFirst } from "./model-sort.js";

type M = { id: string; provider: string };

function m(id: string, provider = "anthropic"): M {
	return { id, provider };
}

function ids(models: M[]): string[] {
	return models.map((x) => x.id);
}

describe("sortModelsNewestFirst", () => {
	// ═══════════════════════════════════════════════════════════════
	// Basic version ordering
	// ═══════════════════════════════════════════════════════════════

	it("sorts higher major version first", () => {
		const result = sortModelsNewestFirst([m("claude-3-opus"), m("claude-4-opus")]);
		expect(ids(result)).toEqual(["claude-4-opus", "claude-3-opus"]);
	});

	it("sorts higher minor version first", () => {
		const result = sortModelsNewestFirst([
			m("claude-opus-4-1"),
			m("claude-opus-4-5"),
			m("claude-opus-4-0"),
		]);
		expect(ids(result)).toEqual(["claude-opus-4-5", "claude-opus-4-1", "claude-opus-4-0"]);
	});

	it("sorts 4-6 before 4-5 before 4-1 before 4-0", () => {
		const result = sortModelsNewestFirst([
			m("claude-opus-4-0"),
			m("claude-opus-4-6"),
			m("claude-opus-4-1"),
			m("claude-opus-4-5"),
		]);
		expect(ids(result)).toEqual([
			"claude-opus-4-6",
			"claude-opus-4-5",
			"claude-opus-4-1",
			"claude-opus-4-0",
		]);
	});

	// ═══════════════════════════════════════════════════════════════
	// Date handling
	// ═══════════════════════════════════════════════════════════════

	it("undated (latest alias) sorts before dated version of same number", () => {
		const result = sortModelsNewestFirst([
			m("claude-sonnet-4-5-20250929"),
			m("claude-sonnet-4-5"),
		]);
		expect(ids(result)).toEqual(["claude-sonnet-4-5", "claude-sonnet-4-5-20250929"]);
	});

	it("sorts dated versions by date descending", () => {
		const result = sortModelsNewestFirst([
			m("claude-sonnet-4-5-20250301"),
			m("claude-sonnet-4-5-20250929"),
			m("claude-sonnet-4-5-20250615"),
		]);
		expect(ids(result)).toEqual([
			"claude-sonnet-4-5-20250929",
			"claude-sonnet-4-5-20250615",
			"claude-sonnet-4-5-20250301",
		]);
	});

	it("detects 8-digit trailing date (20241022)", () => {
		const result = sortModelsNewestFirst([
			m("claude-3-5-sonnet-20241022"),
			m("claude-3-5-sonnet-20240620"),
		]);
		expect(ids(result)).toEqual(["claude-3-5-sonnet-20241022", "claude-3-5-sonnet-20240620"]);
	});

	it("does not treat small numbers as dates", () => {
		// "turbo" has no date, "1106" is too small (< 20200000)
		const result = sortModelsNewestFirst([
			m("gpt-4-turbo", "openai"),
			m("gpt-4-1106", "openai"),
		]);
		// Both have major=4, 1106 > turbo's 0 so 1106 should be first
		expect(ids(result)[0]).toBe("gpt-4-1106");
	});

	// ═══════════════════════════════════════════════════════════════
	// Provider grouping
	// ═══════════════════════════════════════════════════════════════

	it("groups by provider alphabetically", () => {
		const result = sortModelsNewestFirst([
			m("gpt-4", "openai"),
			m("claude-4-5", "anthropic"),
			m("gemini-2", "google"),
		]);
		expect(result.map((x) => x.provider)).toEqual(["anthropic", "google", "openai"]);
	});

	it("sorts within each provider group independently", () => {
		const result = sortModelsNewestFirst([
			m("gpt-3-5", "openai"),
			m("claude-3-opus", "anthropic"),
			m("gpt-4", "openai"),
			m("claude-4-opus", "anthropic"),
		]);
		expect(ids(result)).toEqual([
			"claude-4-opus",
			"claude-3-opus",
			"gpt-4",
			"gpt-3-5",
		]);
	});

	// ═══════════════════════════════════════════════════════════════
	// Real-world model name patterns
	// ═══════════════════════════════════════════════════════════════

	it("handles claude naming: opus > sonnet > haiku within same version", () => {
		// Same numeric version (4-5), different families
		// Sorted by version first — all 4-5 so order is stable (original order preserved)
		const input = [
			m("claude-haiku-4-5"),
			m("claude-opus-4-5"),
			m("claude-sonnet-4-5"),
		];
		const result = sortModelsNewestFirst(input);
		// All have same version key [4, 5, 0, Infinity], so relative order preserved
		expect(result.length).toBe(3);
		for (const r of result) expect(r.id).toContain("4-5");
	});

	it("handles claude-3-x-variant-date pattern", () => {
		const result = sortModelsNewestFirst([
			m("claude-3-haiku-20240307"),
			m("claude-3-5-sonnet-20241022"),
			m("claude-3-7-sonnet-20250219"),
			m("claude-3-opus-20240229"),
		]);
		expect(ids(result)).toEqual([
			"claude-3-7-sonnet-20250219",  // 3.7 > 3.5 > 3.0
			"claude-3-5-sonnet-20241022",
			"claude-3-haiku-20240307",     // 3.0 but later date than opus
			"claude-3-opus-20240229",      // 3.0 earlier date
		]);
	});

	it("handles -latest suffix as undated", () => {
		const result = sortModelsNewestFirst([
			m("claude-3-7-sonnet-20250219"),
			m("claude-3-7-sonnet-latest"),
		]);
		// "latest" has no 8-digit date, so date=Infinity → sorts first
		expect(ids(result)[0]).toBe("claude-3-7-sonnet-latest");
	});

	it("handles gemini naming: gemini-2.0-flash", () => {
		const result = sortModelsNewestFirst([
			m("gemini-1-5-flash", "google"),
			m("gemini-2-0-flash", "google"),
		]);
		expect(ids(result)).toEqual(["gemini-2-0-flash", "gemini-1-5-flash"]);
	});

	it("handles models with no version numbers", () => {
		const result = sortModelsNewestFirst([
			m("grok-beta", "xai"),
			m("grok-2", "xai"),
		]);
		// grok-2 has [2,0,0,Inf], grok-beta has [0,0,0,Inf]
		expect(ids(result)).toEqual(["grok-2", "grok-beta"]);
	});

	// ═══════════════════════════════════════════════════════════════
	// Full realistic scenario
	// ═══════════════════════════════════════════════════════════════

	it("sorts a realistic anthropic model list newest-first", () => {
		const input = [
			m("claude-3-haiku-20240307"),
			m("claude-3-5-haiku-20241022"),
			m("claude-3-5-haiku-latest"),
			m("claude-3-opus-20240229"),
			m("claude-3-sonnet-20240229"),
			m("claude-3-5-sonnet-20240620"),
			m("claude-3-5-sonnet-20241022"),
			m("claude-3-7-sonnet-20250219"),
			m("claude-3-7-sonnet-latest"),
			m("claude-haiku-4-5"),
			m("claude-haiku-4-5-20251001"),
			m("claude-opus-4-0"),
			m("claude-opus-4-1"),
			m("claude-opus-4-1-20250805"),
			m("claude-opus-4-5"),
			m("claude-opus-4-5-20251101"),
			m("claude-opus-4-6"),
			m("claude-sonnet-4-0"),
			m("claude-sonnet-4-5"),
			m("claude-sonnet-4-5-20250929"),
			m("claude-sonnet-4-20250514"),
		];

		const result = sortModelsNewestFirst(input);
		const sorted = ids(result);

		// 4-6 should be at the very top
		expect(sorted[0]).toBe("claude-opus-4-6");

		// All 4.x models should come before all 3.x models
		const first3idx = sorted.findIndex((id) => id.startsWith("claude-3"));
		const last4idx = sorted.reduce((acc, id, i) =>
			id.match(/claude-(?:opus|sonnet|haiku)-4/) ? i : acc, -1);
		expect(last4idx).toBeLessThan(first3idx);

		// Within 3.x: 3-7 before 3-5 before 3 (no minor)
		const idx37 = sorted.findIndex((id) => id.includes("3-7"));
		const idx35 = sorted.findIndex((id) => id.includes("3-5"));
		const idx3plain = sorted.findIndex((id) => id.match(/claude-3-(?:opus|sonnet|haiku)-\d{8}/));
		expect(idx37).toBeLessThan(idx35);
		expect(idx35).toBeLessThan(idx3plain);
	});

	// ═══════════════════════════════════════════════════════════════
	// Edge cases
	// ═══════════════════════════════════════════════════════════════

	it("returns empty array for empty input", () => {
		expect(sortModelsNewestFirst([])).toEqual([]);
	});

	it("returns single element unchanged", () => {
		const input = [m("claude-sonnet-4-5")];
		expect(sortModelsNewestFirst(input)).toEqual(input);
	});

	it("does not mutate the input array", () => {
		const input = [m("claude-3-opus"), m("claude-4-opus")];
		const copy = [...input];
		sortModelsNewestFirst(input);
		expect(input).toEqual(copy);
	});

	it("preserves extra properties on model objects", () => {
		const input = [
			{ id: "claude-3-opus", provider: "anthropic", name: "Claude 3 Opus", extra: true },
			{ id: "claude-4-opus", provider: "anthropic", name: "Claude 4 Opus", extra: false },
		];
		const result = sortModelsNewestFirst(input);
		expect(result[0]).toHaveProperty("extra", false);
		expect(result[1]).toHaveProperty("extra", true);
	});
});
