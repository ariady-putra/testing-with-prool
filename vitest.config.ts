import { defineConfig } from "vitest/config";
import { config } from "dotenv";

config();

export default defineConfig({
  test: {
    testTimeout: 72_000, // 72 seconds
  },
});
