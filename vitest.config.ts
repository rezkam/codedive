import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/**",
				"dist/**",
				"**/*.test.ts",
				"**/*.spec.ts",
				"tests/**",
				"vitest.config.ts",
			],
		},
		include: ["src/**/*.{test,spec}.ts", "tests/**/*.{test,spec}.ts"],
		testTimeout: 10000,
	},
});
