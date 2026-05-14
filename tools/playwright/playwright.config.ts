import { defineConfig } from "@playwright/test";
import path from "node:path";

const workspaceRoot = path.resolve(__dirname, "../..");
const artifactRoot = path.join(workspaceRoot, "tmp/playwright");
const includesCostsMoneyPath = process.argv.some((arg) => arg.includes("costs-money"));
const allowCostsMoneyTests =
  process.env.PLAYWRIGHT_ALLOW_COSTLY_LLM_TESTS === "1" || includesCostsMoneyPath;

export default defineConfig({
  testDir: ".",
  testMatch: ["tests/**/*.spec.ts", ...(allowCostsMoneyTests ? ["costs-money/**/*.spec.ts"] : [])],
  globalSetup: "./tests/support/global-setup.ts",
  timeout: 30_000,
  workers: process.env.CI ? undefined : 4,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: path.join(artifactRoot, "report") }],
  ],
  outputDir: path.join(artifactRoot, "test-results"),
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://platform-edge-proxy:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1440, height: 960 },
  },
});
