import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import pg from "pg";
import { CODE_EMAILS_PER_WINDOW } from "@/lib/sign-in-limit";
import { LIMITED, SERVER_LOG, TEST_DB } from "./env";

/**
 * Faking X-Forwarded-For gets past the per-IP limit, so each request here looks like a new
 * caller. The per-address limit must still stop the emails. Other specs never ask for codes,
 * so every code logged during this test belongs to it.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const codesInLog = () => [...readFileSync(SERVER_LOG, "utf8").matchAll(/"code":"(\d{6})"/g)].length;

test("one address gets at most 3 code emails in 10 minutes, whatever IP asks", async ({ request, baseURL }) => {
  const before = codesInLog();
  const asks = CODE_EMAILS_PER_WINDOW + 2;

  for (let i = 0; i < asks; i++) {
    const res = await request.post("/api/auth/email-otp/send-verification-otp", {
      headers: { "X-Forwarded-For": `203.0.113.${i + 1}`, Origin: baseURL! },
      data: { email: LIMITED.email, type: "sign-in" },
    });
    // Same answer every time, so the limit does not tell a stranger the address is real.
    expect(res.status(), `request ${i + 1}`).toBe(200);
  }

  await expect.poll(() => codesInLog() - before).toBe(CODE_EMAILS_PER_WINDOW);
  await new Promise((r) => setTimeout(r, 1000)); // nothing late arrives after the poll settles
  expect(codesInLog() - before).toBe(CODE_EMAILS_PER_WINDOW);

  const db = new pg.Client({ connectionString: TEST_DB });
  await db.connect();
  const { rows } = await db.query<{ n: number }>("select count(*)::int as n from sign_in_code_sends where email = $1", [LIMITED.email]);
  await db.end();
  expect(rows[0]!.n).toBe(CODE_EMAILS_PER_WINDOW);
});
