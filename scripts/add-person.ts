// Adds the first owner (or anyone) from the terminal. After that, use the People page.
// Usage: pnpm person:add "Sam Rivera" sam@example.com owner
import { randomUUID } from "node:crypto";
import { Client } from "pg";

const [name, email, role = "staff"] = process.argv.slice(2);
if (!name || !email || !["owner", "staff", "partner"].includes(role)) {
  console.error('Usage: pnpm person:add "Full Name" email@example.com owner|staff|partner');
  process.exit(1);
}
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const res = await db.query(
  `insert into "user" (id, name, email, "emailVerified", role) values ($1, $2, $3, false, $4)
   on conflict (email) do update set role = excluded.role, name = excluded.name, "deactivatedAt" = null returning id`,
  [randomUUID(), name, email.trim().toLowerCase(), role],
);
console.log(`${email} is ${role === "owner" ? "an" : "a"} ${role} (id ${res.rows[0].id}). They sign in with a code sent to that address.`);
await db.end();
