import { defineConfig } from "tsup"

export default defineConfig({
	entry: ["src/index.ts"],
	clean: true,
	splitting: true,
	treeshake: true,
	dts: true,
	format: ["cjs", "esm"],
	target: "es2015"
})