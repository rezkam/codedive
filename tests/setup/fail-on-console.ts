/**
 * Vitest setup file: fail any test that calls console.log/warn/error unexpectedly.
 *
 * Based on the pattern used by Zod's test suite. Tests that legitimately need
 * console output must mock it explicitly:
 *
 *   vi.spyOn(console, "error").mockImplementation(() => {});
 *
 * This is automatically restored after each test because vitest.config.ts
 * sets restoreMocks: true globally.
 */
import { beforeAll, afterAll } from "vitest";

type ConsoleMethod = "log" | "info" | "warn" | "error" | "debug";
const METHODS: ConsoleMethod[] = ["log", "info", "warn", "error", "debug"];

const originals = {} as Record<ConsoleMethod, (...args: unknown[]) => void>;

function thrower(method: ConsoleMethod) {
	return (...args: unknown[]) => {
		// Restore originals before throwing so the error itself can be printed
		for (const m of METHODS) {
			console[m] = originals[m];
		}
		throw new Error(
			`Unexpected console.${method}() call in test. Mock it with vi.spyOn(console, "${method}").mockImplementation(() => {}).\nArguments: ${args.map(String).join(" ")}`,
		);
	};
}

beforeAll(() => {
	for (const method of METHODS) {
		originals[method] = console[method].bind(console);
		console[method] = thrower(method);
	}
});

afterAll(() => {
	for (const method of METHODS) {
		console[method] = originals[method];
	}
});
