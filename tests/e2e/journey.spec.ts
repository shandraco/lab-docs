import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * The one job, end to end, as the owner: lab details, a client, a SOW filled in until nothing is
 * missing, both downloads, mark as final, and a new version. Fails on any console error (a CSP
 * block shows up there).
 */
const axe = (page: Page) => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();

test("make, download and finalize a Statement of Work", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("console", (m) => void (m.type() === "error" && errors.push(m.text())));
  page.on("pageerror", (e) => errors.push(e.message));

  await test.step("lab details", async () => {
    await page.goto("/settings");
    for (const [label, value] of [
      ["Lab name", "Northfield Lab"],
      ["Legal name", "Northfield Lab LLC"],
      ["Type of company", "a Kansas limited liability company"],
      ["Postal address", "100 Main St, Wichita, KS 67202"],
      ["Email", "hello@northfield.test"],
      ["Name of the person who signs contracts", "Sam Rivera"],
      ["Their job title", "Managing Director"],
      ["Whose law governs your contracts", "Kansas"],
      ["Which courts hear disputes", "Sedgwick County, Kansas"],
    ]) {
      await page.getByLabel(label!, { exact: true }).fill(value!);
    }
    await page.getByRole("button", { name: "Save lab details" }).click();
    await expect(page.getByText("Saved. New documents use these details.")).toBeVisible();
  });

  await test.step("add a client on the way to a document", async () => {
    await page.goto("/clients/new?then=document");
    await page.getByRole("button", { name: "Save and make a document" }).click();
    await expect(page.getByText("There is a problem")).toBeVisible();
    expect((await axe(page)).violations.map((v) => v.id)).toEqual([]);

    await page.getByLabel("Client name").fill("Acme");
    await page.getByLabel("Legal name").fill("Acme Widgets Inc.");
    await page.getByLabel("Type of company").fill("a Delaware corporation");
    await page.getByLabel("Postal address").fill("1 Industrial Way, Austin, TX 78701");
    await page.getByLabel("Contact's name").fill("Jo Park");
    await page.getByLabel("Contact's job title").fill("COO");
    await page.getByLabel("Contact's email").fill("jo@acme.test");
    await page.getByRole("button", { name: "Save and make a document" }).click();
    await expect(page).toHaveURL(/\/new\?client=/);
    await expect(page.getByRole("combobox")).toHaveText(/Acme/);
  });

  await test.step("start a SOW", async () => {
    await page.locator("#template-sow").check();
    await page.getByRole("button", { name: "Start the document" }).click();
    await expect(page).toHaveURL(/\/documents\/[\da-f-]{36}$/);
    await expect(page.getByRole("heading", { name: /details? missing/ })).toBeVisible();
    expect((await axe(page)).violations.map((v) => v.id)).toEqual([]);
  });

  await test.step("fill it in until nothing is missing", async () => {
    await page.getByLabel("Project name").fill("Booking app");
    await page.getByLabel("Date of the signed Master Services Agreement").fill("2026-10-01");
    await page.getByLabel("Start date").fill("2026-11-02");
    await page.getByLabel("What the project is, in two or three sentences").fill("A web app that lets Acme's customers book service visits online.");
    await page.locator("#f-deliverables").fill("Booking web app");
    await page.getByLabel("Done when, line 1").fill("Customers can book, move and cancel a visit");
    await page.getByLabel("Not included").fill("Native mobile apps\nHosting costs");
    await page.getByLabel("Assumptions").fill("Acme supplies all copy and photos");
    await page.getByLabel("What the client needs to provide").fill("Brand assets\nAccess to the current calendar");
    await page.locator("#f-milestones").fill("Launch");
    await page.getByLabel("Target date, line 1").fill("2026-12-15");
    await page.locator("#f-fees").fill("Deposit");
    await page.getByLabel("Amount, line 1").fill("6000");
    await page.locator('[data-field="fees"]').getByRole("button", { name: "Add a line" }).click();
    await expect(page.getByLabel("Amount, line 1")).toHaveValue("$6,000.00"); // tidied on leaving the box
    await page.getByLabel("Item, line 2").fill("On acceptance");
    await page.getByLabel("Amount, line 2").fill("$6,000");
    await page.getByLabel("Your project lead").fill("Sam Rivera");

    await expect(page.getByText("Everything is filled in.")).toBeVisible();
    await expect(page.getByText("All changes saved.")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("$12,000.00").first()).toBeVisible(); // the fees total on the sheet
  });

  await test.step("downloads are real files", async () => {
    for (const [button, magic, ext] of [["Download PDF", "%PDF", ".pdf"], ["Download Word", "PK", ".docx"]] as const) {
      const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: button }).click()]);
      expect(dl.suggestedFilename()).toBe(`Statement of Work for Acme - v1 DRAFT${ext}`);
      const stream = await dl.createReadStream();
      const first = await new Promise<Buffer>((resolve) => stream.once("data", (c) => resolve(Buffer.from(c))));
      stream.destroy();
      expect(first.subarray(0, magic.length).toString()).toBe(magic);
    }
  });

  await test.step("answers survive a reload", async () => {
    await page.reload();
    await expect(page.getByLabel("Project name")).toHaveValue("Booking app");
  });

  await test.step("mark as final, then start version 2 from it", async () => {
    await page.getByRole("button", { name: "Mark as final" }).click();
    await expect(page.getByText("Version 1 is final")).toBeVisible({ timeout: 10_000 });
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download PDF" }).click()]);
    expect(dl.suggestedFilename()).toBe("Statement of Work for Acme - v1.pdf");

    await page.getByRole("button", { name: "Make changes in version 2" }).click();
    await expect(page.getByLabel("Project name")).toHaveValue("Booking app");
    await expect(page.getByText(/Final, version 1/)).toBeVisible();
  });

  await test.step("fits a phone", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  expect(errors).toEqual([]);
});
