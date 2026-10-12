import { readFileSync } from "node:fs";
import { expect, test as setup } from "@playwright/test";
import { SERVER_LOG, testPeople } from "./env";

/**
 * Signs each test person in once through the real email-code form and saves the session.
 * The log redacts email addresses, so people sign in one at a time and each takes the first
 * code logged after its own request.
 */
setup.describe.configure({ mode: "serial" });

const codesInLog = () => [...readFileSync(SERVER_LOG, "utf8").matchAll(/"code":"(\d{6})"/g)].map((m) => m[1]!);

for (const person of testPeople) {
  setup(`sign in as ${person.role}`, async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/sign-in/);
    const before = codesInLog().length;
    await page.getByLabel("Your work email").fill(`  ${person.email.toUpperCase()} `);
    await page.getByRole("button", { name: "Email me a code" }).click();
    await expect(page.getByLabel("Code from the email")).toBeVisible();

    let code: string | undefined;
    await expect.poll(() => (code = codesInLog()[before]), { timeout: 10_000 }).toBeTruthy();
    await page.getByLabel("Code from the email").fill(code!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Documents", exact: true })).toBeVisible();
    await page.context().storageState({ path: person.state });
  });
}
