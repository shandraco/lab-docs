// Loads the starter templates. Safe to re-run: a template whose wording changed gets a new
// version; unchanged ones are left alone, and existing documents keep the version they used.
// Usage: pnpm db:seed
import { Client } from "pg";
import { starterTemplates } from "../lib/templates/index";

/** Postgres jsonb reorders object keys, so compare with keys sorted on both sides. */
const canonical = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === "object"
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical((v as Record<string, unknown>)[k])]))
      : v;

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
for (const t of starterTemplates) {
  await db.query(
    `insert into templates (id, kind, name, summary, sort) values ($1, $2, $3, $4, $5)
     on conflict (id) do update set name = excluded.name, summary = excluded.summary, sort = excluded.sort`,
    [t.id, t.definition.kind, t.name, t.summary, t.sort],
  );
  const latest = (
    await db.query<{ number: number; definition: unknown }>(
      `select number, definition from template_versions where template_id = $1 order by number desc limit 1`,
      [t.id],
    )
  ).rows[0];
  const same = latest && JSON.stringify(canonical(latest.definition)) === JSON.stringify(canonical(t.definition));
  if (same) {
    console.log(`${t.id}: unchanged (version ${latest.number})`);
    continue;
  }
  const number = (latest?.number ?? 0) + 1;
  await db.query(`insert into template_versions (template_id, number, definition) values ($1, $2, $3)`, [t.id, number, t.definition]);
  console.log(`${t.id}: saved version ${number}`);
}
await db.end();
