import { expect, test } from "@playwright/test";
import { OWNER, PARTNER } from "./env";

/** Partners see only what they made; owner pages do not exist for anyone else. */
test("a partner cannot see the owner's clients or the owner pages", async ({ browser }) => {
  const owner = await browser.newContext({ storageState: OWNER.state });
  const partner = await browser.newContext({ storageState: PARTNER.state });
  const o = await owner.newPage();
  const p = await partner.newPage();

  await o.goto("/clients/new");
  await o.getByLabel("Client name").fill("Owner Only Co");
  await o.getByRole("button", { name: /^Save/ }).first().click();
  await expect(o).toHaveURL(/\/clients\/[\da-f-]{36}\?added=1$/, { timeout: 15_000 });
  const clientPath = new URL(o.url()).pathname;

  expect((await p.goto(clientPath))?.status()).toBe(404);
  await p.goto("/clients");
  await expect(p.getByText("Owner Only Co")).toHaveCount(0);
  for (const path of ["/settings", "/people", "/templates"]) {
    expect((await p.goto(path))?.status(), path).toBe(404);
  }
  await p.goto("/");
  for (const name of ["Lab details", "People", "Templates"]) {
    await expect(p.getByRole("link", { name, exact: true })).toHaveCount(0);
  }

  await owner.close();
  await partner.close();
});
