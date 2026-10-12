import "server-only";
import { betterAuth } from "better-auth";
import { authOptions } from "@/lib/auth-options";
import { pool } from "@/lib/db";
import { env } from "@/lib/env";
import { log } from "@/lib/log";

/** Emails a sign-in code through Resend, or prints it to the server log in development. */
async function sendCode(email: string, code: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
    // Any production server (not only Vercel) refuses: a code in a log is a key to the account.
    if (env.NODE_ENV === "production" && env.LOG_SIGN_IN_CODES !== "1") throw new Error("RESEND_API_KEY and MAIL_FROM are required to send sign-in codes");
    log.warn("sign-in code (no RESEND_API_KEY, so printed here instead of emailed)", { email, code });
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [email],
      subject: `Your Lab Docs sign-in code: ${code}`,
      text: `Your sign-in code is ${code}\n\nIt works for 10 minutes. If you did not ask for it, you can ignore this email.`,
    }),
  });
  if (!res.ok) {
    log.error("sign-in email failed", { status: res.status });
    throw new Error("Could not send the sign-in email");
  }
}

type Auth = ReturnType<typeof makeAuth>;
const makeAuth = () => betterAuth(authOptions({ db: pool(), secret: env.BETTER_AUTH_SECRET, baseURL: env.SITE_URL, sendCode }));
const globalForAuth = globalThis as unknown as { labDocsAuth?: Auth };

/** Built on first use, not at import, so `next build` never needs a database. */
export function getAuth(): Auth {
  globalForAuth.labDocsAuth ??= makeAuth();
  return globalForAuth.labDocsAuth;
}
