"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { createDocument, DocumentError } from "@/lib/data/documents";
import { getTemplate } from "@/lib/data/templates";
import { getClient } from "@/lib/data/clients";
import { requestLogger } from "@/lib/request";

export type NewDocState = { attempt: number; errors: { template?: string; client?: string; title?: string }; formError?: string; values: Record<string, string> };

const Schema = z.object({
  template: z.string().min(1, "Choose what kind of document to make."),
  client: z.string().min(1, "Choose who it is for."),
  title: z.string().trim().max(160, "Keep the name under 160 characters."),
});

/** requireUser -> safeParse -> work (Brain: next-middleware-cannot-gate-server-actions). */
export async function createDocumentAction(prev: NewDocState, formData: FormData): Promise<NewDocState> {
  const log = await requestLogger("action createDocument");
  const values = { template: String(formData.get("template") ?? ""), client: String(formData.get("client") ?? ""), title: String(formData.get("title") ?? "") };
  const attempt = prev.attempt + 1;
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) return { attempt, errors: {}, values, formError: "You have been signed out. Sign in again; your choices are still here." };
    throw err;
  }
  const parsed = Schema.safeParse(values);
  if (!parsed.success) {
    const errors: NewDocState["errors"] = {};
    for (const i of parsed.error.issues) errors[i.path[0] as keyof NewDocState["errors"]] ??= i.message;
    return { attempt, errors, values };
  }
  const [template, client] = await Promise.all([getTemplate(parsed.data.template), getClient(user, parsed.data.client)]);
  if (!template) return { attempt, errors: { template: "Choose what kind of document to make." }, values };
  if (!client) return { attempt, errors: { client: "Choose who it is for." }, values };

  let id: string;
  try {
    id = await createDocument(user, { templateId: template.id, clientId: client.id, title: parsed.data.title || `${template.name} for ${client.name}` });
  } catch (err) {
    if (err instanceof DocumentError) return { attempt, errors: {}, values, formError: err.message };
    throw err;
  }
  log.info("document created", { id, template: template.id, actor: user.id });
  redirect(`/documents/${id}` as never);
}
