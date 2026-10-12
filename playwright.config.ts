import { defineConfig, devices } from "@playwright/test";
import { OWNER, SERVER_LOG, TEST_DB } from "./tests/e2e/env";

/**
 * E2E against the production build (`next build && next start`), never the dev server:
 * the strict CSP, streaming and status codes only behave for real there.
 * Brain: http-tests-against-the-built-app, verify-frontend-in-browser.
 *
 * Needs a local Postgres with a `lab_docs_test` database (or E2E_DATABASE_URL); global setup
 * wipes and reseeds it each run. The server's output goes to .e2e/server.log, which is also
 * where the setup step reads sign-in codes from.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;
const start = `mkdir -p .e2e && pnpm start > ${SERVER_LOG} 2>&1`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0, // flakes get fixed or quarantined, not retried (test-pyramid-that-matches-the-risk)
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "chromium", use: { ...devices["Desktop Chrome"], storageState: OWNER.state }, dependencies: ["setup"] },
  ],
  webServer: {
    command: process.env.E2E_SKIP_BUILD ? start : `pnpm build && ${start}`,
    url: `${baseURL}/robots.txt`, // needs no database, so it answers whether or not setup has run
    reuseExistingServer: false, // a reused server would log sign-in codes somewhere else
    timeout: 240_000,
    env: {
      PORT: String(PORT),
      SITE_URL: baseURL,
      DATABASE_URL: TEST_DB,
      BETTER_AUTH_SECRET: "e2e-only-secret-not-used-anywhere-else-0123456789",
      RESEND_API_KEY: "",
      LOG_SIGN_IN_CODES: "1", // the setup step reads codes from the log; refused on Vercel production
      LOG_LEVEL: "warn",
    },
  },
});
