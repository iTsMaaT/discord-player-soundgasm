import { defineConfig } from "tsup"

export default defineConfig({
    format: ["esm","cjs"],
    entry: ['./lib/index.ts'],
    outDir: "./dist",
    skipNodeModulesBundle: true,
    dts: true
});