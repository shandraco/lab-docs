// Applies db/migrations/*.sql in name order, once each, each in its own transaction.
// Usage: node --env-file=.env.local scripts/migrate.ts
// Before running against production, make a Neon backup branch
// (backup-before-<change>-<date>); Brain: sow-written-ahead-of-build.
import { readdirSync, readFileSync } from "node:fs";
import { Client } from "pg";

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(
  "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
);
const done = new Set((await client.query<{ name: string }>("select name from schema_migrations")).rows.map((r) => r.name));
const files = readdirSync("db/migrations").filter((f) => f.endsWith(".sql")).sort();

let applied = 0;
for (const file of files) {
  if (done.has(file)) continue;
  try {
    await client.query("begin");
    await client.query(readFileSync(`db/migrations/${file}`, "utf8"));
    await client.query("insert into schema_migrations (name) values ($1)", [file]);
    await client.query("commit");
    console.log(`applied ${file}`);
    applied++;
  } catch (err) {
    await client.query("rollback");
    console.error(`failed ${file}:`, (err as Error).message);
    process.exitCode = 1;
    break;
  }
}
if (!applied && !process.exitCode) console.log("nothing to apply");
await client.end();
