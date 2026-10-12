import "server-only";
import { one, query } from "@/lib/db";
import type { DocKind, TemplateDefinition } from "@/lib/doc/types";
import { audit } from "./audit";

export interface TemplateSummary {
  id: string;
  kind: DocKind;
  name: string;
  summary: string;
  version_id: string;
  version: number;
  attorney_reviewed_at: Date | null;
}

/** Each template with its newest version, in menu order. */
export async function listTemplates(): Promise<TemplateSummary[]> {
  return query(
    `select t.id, t.kind, t.name, t.summary, v.id as version_id, v.number as version, v.attorney_reviewed_at
       from templates t
       join lateral (select * from template_versions where template_id = t.id order by number desc limit 1) v on true
      order by t.sort`,
  );
}

export async function getTemplate(id: string): Promise<TemplateSummary | null> {
  return (await listTemplates()).find((t) => t.id === id) ?? null;
}

export async function getTemplateVersion(versionId: string): Promise<{ definition: TemplateDefinition; number: number; attorney_reviewed_at: Date | null } | null> {
  return one(`select definition, number, attorney_reviewed_at from template_versions where id = $1`, [versionId]);
}

/** Owner only; the caller checks the role. Recording the review is the one change a version allows. */
export async function setReviewed(actorId: string, versionId: string, reviewed: boolean): Promise<void> {
  await query(
    `update template_versions set attorney_reviewed_at = ${reviewed ? "now()" : "null"}, attorney_reviewed_by = ${reviewed ? "$2" : "null"} where id = $1`,
    reviewed ? [versionId, actorId] : [versionId],
  );
  await audit(actorId, reviewed ? "template.reviewed" : "template.unreviewed", "template_version", versionId);
}
