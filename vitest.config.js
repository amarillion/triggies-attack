import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					include: [ "**/*.spec.ts" ],
					name: "unit",
					environment: "node",
				},
			},
			{
				test: {
					include: [ "**/*.perf.ts" ],
					name: "perf",
					environment: "node",
				},
			},
		],
	},
});
