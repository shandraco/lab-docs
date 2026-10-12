"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/lib/auth";
import { clientKeys, createClient, setClientArchived, updateClient, type ClientInput } from "@/lib/data/clients";
import { requestLogger } from "@/lib/request";

export type ClientFormState = {
  attempt: number;
  errors: Partial<Record<keyof ClientInput, string>>;
  formError?: string;
  values: Partial<ClientInput>;
  saved?: boolean;
};

const short = z.string().trim().max(200, "Keep this under 200 characters.");
const Schema = z.object({
  name: z.string().trim().min(1, "Enter the client's name.").max(200, "Keep this under 200 characters."),
  legal_name: short,
  entity_description: short,
  address: z.string().trim().max(500, "Keep the address under 500 characters."),
  contact_name: short,
  contact_title: short,
  contact_email: z.union([z.literal(""), z.email("Enter an email address like name@example.com, or leave it blank.")]),
  notes: z.string().trim().max(5000, "Keep notes under 5,000 characters."),
});

/** Only back to a page in this app, never to another site. */
const safeBack = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  return /^\/(documents|new)(\/[\w-]*)?(\?[\w=&-]*)?$/.test(s) ? s : null;
};

export async function saveClientAction(prev: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const log = await requestLogger("action saveClient");
  const values = Object.fromEntries(clientKeys.map((k) => [k, String(formData.get(k) ?? "")])) as ClientInput;
  values.contact_email = values.contact_email.trim();
  const attempt = prev.attempt + 1;
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof UnauthorizedError) return { attempt, errors: {}, values, formError: "You have been signed out. Sign in again in a new tab, then save; your answers are still here." };
    throw err;
  }
  const parsed = Schema.safeParse(values);
  if (!parsed.success) {
    const errors: ClientFormState["errors"] = {};
    for (const i of parsed.error.issues) errors[i.path[0] as keyof ClientInput] ??= i.message;
    return { attempt, errors, values };
  }
  const id = String(formData.get("id") ?? "");
  const back = safeBack(formData.get("back"));
  if (id) {
    if (!(await updateClient(user, id, parsed.data))) return { attempt, errors: {}, values, formError: "This client could not be found." };
    log.info("client updated", { id, actor: user.id });
    revalidatePath(`/clients/${id}`);
    if (back) redirect(back as never);
    return { attempt, errors: {}, values: parsed.data, saved: true };
  }
  const client = await createClient(user, parsed.data);
  log.info("client created", { id: client.id, actor: user.id });
  revalidatePath("/clients");
  redirect((formData.get("then") === "document" ? `/new?client=${client.id}` : `/clients/${client.id}?added=1`) as never);
}

export async function archiveClientAction(id: string, archived: boolean): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  if (!z.uuid().safeParse(id).success || !(await setClientArchived(user, id, archived))) return { ok: false, error: "This client could not be found." };
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { ok: true };
}
