/**
 * Shared test helper: creates a sanitized environment for subprocess tests.
 *
 * Only inherits PATH, sets HOME to the given tempDir, and explicitly blanks
 * ALL credential env vars so tests never accidentally use real API keys or
 * touch the real ~/.storyof/ directory.
 *
 * Usage:
 *   import { cleanEnv } from "../helpers/clean-env.js";
 *   const env = cleanEnv(tempDir);
 *   const env = cleanEnv(tempDir, { ANTHROPIC_API_KEY: "sk-test" });
 */
export function cleanEnv(
	tempDir: string,
	extra: Record<string, string> = {},
): Record<string, string> {
	return {
		PATH: process.env.PATH ?? "",
		HOME: tempDir,
		NODE_ENV: "test",
		STORYOF_NO_BROWSER: "1",
		// Explicitly blank every known credential var
		ANTHROPIC_API_KEY: "",
		ANTHROPIC_OAUTH_TOKEN: "",
		OPENAI_API_KEY: "",
		GEMINI_API_KEY: "",
		GROQ_API_KEY: "",
		XAI_API_KEY: "",
		OPENROUTER_API_KEY: "",
		MISTRAL_API_KEY: "",
		CEREBRAS_API_KEY: "",
		COPILOT_GITHUB_TOKEN: "",
		GH_TOKEN: "",
		GITHUB_TOKEN: "",
		STORYOF_ANTHROPIC_API_KEY: "",
		STORYOF_OPENAI_API_KEY: "",
		STORYOF_GEMINI_API_KEY: "",
		STORYOF_GROQ_API_KEY: "",
		STORYOF_XAI_API_KEY: "",
		STORYOF_OPENROUTER_API_KEY: "",
		STORYOF_MISTRAL_API_KEY: "",
		STORYOF_CEREBRAS_API_KEY: "",
		STORYOF_GITHUB_TOKEN: "",
		// Caller overrides last — they win
		...extra,
	};
}

/**
 * Creates a unique temp directory for a test run.
 * Use in beforeEach / test setup; clean up with fs.rmSync in afterEach.
 */
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export function makeTempDir(prefix = "storyof-test"): string {
	const id = crypto.randomBytes(8).toString("hex");
	const dir = path.join(os.tmpdir(), `${prefix}-${id}`);
	fs.mkdirSync(dir, { recursive: true });
	return dir;
}
