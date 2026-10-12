import { readFileSync } from "node:fs";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { CODE_EMAILS_PER_ADDRESS, CODE_EMAILS_PER_CALLER } from "@/lib/sign-in-limit";
import { LIMITED, SERVER_LOG, VICTIM } from "./env";

/**
 * Faking X-Forwarded-For gets past the per-IP limit, so each faked address looks like a new
 * caller. Other specs never ask for codes, so every code logged here belongs to this test.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const codesInLog = () => [...readFileSync(SERVER_LOG, "utf8").matchAll(/"code":"(\d{6})"/g)].length;

async function ask(request: APIRequestContext, origin: string, email: string, ip: string) {
  const res = await request.post("/api/auth/email-otp/send-verification-otp", {
    headers: { "X-Forwarded-For": ip, Origin: origin },
    data: { email, type: "sign-in" },
  });
  // Same answer every time, so the limits never tell a stranger an address is real.
  expect(res.status(), `${email} from ${ip}`).toBe(200);
}

/** Codes emailed by `run`, after the log stops growing. */
async function sent(run: () => Promise<void>): Promise<number> {
  const before = codesInLog();
  await run();
  let last = -1;
  await expect.poll(async () => {
    const now = codesInLog() - before;
    const settled = now === last;
    last = now;
    return settled;
  }, { intervals: [500] }).toBe(true);
  return last;
}

test("sign-in code emails: slowed per caller, capped per address, and a stranger cannot lock you out", async ({ request, baseURL }) => {
  test.setTimeout(150_000);
  const origin = baseURL!;
  const askMany = (email: string, ips: string[]) => async () => {
    for (const ip of ips) await ask(request, origin, email, ip);
  };

  // One caller: 3 codes, then nothing more in the window. Better Auth's own per-IP limit
  // (3 a minute, answered with 429) would hide ours, so wait it out before the 4th ask.
  const caller = "203.0.113.1";
  expect(await sent(askMany(LIMITED.email, [caller, caller, caller]))).toBe(CODE_EMAILS_PER_CALLER);
  await new Promise((r) => setTimeout(r, 61_000));
  expect(await sent(askMany(LIMITED.email, [caller]))).toBe(0);

  // Many (faked) callers: the address-wide cap holds.
  const many = Array.from({ length: 17 }, (_, i) => `203.0.113.${i + 2}`);
  expect(await sent(askMany(LIMITED.email, many))).toBe(CODE_EMAILS_PER_ADDRESS - CODE_EMAILS_PER_CALLER);

  // A stranger who uses up their allowance for someone else's address does not use up theirs.
  const stranger = "198.51.100.66";
  expect(await sent(askMany(VICTIM.email, [stranger, stranger, stranger]))).toBe(CODE_EMAILS_PER_CALLER);
  expect(await sent(askMany(VICTIM.email, ["192.0.2.10"]))).toBe(1);
});
