import "server-only";
import { randomUUID } from "node:crypto";
import type { Role } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { audit } from "./audit";

export interface Person {
  id: string;
  name: string;
  email: string;
  role: Role;
  deactivatedAt: Date | null;
  createdAt: Date;
}

export class PeopleError extends Error {
  override name = "PeopleError";
}

export async function listPeople(): Promise<Person[]> {
  return query(`select id, name, email, role, "deactivatedAt", "createdAt" from "user" order by "deactivatedAt" nulls first, lower(name)`);
}

/** Owner only; the caller checks the role. The new person signs in with a code sent to this address. */
export async function addPerson(actorId: string, input: { name: string; email: string; role: Role }): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (await one(`select 1 from "user" where email = $1`, [email])) throw new PeopleError("Someone with that email is already here.");
  const id = randomUUID();
  // Same row Better Auth would write; sign-up is closed, so this is the only way in.
  await query(`insert into "user" (id, name, email, "emailVerified", role) values ($1, $2, $3, false, $4)`, [id, input.name.trim(), email, input.role]);
  await audit(actorId, "person.add", "user", id, { role: input.role });
}

async function activeOwners(): Promise<number> {
  return (await one<{ n: number }>(`select count(*)::int as n from "user" where role = 'owner' and "deactivatedAt" is null`))!.n;
}

export async function setRole(actorId: string, userId: string, role: Role): Promise<void> {
  const person = await one<Person>(`select id, role, "deactivatedAt" from "user" where id = $1`, [userId]);
  if (!person) throw new PeopleError("Person not found.");
  if (person.role === "owner" && role !== "owner" && (await activeOwners()) <= 1) {
    throw new PeopleError("There must always be at least one owner. Make someone else an owner first.");
  }
  await query(`update "user" set role = $2, "updatedAt" = now() where id = $1`, [userId, role]);
  await audit(actorId, "person.role", "user", userId, { role });
}

/** Switching someone off also signs them out everywhere. Undo by switching them back on. */
export async function setActive(actorId: string, userId: string, active: boolean): Promise<void> {
  if (!active && userId === actorId) throw new PeopleError("You cannot switch off your own access.");
  const person = await one<Person>(`select id, role from "user" where id = $1`, [userId]);
  if (!person) throw new PeopleError("Person not found.");
  if (!active && person.role === "owner" && (await activeOwners()) <= 1) {
    throw new PeopleError("There must always be at least one owner.");
  }
  await query(`update "user" set "deactivatedAt" = ${active ? "null" : "now()"}, "updatedAt" = now() where id = $1`, [userId]);
  if (!active) await query(`delete from session where "userId" = $1`, [userId]);
  await audit(actorId, active ? "person.reactivate" : "person.deactivate", "user", userId);
}
