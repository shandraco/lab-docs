import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import pg from "pg";
import { LIMITED, TEST_DB, testPeople, VICTIM } from "./env";

/**
 * Every run starts from an empty test database: migrations, starter templates, and four people
 * (an owner, a partner, and two who only ask for codes). Refuses any database whose name does not end in _test.
 */
export default async function globalSetup() {
  if (!/_test$/.test(new URL(TEST_DB).pathname)) throw new Error(`E2E_DATABASE_URL must name a *_test database, because the e2e run wipes it. Got ${TEST_DB}`);
  rmSync(".e2e/auth", { recursive: true, force: true });
  mkdirSync(".e2e/auth", { recursive: true });

  const client = new pg.Client({ connectionString: TEST_DB });
  await client.connect();
  await client.query("drop schema public cascade; create schema public;");
  await client.end();

  const env = { ...process.env, DATABASE_URL: TEST_DB };
  const pnpm = (...args: string[]) => execFileSync("pnpm", ["-s", ...args], { env, stdio: "pipe" });
  pnpm("db:migrate");
  pnpm("db:seed");
  for (const p of [...testPeople, LIMITED, VICTIM]) pnpm("person:add", p.name, p.email, p.role);
}
