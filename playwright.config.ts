import { defineConfig, devices } from "@playwright/test";

const webPort = Number(process.env.E2E_WEB_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${webPort}`;
const apiBaseURL = process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:3999";
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL ?? "chrome";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    ...devices["Desktop Chrome"],
    ...(browserChannel === "bundled" ? {} : { channel: browserChannel }),
    acceptDownloads: true,
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  webServer: {
    command: `npm run build:web && npm -w @notenrechner/web run start -- --hostname 127.0.0.1 --port ${webPort}`,
    env: {
      NEXT_PUBLIC_API_URL: apiBaseURL,
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: baseURL,
  },
});
