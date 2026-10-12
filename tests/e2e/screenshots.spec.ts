import { test } from "@playwright/test";

/**
 * `pnpm screenshots` reuses the last build: full-page PNGs at phone and desktop widths, light
 * and dark, into ./screenshots (or $SCREENSHOT_DIR). Skipped in the normal e2e run. Look at them.
 */
const dir = process.env.SCREENSHOT_DIR ?? "screenshots";
const shots = [
  ["documents", "/"],
  ["new", "/new"],
  ["clients", "/clients"],
  ["client-errors", "/clients/new#errors"],
  ["templates", "/templates"],
  ["lab-details", "/settings"],
  ["people", "/people"],
  ["not-found", "/no-such-page"],
] as const;

test.skip(!process.env.SCREENSHOTS, "set SCREENSHOTS=1 to capture");

for (const width of [390, 1366]) {
  for (const scheme of ["light", "dark"] as const) {
    test(`screenshots ${width} ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
      for (const [name, path] of shots) {
        await page.goto(path.replace("#errors", ""));
        if (path.endsWith("#errors")) {
          await page.getByRole("button", { name: /^Save/ }).first().click();
          await page.getByText("There is a problem").waitFor();
        }
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: `${dir}/${name}-${width}-${scheme}.png`, fullPage: true });
      }
    });
  }
}
