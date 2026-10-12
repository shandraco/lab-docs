import "server-only";
import { createHash } from "node:crypto";
import { seesEverything, type User } from "@/lib/auth";
import { one, query, tx } from "@/lib/db";
import { resolve } from "@/lib/doc/resolve";
import { todayIso } from "@/lib/doc/format";
import type { Answers, ClientDetails, Context, DocKind, LabDetails, ResolvedDoc, TemplateDefinition } from "@/lib/doc/types";
import { audit } from "./audit";
import { getClient, isUuid, type Client } from "./clients";
import { getLab } from "./settings";

export interface DocumentRow {
  id: string;
  title: string;
  template_id: string;
  template_name: string;
  kind: DocKind;
  client_id: string;
  client_name: string;
  version: number;
  status: "draft" | "final";
  updated_at: Date;
  archived_at: Date | null;
  created_by: string;
  author: string;
}

export interface Version {
  id: string;
  number: number;
  template_version_id: string;
  template_version: number;
  answers: Answers;
  snapshot: ResolvedDoc | null;
  content_hash: string | null;
  finalized_at: Date | null;
  finalized_by_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export class DocumentError extends Error {
  override name = "DocumentError";
}

const listSql = (where: string) => `
  select d.id, d.title, d.template_id, t.name as template_name, t.kind, d.client_id, c.name as client_name,
         v.number as version, case when v.finalized_at is null then 'draft' else 'final' end as status,
         d.updated_at, d.archived_at, d.created_by, u.name as author
    from documents d
    join templates t on t.id = d.template_id
    join clients c on c.id = d.client_id
    join "user" u on u.id = d.created_by
    join lateral (select number, finalized_at from document_versions where document_id = d.id order by number desc limit 1) v on true
   where ${where}`;

const scope = (user: User) => (seesEverything(user) ? "$1::text is not null" : "d.created_by = $1");

export async function listDocuments(user: User, opts: { clientId?: string; limit?: number } = {}): Promise<DocumentRow[]> {
  const params: unknown[] = [user.id];
  let where = `d.archived_at is null and ${scope(user)}`;
  if (opts.clientId) {
    params.push(opts.clientId);
    where += ` and d.client_id = $${params.length}`;
  }
  params.push(opts.limit ?? 200);
  return query(`${listSql(where)} order by d.updated_at desc limit $${params.length}`, params);
}

export async function getDocument(user: User, id: string): Promise<DocumentRow | null> {
  if (!isUuid(id)) return null;
  return one(listSql(`d.id = $2 and ${scope(user)}`), [user.id, id]);
}

export async function listVersions(documentId: string): Promise<Version[]> {
  return query(
    `select dv.id, dv.number, dv.template_version_id, tv.number as template_version, dv.answers, dv.snapshot, dv.content_hash,
            dv.finalized_at, u.name as finalized_by_name, dv.created_at, dv.updated_at
       from document_versions dv
       join template_versions tv on tv.id = dv.template_version_id
       left join "user" u on u.id = dv.finalized_by
      where dv.document_id = $1 order by dv.number desc`,
    [documentId],
  );
}

export async function createDocument(user: User, input: { templateId: string; clientId: string; title: string }): Promise<string> {
  const client = await getClient(user, input.clientId);
  if (!client || client.archived_at) throw new DocumentError("Choose a client from the list.");
  return tx(async (db) => {
    const tv = (
      await db.query<{ id: string }>(`select id from template_versions where template_id = $1 order by number desc limit 1`, [input.templateId])
    ).rows[0];
    if (!tv) throw new DocumentError("That document type is not available.");
    const doc = (
      await db.query<{ id: string }>(
        `insert into documents (template_id, client_id, title, created_by) values ($1, $2, $3, $4) returning id`,
        [input.templateId, input.clientId, input.title, user.id],
      )
    ).rows[0]!;
    await db.query(
      `insert into document_versions (document_id, number, template_version_id, created_by) values ($1, 1, $2, $3)`,
      [doc.id, tv.id, user.id],
    );
    await audit(user.id, "document.create", "document", doc.id, { template: input.templateId }, db);
    return doc.id;
  });
}

/** Saves the draft's answers. A final version cannot be saved over; the database refuses too. */
export async function saveDraft(user: User, documentId: string, answers: Answers, title?: string): Promise<void> {
  const doc = await getDocument(user, documentId);
  if (!doc) throw new DocumentError("Document not found.");
  if (doc.archived_at) throw new DocumentError("This document is in the bin. Restore it to edit.");
  await tx(async (db) => {
    const res = await db.query(
      `update document_versions set answers = $2, updated_at = now() where document_id = $1 and finalized_at is null`,
      [documentId, answers],
    );
    if (res.rowCount === 0) throw new DocumentError("This version is final. Start a new version to make changes.");
    await db.query(`update documents set updated_at = now()${title ? ", title = $2" : ""} where id = $1`, title ? [documentId, title] : [documentId]);
  });
}

/** Everything resolve() needs for one version. Drafts read the live client and lab records. */
export async function contextFor(user: User, doc: DocumentRow, answers: Answers): Promise<{ ctx: Context; client: Client; lab: LabDetails }> {
  const [client, lab] = await Promise.all([getClient(user, doc.client_id), getLab()]);
  if (!client) throw new DocumentError("Client not found.");
  return { ctx: { answers, client: client as ClientDetails, lab, sender: { name: user.name, email: user.email }, today: todayIso() }, client, lab };
}

export function hashSnapshot(snapshot: ResolvedDoc): string {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

/**
 * Freezes the draft: words it once more on the server (never trusting a browser copy),
 * refuses if anything is missing, then stores the wording and its SHA-256.
 */
export async function finalizeDraft(user: User, documentId: string, answers: Answers): Promise<{ number: number; hash: string }> {
  await saveDraft(user, documentId, answers);
  const doc = (await getDocument(user, documentId))!;
  const draft = (await listVersions(documentId)).find((v) => !v.finalized_at);
  if (!draft) throw new DocumentError("This version is already final.");
  const tv = await one<{ definition: TemplateDefinition }>(`select definition from template_versions where id = $1`, [draft.template_version_id]);
  const { ctx } = await contextFor(user, doc, draft.answers);
  const snapshot = resolve(tv!.definition, ctx);
  if (snapshot.gaps.length) {
    throw new DocumentError(`Fill in ${snapshot.gaps.length === 1 ? "1 missing detail" : `${snapshot.gaps.length} missing details`} first.`);
  }
  const hash = hashSnapshot(snapshot);
  await tx(async (db) => {
    await db.query(
      `update document_versions set snapshot = $2, content_hash = $3, finalized_at = now(), finalized_by = $4, updated_at = now()
        where id = $1 and finalized_at is null`,
      [draft.id, snapshot, hash, user.id],
    );
    await db.query(`update documents set updated_at = now() where id = $1`, [documentId]);
    await audit(user.id, "document.finalize", "document", documentId, { version: draft.number, hash }, db);
  });
  return { number: draft.number, hash };
}

/** Starts the next draft from the latest final version's answers, on the newest template wording. */
export async function startNewVersion(user: User, documentId: string): Promise<number> {
  const doc = await getDocument(user, documentId);
  if (!doc) throw new DocumentError("Document not found.");
  return tx(async (db) => {
    const latest = (
      await db.query<{ number: number; answers: Answers; finalized_at: Date | null }>(
        `select number, answers, finalized_at from document_versions where document_id = $1 order by number desc limit 1 for update`,
        [documentId],
      )
    ).rows[0]!;
    if (!latest.finalized_at) return latest.number; // a draft already exists; reuse it
    const tv = (await db.query<{ id: string }>(`select id from template_versions where template_id = $1 order by number desc limit 1`, [doc.template_id])).rows[0]!;
    await db.query(
      `insert into document_versions (document_id, number, template_version_id, answers, created_by) values ($1, $2, $3, $4, $5)`,
      [documentId, latest.number + 1, tv.id, latest.answers, user.id],
    );
    await db.query(`update documents set updated_at = now() where id = $1`, [documentId]);
    await audit(user.id, "document.new_version", "document", documentId, { version: latest.number + 1 }, db);
    return latest.number + 1;
  });
}

export async function setDocumentArchived(user: User, documentId: string, archived: boolean): Promise<boolean> {
  const doc = await getDocument(user, documentId);
  if (!doc) return false;
  await query(`update documents set archived_at = ${archived ? "now()" : "null"} where id = $1`, [documentId]);
  await audit(user.id, archived ? "document.archive" : "document.restore", "document", documentId);
  return true;
}
