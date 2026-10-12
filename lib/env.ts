import { z } from "zod";

/**
 * Server environment, validated once. Importing this module parses `process.env`; a bad
 * value throws with every problem listed, so a misconfigured deploy fails at build or at
 * server start (see instrumentation.ts) instead of on the first request that needs it.
 *
 * Add a variable here, in `.env.example`, and in the Vercel project settings, in that order.
 * Never put secrets in `NEXT_PUBLIC_*`: those are inlined into the browser bundle at build.
 */
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // Vercel sets these; locally they are absent.
    VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
    VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),

    /** Canonical origin, no trailing slash: https://example.com. Used for canonicals, sitemap, OG. */
    SITE_URL: z.url().optional(),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    /** Where browsers POST CSP violation reports. Optional. */
    CSP_REPORT_URI: z.url().optional(),


    /** Postgres: Neon pooled URL in production, local Postgres 17 on :5433 in development. */
    DATABASE_URL: z.url().optional(),
    /** Better Auth signing secret, 32+ random bytes (openssl rand -base64 32). */
    BETTER_AUTH_SECRET: z.string().min(32).optional(),
    /** Resend key for sign-in code emails. Without it, codes are printed to the server log in development only. */
    RESEND_API_KEY: z.string().optional(),
    /** From address for sign-in emails, on a domain verified in Resend. */
    MAIL_FROM: z.string().optional(),
    /** "1" lets a production build print sign-in codes instead of emailing them. Only for the local e2e run. */
    LOG_SIGN_IN_CODES: z.enum(["0", "1"]).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.VERCEL_ENV === "production") {
      for (const key of ["DATABASE_URL", "BETTER_AUTH_SECRET", "RESEND_API_KEY", "MAIL_FROM"] as const) {
        if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: "is required in production" });
      }
      if (env.LOG_SIGN_IN_CODES === "1") ctx.addIssue({ code: "custom", path: ["LOG_SIGN_IN_CODES"], message: "must never be on in production" });
    }
    if (env.NODE_ENV === "production" && !env.SITE_URL && !env.VERCEL_PROJECT_PRODUCTION_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["SITE_URL"],
        message: "is required for a production build (copy .env.example to .env.local)",
      });
    }
  })
  .transform((env) => ({
    ...env,
    SITE_URL: (
      env.SITE_URL ??
      (env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000")
    ).replace(/\/$/, ""),
  }));

export type Env = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  ${i.path.join(".") || "(root)"} ${i.message}`);
    throw new Error(`Invalid environment:\n${lines.join("\n")}`);
  }
  return result.data;
}

export const env: Env = parseEnv(process.env);
