import type { NextConfig } from "next";

/**
 * Static security headers for every path. The CSP is per-request (it carries a nonce), so it
 * is set in proxy.ts instead. Headers here cover paths the proxy matcher skips, which is why
 * they are not set in proxy too (Brain: next-middleware-cannot-gate-server-actions).
 */
const securityHeaders = [
  // Two years, subdomains included. Add "; preload" only once every subdomain is HTTPS.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Private tool: keep every page and download out of search indexes.
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  // Send <title>, description and canonical in <head> to every user agent, not only the
  // bots on Next's built-in list (Brain: nextjs-15-streams-metadata-into-body-for-crawlers).
  htmlLimitedBots: /.*/,
  // The PDF renderer reads these at runtime; make sure Vercel ships them with the function.
  outputFileTracingIncludes: { "/documents/[id]/download": ["./assets/fonts/**"] },
  experimental: {
    // Server action bodies over 1 MB fail before the action runs. If you upload through an
    // action, raise this (Vercel caps request bodies at 4.5 MB) and match the action's own
    // limit; bigger files go direct to storage (Brain: nextjs-server-action-uploads-fail-over-1mb).
    serverActions: { bodySizeLimit: "1mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
