import { defineConfig } from "@playwright/test";

const smokePort = 3100;
const smokeBaseUrl = `http://127.0.0.1:${smokePort}`;

export default defineConfig({
  testDir: "./tests/smoke",
  outputDir: "test-results",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: smokeBaseUrl,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
      },
    },
  ],
  webServer: {
    command: `pnpm preview:cloudflare --port ${smokePort}`,
    url: smokeBaseUrl,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
