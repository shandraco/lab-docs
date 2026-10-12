"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { DocumentError, finalizeDraft, saveDraft, setDocumentArchived, startNewVersion } from "@/lib/data/documents";
import type { Answers } from "@/lib/doc/types";
import { requestLogger } from "@/lib/request";

/**
 * Every action: requireUser -> safeParse -> work. Ownership is checked again inside the data
 * layer (partners only reach their own documents). Brain: gate-every-entry-point-to-a-mutation-not-just-the-api.
 */
const cell = z.string().max(5_000);
const AnswersSchema = z
  .record(z.string().max(64), z.union([z.string().max(20_000), z.array(cell).max(200), z.array(z.record(z.string().max(64), cell)).max(200)]))
  .refine((a) => Object.keys(a).length <= 100, "Too many fields");
const Id = z.uuid();
const Title = z.string().trim().min(1, "Give the document a name.").max(160, "Keep the name under 160 characters.");

export type ActionResult = { ok: true; savedAt?: string } | { ok: false; error: string; signedOut?: boolean };

async function run(name: string, fn: () => Promise<ActionResult>): Promise<ActionResult> {
  const log = await requestLogger(`action ${name}`);
  try {
    return await fn();
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, signedOut: true, error: "You have been signed out. Sign in again in a new tab; nothing here is lost." };
    if (err instanceof DocumentError) return { ok: false, error: err.message };
    log.error("action failed", { err });
    return { ok: false, error: "Something went wrong on our side. Your changes are still on this screen; try again in a moment." };
  }
}

export async function saveDraftAction(id: string, answers: Answers, title: string): Promise<ActionResult> {
  return run("saveDraft", async () => {
    const user = await requireUser();
    const parsed = z.object({ id: Id, answers: AnswersSchema, title: Title }).safeParse({ id, answers, title });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Some of that could not be saved." };
    await saveDraft(user, parsed.data.id, parsed.data.answers, parsed.data.title);
    return { ok: true, savedAt: new Date().toISOString() };
  });
}

export async function finalizeAction(id: string, answers: Answers, title: string): Promise<ActionResult> {
  return run("finalize", async () => {
    const user = await requireUser();
    const parsed = z.object({ id: Id, answers: AnswersSchema, title: Title }).safeParse({ id, answers, title });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Some of that could not be saved." };
    await saveDraft(user, parsed.data.id, parsed.data.answers, parsed.data.title);
    await finalizeDraft(user, parsed.data.id, parsed.data.answers);
    revalidatePath(`/documents/${parsed.data.id}`);
    return { ok: true };
  });
}

export async function newVersionAction(id: string): Promise<ActionResult> {
  return run("newVersion", async () => {
    const user = await requireUser();
    const parsed = Id.safeParse(id);
    if (!parsed.success) return { ok: false, error: "Document not found." };
    await startNewVersion(user, parsed.data);
    revalidatePath(`/documents/${parsed.data}`);
    return { ok: true };
  });
}

export async function binAction(id: string): Promise<ActionResult> {
  const result = await run("bin", async () => {
    const user = await requireUser();
    if (!Id.safeParse(id).success || !(await setDocumentArchived(user, id, true))) return { ok: false, error: "Document not found." };
    return { ok: true };
  });
  if (result.ok) redirect(`/?binned=${id}` as never);
  return result;
}

export async function restoreAction(id: string): Promise<ActionResult> {
  return run("restore", async () => {
    const user = await requireUser();
    if (!Id.safeParse(id).success || !(await setDocumentArchived(user, id, false))) return { ok: false, error: "Document not found." };
    revalidatePath("/");
    revalidatePath(`/documents/${id}`);
    return { ok: true };
  });
}
