import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";

export default {
	input: ["src/main.ts"],
	output: {
		dir: "bin",
		format: "es",
	},
	plugins: [typescript(), json()],
	external: ["child_process", "fs", "path", "cli-table3", "chalk", "figlet"],
};
