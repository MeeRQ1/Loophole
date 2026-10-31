import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173/Loophole/",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions:
      !process.env.CI && existsSync("/usr/bin/chromium")
        ? { executablePath: "/usr/bin/chromium" }
        : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/Loophole/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
