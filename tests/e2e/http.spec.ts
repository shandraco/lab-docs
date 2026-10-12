import { expect, test } from "@playwright/test";

/** What only exists over HTTP: headers, CSP plumbing, redirects and status codes. */
const browserUA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const nowhere = "/documents/00000000-0000-0000-0000-000000000000/download?format=pdf";

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("HTML responses carry a strict nonce CSP and the security headers", async ({ request }) => {
    const a = await request.get("/sign-in", { headers: { "User-Agent": browserUA } });
    const b = await request.get("/sign-in", { headers: { "User-Agent": browserUA } });
    const csp = a.headers()["content-security-policy"]!;
    const scriptSrc = csp.split(";").map((d) => d.trim()).find((d) => d.startsWith("script-src"))!;

    expect(scriptSrc).toMatch(/^script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'$/);
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).not.toContain("unsafe-eval");
    expect(b.headers()["content-security-policy"]).not.toBe(csp); // fresh nonce per request

    // Every <script> that can execute carries this response's nonce.
    const nonce = /'nonce-([^']+)'/.exec(scriptSrc)![1]!;
    const html = await a.text();
    const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1]!).filter((attrs) => !/type="application\/(ld\+)?json"/.test(attrs));
    expect(scripts.length).toBeGreaterThan(0);
    for (const attrs of scripts) expect(attrs).toContain(`nonce="${nonce}"`);

    const h = a.headers();
    expect(h["strict-transport-security"]).toContain("max-age=63072000");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["cross-origin-opener-policy"]).toBe("same-origin");
    expect(h["x-robots-tag"]).toContain("noindex");
    expect(h["x-request-id"]).toMatch(/^[\da-f]{32}$/);
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("a private tool: robots.txt shuts everything", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/^Disallow: \/$/m);
    expect((await request.get("/sitemap.xml")).status()).toBe(404);
  });

  test("every page sends you to sign in, and remembers where you were going", async ({ request }) => {
    for (const path of ["/", "/clients", "/new", "/settings", "/people", "/templates"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(307);
      expect(res.headers()["location"], path).toBe(`/sign-in?next=${encodeURIComponent(path)}`);
    }
  });

  test("a download link without a session redirects to sign in, never a file", async ({ request }) => {
    const res = await request.get(nowhere, { maxRedirects: 0 });
    expect(res.status()).toBe(303);
    expect(res.headers()["location"]).toContain("/sign-in?next=");
  });
});

test("after sign-in, a 'next' that points off the site goes home instead", async ({ request }) => {
  for (const next of ["https://evil.example/", "//evil.example/", "/\\evil.example/", "/\t/evil.example/", "/\n/evil.example/"]) {
    const res = await request.get(`/sign-in?next=${encodeURIComponent(next)}`, { maxRedirects: 0 });
    expect(res.status(), next).toBe(307);
    expect(res.headers()["location"], next).toBe("/");
  }
  const ok = await request.get(`/sign-in?next=${encodeURIComponent("/clients?x=1")}`, { maxRedirects: 0 });
  expect(ok.headers()["location"]).toBe("/clients?x=1");
});

test("a signed-in download of a document that does not exist is a 404", async ({ request }) => {
  const res = await request.get(nowhere, { maxRedirects: 0 });
  expect(res.status()).toBe(404);
});
