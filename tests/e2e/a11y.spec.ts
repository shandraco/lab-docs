import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Automated checks catch perhaps a third of real issues; keyboard and screen reader still apply. */
const signedIn = ["/", "/new", "/clients", "/clients/new", "/templates", "/settings", "/people", "/no-such-page"];
const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`axe, ${scheme}`, () => {
    test.use({ colorScheme: scheme });

    for (const path of signedIn) {
      test(`${path} has no WCAG A/AA violations`, async ({ page }) => {
        await page.goto(path);
        const results = await new AxeBuilder({ page }).withTags(tags).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
      });
    }

    test.describe("signed out", () => {
      test.use({ storageState: { cookies: [], origins: [] } });
      test("/sign-in has no WCAG A/AA violations", async ({ page }) => {
        await page.goto("/sign-in");
        const results = await new AxeBuilder({ page }).withTags(tags).analyze();
        expect(results.violations.map((v) => v.id)).toEqual([]);
      });
    });
  });
}
