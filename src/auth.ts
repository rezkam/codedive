/**
 * Deep Dive — Authentication management.
 *
 * Wraps AuthStorage from pi-coding-agent but uses ~/.deep-dive/auth.json
 * and adds DEEP_DIVE_ env var support.
 */

import { AuthStorage } from "@mariozechner/pi-coding-agent";
import { AUTH_PATH, ENV_VAR_MAP } from "./constants.js";

/**
 * Create an AuthStorage instance pointing to ~/.deep-dive/auth.json.
 * Also registers a fallback resolver for DEEP_DIVE_ env vars.
 */
export function createAuthStorage(): AuthStorage {
	const authStorage = new AuthStorage(AUTH_PATH);

	// Register fallback resolver for DEEP_DIVE_ prefixed env vars
	authStorage.setFallbackResolver((provider: string) => {
		const mapping = ENV_VAR_MAP[provider];
		if (!mapping) return undefined;

		// Check DEEP_DIVE_ prefixed var first
		const deepDiveVal = process.env[mapping.deepDive];
		if (deepDiveVal) return deepDiveVal;

		// Then check standard env vars
		for (const fallback of mapping.fallbacks) {
			const val = process.env[fallback];
			if (val) return val;
		}
		return undefined;
	});

	return authStorage;
}
