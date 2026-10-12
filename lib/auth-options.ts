import { emailOTP } from "better-auth/plugins/email-otp";
import { nextCookies } from "better-auth/next-js";
import type { BetterAuthOptions } from "better-auth";
import type { Pool } from "pg";
import { claimCodeEmail } from "./sign-in-limit";

export type SendCode = (email: string, code: string) => Promise<void>;

/**
 * Better Auth settings, shared by the app (lib/auth-server.ts) and the schema generator
 * (scripts/auth.config.ts), so the tables always match what the app expects.
 *
 * Sign-in is a 6-digit code by email: nobody here should have to remember a password
 * (Brain: sign-in-flows-people-finish). Sign-up is closed; the owner adds people from the
 * People page, so a stranger who asks for a code gets the same 200 and no email.
 */
export function authOptions({ db, secret, baseURL, sendCode }: { db: Pool; secret?: string; baseURL: string; sendCode: SendCode }) {
  return {
    appName: "Lab Docs",
    database: db,
    secret,
    baseURL,
    user: {
      additionalFields: {
        // owner | staff | partner. Server-only (input: false); a check constraint backs it.
        role: { type: "string", required: true, defaultValue: "staff", input: false },
        deactivatedAt: { type: "date", required: false, input: false },
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, storage: "database" },
    advanced: { ipAddress: { ipAddressHeaders: ["x-forwarded-for"] } },
    plugins: [
      emailOTP({
        disableSignUp: true,
        otpLength: 6,
        expiresIn: 10 * 60,
        allowedAttempts: 5,
        storeOTP: "hashed",
        async sendVerificationOTP({ email, otp, type }) {
          if (type !== "sign-in") return;
          const { rows } = await db.query<{ deactivatedAt: Date | null }>(
            'select "deactivatedAt" from "user" where email = $1',
            [email],
          );
          // Unknown or switched-off people get nothing; the answer to the browser is the same.
          if (!rows[0] || rows[0].deactivatedAt) return;
          // Past the per-address limit, also nothing: the per-IP limit alone can be dodged by
          // faking X-Forwarded-For, and this stops anyone flooding a person's inbox.
          if (!(await claimCodeEmail(db, email))) return;
          await sendCode(email, otp);
        },
      }),
      nextCookies(),
    ],
  } satisfies BetterAuthOptions;
}
