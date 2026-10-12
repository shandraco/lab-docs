import "server-only";
import { env } from "@/lib/env";
import { site as nav } from "@/lib/site-nav";

/** Everything that names the app. */
export const site = {
  ...nav,
  description: "Statements of work, agreements and outreach for the lab, from approved templates.",
  url: env.SITE_URL,
  locale: "en_US",
} as const;

export function absoluteUrl(path = "/"): string {
  return new URL(path, `${site.url}/`).toString();
}
