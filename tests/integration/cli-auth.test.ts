import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { cleanEnv, makeTempDir } from "../helpers/clean-env.js";

const CLI_PATH = path.resolve(__dirname, "../../dist/cli.js");

function runCLI(
	args: string[],
	options: { env?: Record<string, string>; tempHome?: string } = {},
): { stdout: string; stderr: string; exitCode: number } {
	const tempHome = options.tempHome ?? makeTempDir();
	const env = cleanEnv(tempHome, options.env ?? {});

	try {
		const stdout = execSync(`node ${CLI_PATH} ${args.join(" ")}`, {
			encoding: "utf-8",
			env,
			timeout: 5000,
			cwd: tempHome, // Don't run in the project directory either
		});
		return { stdout, stderr: "", exitCode: 0 };
	} catch (err: any) {
		return {
			stdout: err.stdout ?? "",
			stderr: err.stderr ?? "",
			exitCode: err.status ?? 1,
		};
	}
}

describe("CLI Authentication", () => {
	let tempHome: string;
	let authFile: string;

	beforeEach(() => {
		tempHome = makeTempDir();
		const storyofDir = path.join(tempHome, ".storyof");
		authFile = path.join(storyofDir, "auth.json");
		fs.mkdirSync(storyofDir, { recursive: true });
		fs.writeFileSync(authFile, "{}", { mode: 0o600 });
	});

	afterEach(() => {
		// Always clean up — even if a test fails
		try {
			fs.rmSync(tempHome, { recursive: true, force: true });
		} catch {
			// Best effort cleanup
		}
	});

	describe("auth set", () => {
		it("stores API key", () => {
			const result = runCLI(["auth", "set", "anthropic", "sk-test-key"], { tempHome });

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("API key stored");
			expect(result.stdout).toContain("anthropic");

			// Verify file was written in temp dir, not real home
			const authData = JSON.parse(fs.readFileSync(authFile, "utf-8"));
			expect(authData.anthropic).toBeDefined();
			expect(authData.anthropic.key).toBe("sk-test-key");
			expect(authData.anthropic.type).toBe("api_key");
		});

		it("rejects unknown provider", () => {
			const result = runCLI(["auth", "set", "fake-provider", "key"], { tempHome });

			expect(result.exitCode).not.toBe(0);
			expect(result.stderr).toMatch(/unknown provider/i);
		});

		it("requires both arguments", () => {
			const result = runCLI(["auth", "set", "anthropic"], { tempHome });

			expect(result.exitCode).not.toBe(0);
		});
	});

	describe("auth list", () => {
		it("shows stored credentials", () => {
			// Store a key first (in temp dir)
			runCLI(["auth", "set", "anthropic", "sk-test"], { tempHome });

			const result = runCLI(["auth", "list"], { tempHome });

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain("anthropic");
			expect(result.stdout).toContain("API Key");
		});

		it("shows message when empty", () => {
			const result = runCLI(["auth", "list"], { tempHome });

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toBeTruthy();
		});
	});

	describe("auth logout", () => {
		it("removes stored credentials", () => {
			// Store first (in temp dir)
			runCLI(["auth", "set", "anthropic", "sk-test"], { tempHome });

			// Remove
			const result = runCLI(["auth", "logout", "anthropic"], { tempHome });

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toMatch(/removed/i);

			// Verify removal in temp file
			const authData = JSON.parse(fs.readFileSync(authFile, "utf-8"));
			expect(authData.anthropic).toBeUndefined();
		});
	});

	describe("auth check before start", () => {
		it("blocks start without credentials", () => {
			// tempHome has empty auth.json, cleanEnv blanks all API key env vars
			const result = runCLI(["test"], { tempHome });

			expect(result.exitCode).not.toBe(0);
			expect(result.stderr).toMatch(/no api credentials/i);
			expect(result.stdout).toContain("auth set");
			expect(result.stdout).toContain("auth login");
		});

		it("accepts STORYOF_ env var", () => {
			const result = runCLI(["--help"], {
				tempHome,
				env: { STORYOF_ANTHROPIC_API_KEY: "sk-test" },
			});

			expect(result.exitCode).toBe(0);
		});

		it("accepts standard env var", () => {
			const result = runCLI(["--help"], {
				tempHome,
				env: { ANTHROPIC_API_KEY: "sk-test" },
			});

			expect(result.exitCode).toBe(0);
		});
	});

	describe("isolation safety", () => {
		it("never writes to real home directory", () => {
			const realAuthFile = path.join(os.homedir(), ".storyof", "auth.json");
			const before = fs.existsSync(realAuthFile)
				? fs.readFileSync(realAuthFile, "utf-8")
				: null;

			// Run a write operation
			runCLI(["auth", "set", "anthropic", "sk-SHOULD-NOT-LEAK"], { tempHome });

			const after = fs.existsSync(realAuthFile)
				? fs.readFileSync(realAuthFile, "utf-8")
				: null;

			// Real file must be untouched
			expect(after).toBe(before);

			// And the test key must NOT appear in real auth
			if (after) {
				expect(after).not.toContain("sk-SHOULD-NOT-LEAK");
			}
		});

		it("temp directory is cleaned up after test", () => {
			const isolatedTemp = makeTempDir();
			runCLI(["auth", "set", "openai", "sk-temp"], { tempHome: isolatedTemp });

			// Verify it was written
			const authPath = path.join(isolatedTemp, ".storyof", "auth.json");
			expect(fs.existsSync(authPath)).toBe(true);

			// Clean up
			fs.rmSync(isolatedTemp, { recursive: true, force: true });
			expect(fs.existsSync(isolatedTemp)).toBe(false);
		});
	});
});
