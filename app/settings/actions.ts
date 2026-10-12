"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole, ForbiddenError, UnauthorizedError } from "@/lib/auth";
import { labKeys, updateLab } from "@/lib/data/settings";
import type { LabDetails } from "@/lib/doc/types";

export type LabFormState = { attempt: number; errors: Partial<Record<keyof LabDetails, string>>; formError?: string; values: Partial<LabDetails>; saved?: boolean };

const s = z.string().trim().max(300, "Keep this under 300 characters.");
const Schema = z.object(Object.fromEntries(labKeys.map((k) => [k, s])) as Record<keyof LabDetails, typeof s>).extend({
  email: z.union([z.literal(""), z.email("Enter an email address like hello@yourlab.com, or leave it blank.")]),
  address: z.string().trim().max(500, "Keep the address under 500 characters."),
});

export async function saveLabAction(prev: LabFormState, formData: FormData): Promise<LabFormState> {
  const values = Object.fromEntries(labKeys.map((k) => [k, String(formData.get(k) ?? "").trim()])) as unknown as LabDetails;
  const attempt = prev.attempt + 1;
  let user;
  try {
    user = await requireRole("owner");
  } catch (err) {
    if (err instanceof UnauthorizedError) return { attempt, errors: {}, values, formError: "You have been signed out. Sign in again in a new tab, then save." };
    if (err instanceof ForbiddenError) return { attempt, errors: {}, values, formError: "Only the lab owner can change these details." };
    throw err;
  }
  const parsed = Schema.safeParse(values);
  if (!parsed.success) {
    const errors: LabFormState["errors"] = {};
    for (const i of parsed.error.issues) errors[i.path[0] as keyof LabDetails] ??= i.message;
    return { attempt, errors, values };
  }
  await updateLab(user.id, parsed.data);
  revalidatePath("/", "layout");
  const back = String(formData.get("back") ?? "");
  if (/^\/documents\/[\w-]+$/.test(back)) redirect(back as never);
  return { attempt, errors: {}, values: parsed.data, saved: true };
}
