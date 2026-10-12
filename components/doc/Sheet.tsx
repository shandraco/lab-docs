import type { RBlock, ResolvedDoc, Run } from "@/lib/doc/types";
import styles from "./Sheet.module.css";

/**
 * The document as the client will see it, on a white page in the PDF's typeface. Missing
 * details show as highlighted labels in the text, so the gap is seen where it will print.
 */
function Runs({ runs }: { runs: Run[] }) {
  return (
    <>
      {runs.map((r, i) =>
        r.gap ? (
          <mark key={i} className={styles.gap}>
            <span className="visually-hidden">Missing: </span>
            {r.text}
          </mark>
        ) : r.b ? (
          <strong key={i}>{r.text}</strong>
        ) : (
          <span key={i}>{r.text}</span>
        ),
      )}
    </>
  );
}

function Block({ b }: { b: RBlock }) {
  switch (b.t) {
    case "h":
      return (
        <h3 className={styles.h}>
          <span className={styles.n}>{b.n}.</span> <Runs runs={b.runs} />
        </h3>
      );
    case "p":
      return (
        <p className={styles.p}>
          <Runs runs={b.runs} />
        </p>
      );
    case "note":
      return (
        <p className={styles.note}>
          <Runs runs={b.runs} />
        </p>
      );
    case "list":
      return (
        <ul className={styles.list}>
          {b.items.map((item, i) => (
            <li key={i}>
              <Runs runs={item} />
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <table className={styles.table}>
          <thead>
            <tr>
              {b.columns.map((c, i) => (
                <th key={i} scope="col" data-numeric={c.numeric || undefined}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, i) => (
                  <td key={i} data-numeric={b.columns[i]?.numeric || undefined}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {b.total ? (
            <tfoot>
              <tr>
                <th scope="row" colSpan={b.columns.length - 1}>
                  Total
                </th>
                <td data-numeric>{b.total}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      );
    case "signatures":
      return (
        <div className={styles.sigs}>
          {b.parties.map((p, i) => (
            <div key={i} className={styles.sig}>
              <p className={styles.sigOrg}>
                <Runs runs={p.org} />
              </p>
              <p className={styles.sigLine}>Signature</p>
              <p>
                <Runs runs={p.name} />
              </p>
              <p className={styles.sigTitle}>
                <Runs runs={p.title} />
              </p>
              <p className={styles.sigLine}>Date</p>
            </div>
          ))}
        </div>
      );
  }
}

export function Sheet({ doc, draft, footer }: { doc: ResolvedDoc; draft: boolean; footer?: string }) {
  const isEmail = doc.format === "email";
  return (
    <article className={styles.sheet} data-format={doc.format} aria-label={isEmail ? "Email preview" : "Document preview"}>
      {draft && !isEmail ? <p className={styles.draft}>Draft. Not for signature.</p> : null}
      {isEmail ? (
        <p className={styles.subject}>
          <span className={styles.subjectLabel}>Subject</span> <Runs runs={doc.subject ?? doc.heading} />
        </p>
      ) : (
        <>
          <h2 className={styles.heading}>
            <Runs runs={doc.heading} />
          </h2>
          <p className={styles.date}>{doc.date}</p>
        </>
      )}
      {doc.blocks.map((b, i) => (
        <Block key={i} b={b} />
      ))}
      {footer ? <p className={styles.footer}>{footer}</p> : null}
    </article>
  );
}
