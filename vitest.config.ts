import { defineConfig } from "vitest/config";
import { config } from "dotenv";

config();

export default defineConfig({
  test: {
    testTimeout: 60_000, // 60 seconds
  },
});
