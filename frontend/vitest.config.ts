import { defineConfig, mergeConfig } from "vitest/config";
import vite_config from "./vite.config";

export default mergeConfig(
    vite_config,
    defineConfig({
        test: {
            environment: "jsdom",
            setupFiles: ["./tests/setup.ts"],
            include: ["tests/**/*.test.{ts,tsx}"],
        },
    }),
);
