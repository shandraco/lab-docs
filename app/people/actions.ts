"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/auth";
import { addPerson, PeopleError, setActive, setRole } from "@/lib/data/people";

export type AddPersonState = { attempt: number; errors: { name?: string; email?: string; role?: string }; formError?: string; values: Record<string, string>; added?: string };

const Role = z.enum(["owner", "staff", "partner"], { message: "Choose what they can do." });
const Schema = z.object({
  name: z.string().trim().min(1, "Enter their name.").max(120, "Keep the name under 120 characters."),
  email: z.email("Enter an email address like name@example.com"),
  role: Role,
});

async function owner() {
  try {
    return await requireRole("owner");
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) return null;
    throw err;
  }
}

export async function addPersonAction(prev: AddPersonState, formData: FormData): Promise<AddPersonState> {
  const values = { name: String(formData.get("name") ?? ""), email: String(formData.get("email") ?? "").trim().toLowerCase(), role: String(formData.get("role") ?? "") };
  const attempt = prev.attempt + 1;
  const user = await owner();
  if (!user) return { attempt, errors: {}, values, formError: "Only the lab owner can add people. If you are the owner, sign in again." };
  const parsed = Schema.safeParse(values);
  if (!parsed.success) {
    const errors: AddPersonState["errors"] = {};
    for (const i of parsed.error.issues) errors[i.path[0] as keyof AddPersonState["errors"]] ??= i.message;
    return { attempt, errors, values };
  }
  try {
    await addPerson(user.id, parsed.data);
  } catch (err) {
    if (err instanceof PeopleError) return { attempt, errors: { email: err.message }, values };
    throw err;
  }
  revalidatePath("/people");
  return { attempt, errors: {}, values: {}, added: `${parsed.data.name} can now sign in at this address with an emailed code. Let them know.` };
}

export async function changePersonAction(userId: string, change: { role?: string; active?: boolean }): Promise<{ ok: boolean; error?: string }> {
  const user = await owner();
  if (!user) return { ok: false, error: "Only the lab owner can do this." };
  try {
    if (change.role !== undefined) {
      const r = Role.safeParse(change.role);
      if (!r.success) return { ok: false, error: "Choose a role." };
      await setRole(user.id, userId, r.data);
    }
    if (change.active !== undefined) await setActive(user.id, userId, change.active);
  } catch (err) {
    if (err instanceof PeopleError) return { ok: false, error: err.message };
    throw err;
  }
  revalidatePath("/people");
  return { ok: true };
}
