import nextEnv from "@next/env";
import { defineConfig, devices } from "@playwright/test";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3031";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
    trace: "off",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3031",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
