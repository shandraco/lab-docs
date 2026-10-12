import type { DocKind } from "@/lib/doc/types";
import styles from "./MiniSheet.module.css";

/**
 * A thumbnail page drawn in CSS: its shape says what the document is before the words do.
 * Contracts are dense numbered clauses with two signature lines; a SOW has tables; an email
 * is short with a subject bar; a capability statement is one page of blocks.
 */
const shapes: Record<DocKind, string[]> = {
  msa: ["h", "l", "l", "s", "h", "l", "l", "s", "h", "l", "sig"],
  sow: ["h", "l", "s", "t", "t", "t", "h", "l", "t", "sig"],
  outreach_email: ["subj", "s", "l", "l", "s", "l", "s"],
  capability: ["h", "l", "l", "blk", "h", "s", "s", "s"],
};

export function MiniSheet({ kind }: { kind: DocKind }) {
  return (
    <span className={styles.sheet} data-kind={kind} aria-hidden="true">
      {shapes[kind].map((s, i) => (
        <span key={i} className={styles[s]} />
      ))}
    </span>
  );
}
