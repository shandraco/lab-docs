import { formatDate, formatMoney, parseMoney } from "./format";
import type {
  Answer,
  Block,
  ClientDetails,
  Cond,
  Context,
  FieldDef,
  Gap,
  LabDetails,
  RBlock,
  ResolvedDoc,
  Row,
  Run,
  TemplateDefinition,
} from "./types";

export const clientLabels: Record<keyof ClientDetails, string> = {
  name: "Client name",
  legal_name: "Client's legal name",
  entity_description: "Client's company type",
  address: "Client's address",
  contact_name: "Client contact's name",
  contact_title: "Client contact's job title",
  contact_email: "Client contact's email",
};

export const labLabels: Record<keyof LabDetails, string> = {
  name: "Lab name",
  legal_name: "Lab's legal name",
  entity_description: "Lab's company type",
  address: "Lab's postal address",
  email: "Lab email",
  phone: "Lab phone",
  website: "Lab website",
  signer_name: "Lab signer's name",
  signer_title: "Lab signer's job title",
  governing_law: "Governing law (state)",
  venue: "Court location",
};

export function fieldsOf(def: TemplateDefinition): FieldDef[] {
  return def.sections.flatMap((s) => s.fields);
}

function isFilled(a: Answer | undefined): boolean {
  if (a === undefined) return false;
  if (typeof a === "string") return a.trim() !== "";
  return a.some((x) => (typeof x === "string" ? x.trim() !== "" : Object.values(x).some((v) => v.trim() !== "")));
}

export function linesOf(a: Answer | undefined): string[] {
  if (a === undefined) return [];
  const list = typeof a === "string" ? a.split("\n") : a.filter((x): x is string => typeof x === "string");
  return list.map((l) => l.replace(/^\s*[-*•]\s*/, "").trim()).filter(Boolean);
}

export function rowsOf(a: Answer | undefined): Row[] {
  if (!Array.isArray(a)) return [];
  return a.filter((r): r is Row => typeof r === "object" && r !== null && Object.values(r).some((v) => String(v).trim() !== ""));
}

export function rowsTotal(rows: Row[]): number {
  return rows.reduce((sum, r) => sum + (parseMoney(r.amount ?? "") ?? 0), 0);
}

/**
 * Builds the worded document. Never throws on missing answers: each missing required detail
 * becomes a visible gap in the text and an entry in `gaps`, which blocks finalising.
 */
export function resolve(def: TemplateDefinition, ctx: Context): ResolvedDoc {
  const fields = new Map(fieldsOf(def).map((f) => [f.key, f]));
  const gaps = new Map<string, Gap>();
  const answer = (key: string): Answer | undefined => ctx.answers[key] ?? fields.get(key)?.default;

  const addGap = (gap: Gap) => gaps.set(`${gap.where}:${gap.key}`, gap);

  /** One placeholder name -> its text, or null when empty. Records a gap when required. */
  function lookup(name: string, record: boolean): string | null {
    const [scope, rest] = name.includes(".") ? [name.slice(0, name.indexOf(".")), name.slice(name.indexOf(".") + 1)] : ["", name];
    if (scope === "client" && rest in clientLabels) {
      const v = ctx.client[rest as keyof ClientDetails]?.trim();
      if (v) return v;
      if (record) addGap({ label: clientLabels[rest as keyof ClientDetails], where: "client", key: rest });
      return null;
    }
    if (scope === "lab" && rest in labLabels) {
      const v = ctx.lab[rest as keyof LabDetails]?.trim();
      if (v) return v;
      if (record) addGap({ label: labLabels[rest as keyof LabDetails], where: "lab", key: rest });
      return null;
    }
    if (scope === "sender") return (rest === "email" ? ctx.sender.email : ctx.sender.name) || null;
    if (name === "today") return formatDate(ctx.today);
    if (rest === "total" && fields.get(scope)?.type === "rows") {
      const rows = rowsOf(answer(scope));
      if (rows.length) return formatMoney(rowsTotal(rows));
      if (record) addGap({ label: fields.get(scope)!.label, where: "form", key: scope });
      return null;
    }
    const field = fields.get(name);
    if (!field) return `{{${name}}}`; // a template typo shows up in review instead of vanishing
    const a = answer(name);
    if (!isFilled(a)) {
      // Optional only means the form may leave it blank. A placeholder that is actually printed
      // still needs a value, so blocks that use optional fields carry a `when` condition.
      if (record) addGap({ label: field.label, where: "form", key: name });
      return null;
    }
    const raw = typeof a === "string" ? a.trim() : linesOf(a).join(", ");
    if (field.type === "date") return formatDate(raw);
    if (field.type === "money") return formatMoney(raw);
    return raw;
  }

  /** `{{a|b}}` uses the first that is filled; a gap names the first. */
  function placeholder(expr: string): Run {
    const names = expr.split("|").map((s) => s.trim());
    for (const n of names) {
      const v = lookup(n, false);
      if (v !== null) return { text: v };
    }
    const first = names[0] ?? expr;
    lookup(first, true);
    const label = gapLabel(first);
    return { text: label, gap: true };
  }

  function gapLabel(name: string): string {
    if (name.startsWith("client.")) return clientLabels[name.slice(7) as keyof ClientDetails] ?? name;
    if (name.startsWith("lab.")) return labLabels[name.slice(4) as keyof LabDetails] ?? name;
    if (name.endsWith(".total")) return fields.get(name.slice(0, -6))?.label ?? name;
    return fields.get(name)?.label ?? name;
  }

  function runs(text: string): Run[] {
    const out: Run[] = [];
    // Bold spans (**...**) first, then placeholders inside each span.
    text.split(/(\*\*[^*]+\*\*)/).forEach((part) => {
      if (!part) return;
      const bold = part.startsWith("**") && part.endsWith("**");
      const body = bold ? part.slice(2, -2) : part;
      body.split(/(\{\{[^}]+\}\})/).forEach((piece) => {
        if (!piece) return;
        const run: Run = piece.startsWith("{{") ? placeholder(piece.slice(2, -2)) : { text: piece };
        if (run.text === "" && !run.gap) return;
        if (bold) run.b = true;
        const prev = out[out.length - 1];
        if (prev && !prev.gap && !run.gap && Boolean(prev.b) === Boolean(run.b)) prev.text += run.text;
        else out.push(run);
      });
    });
    return out;
  }

  function included(when: Cond | undefined): boolean {
    if (!when) return true;
    const a = answer(when.field);
    if (when.equals !== undefined) return typeof a === "string" && a === when.equals;
    return isFilled(a);
  }

  const blocks: RBlock[] = [];
  let n = 0;
  for (const block of def.blocks as Block[]) {
    if (!included(block.when)) continue;
    switch (block.t) {
      case "h":
        blocks.push({ t: "h", n: ++n, runs: runs(block.text) });
        break;
      case "p":
      case "note":
        blocks.push({ t: block.t, runs: runs(block.text) });
        break;
      case "list":
        blocks.push({ t: "list", items: block.items.map(runs) });
        break;
      case "lines": {
        const items = linesOf(answer(block.field));
        const field = fields.get(block.field);
        if (items.length) blocks.push({ t: "list", items: items.map((i) => [{ text: i }]) });
        else if (field && !field.optional) {
          addGap({ label: field.label, where: "form", key: block.field });
          blocks.push({ t: "list", items: [[{ text: field.label, gap: true }]] });
        }
        break;
      }
      case "rows": {
        const field = fields.get(block.field);
        const columns = field?.columns ?? [];
        const rows = rowsOf(answer(block.field));
        if (!rows.length) {
          if (field && !field.optional) {
            addGap({ label: field.label, where: "form", key: block.field });
            blocks.push({ t: "list", items: [[{ text: field.label, gap: true }]] });
          }
          break;
        }
        const hasAmount = columns.some((c) => c.key === "amount" && c.type === "money");
        blocks.push({
          t: "table",
          columns: columns.map((c) => ({ label: c.label, numeric: c.type === "money" })),
          rows: rows.map((r) =>
            columns.map((c) => {
              const v = (r[c.key] ?? "").trim();
              if (!v) return "";
              return c.type === "money" ? formatMoney(v) : c.type === "date" ? formatDate(v) : v;
            }),
          ),
          total: hasAmount ? formatMoney(rowsTotal(rows)) : undefined,
        });
        break;
      }
      case "signatures":
        blocks.push({
          t: "signatures",
          parties: [
            { org: runs("{{lab.legal_name|lab.name}}"), name: runs("{{lab.signer_name}}"), title: runs("{{lab.signer_title}}") },
            {
              org: runs("{{client.legal_name|client.name}}"),
              name: runs("{{client.contact_name}}"),
              title: runs("{{client.contact_title}}"),
            },
          ],
        });
        break;
    }
  }

  return {
    kind: def.kind,
    format: def.format,
    heading: runs(def.heading),
    subject: def.subject ? runs(def.subject) : undefined,
    date: formatDate(ctx.today),
    blocks,
    gaps: [...gaps.values()],
  };
}

/** Plain text of a run list, gaps shown as [Label]. */
export function plain(runs: Run[]): string {
  return runs.map((r) => (r.gap ? `[${r.text}]` : r.text)).join("");
}
