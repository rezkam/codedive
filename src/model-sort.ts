/**
 * Sort models newest-first by version extracted from model IDs.
 *
 * Handles patterns like:
 *   claude-opus-4-6             → [4, 6, 0, Infinity]
 *   claude-sonnet-4-5-20250929  → [4, 5, 0, 20250929]
 *   claude-3-5-sonnet-20241022  → [3, 5, 0, 20241022]
 *   gpt-4-turbo                 → [4, 0, 0, Infinity]
 *   gemini-2.0-flash            → [2, 0, 0, Infinity]
 *
 * Grouped by provider, then sorted by version descending.
 * Undated models (latest aliases) sort before dated ones of same version.
 */

function modelSortKey(id: string): [number, number, number, number] {
	const nums = id.match(/\d+/g)?.map(Number) ?? [];

	// Detect trailing date (8-digit number like 20250929)
	let date = Infinity;
	if (nums.length > 0 && nums[nums.length - 1] > 20200000) {
		date = nums.pop()!;
	}

	const major = nums[0] ?? 0;
	const minor = nums[1] ?? 0;
	const patch = nums[2] ?? 0;
	return [major, minor, patch, date];
}

export function sortModelsNewestFirst<T extends { id: string; provider: string }>(models: T[]): T[] {
	return [...models].sort((a, b) => {
		// Group by provider first
		if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
		// Then by version descending
		const ka = modelSortKey(a.id);
		const kb = modelSortKey(b.id);
		for (let i = 0; i < 4; i++) {
			if (ka[i] !== kb[i]) return kb[i] - ka[i];
		}
		return 0;
	});
}
