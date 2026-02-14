import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "tests/browser",
	timeout: 30_000,
	retries: 0,
	workers: 1, // Serial — tests share port ranges
	use: {
		browserName: "chromium",
		headless: true,
		viewport: { width: 1280, height: 800 },
	},
	reporter: [["list"]],
});
