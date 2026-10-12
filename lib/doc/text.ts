import { plain } from "./resolve";
import type { RBlock, ResolvedDoc } from "./types";

function blockText(b: RBlock): string {
  switch (b.t) {
    case "h":
      return `${b.n}. ${plain(b.runs)}`;
    case "p":
    case "note":
      return plain(b.runs);
    case "list":
      return b.items.map((i) => `- ${plain(i)}`).join("\n");
    case "table":
      return [...b.rows.map((r) => r.filter(Boolean).join(": ")), ...(b.total ? [`Total: ${b.total}`] : [])].join("\n");
    case "signatures":
      return "";
  }
}

/** Paste-ready email: subject and body, gaps shown as [Label] so nothing goes out half-filled unnoticed. */
export function toEmail(doc: ResolvedDoc): { subject: string; body: string } {
  const main = doc.blocks.filter((b) => b.t !== "note").map(blockText).filter(Boolean);
  const notes = doc.blocks.filter((b) => b.t === "note").map(blockText);
  return {
    subject: doc.subject ? plain(doc.subject) : plain(doc.heading),
    body: [...main, ...(notes.length ? ["--", ...notes] : [])].join("\n\n"),
  };
}
