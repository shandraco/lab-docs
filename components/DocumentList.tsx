import Link from "next/link";
import type { DocumentRow } from "@/lib/data/documents";
import { when } from "@/lib/when";
import { Status } from "./Status";
import styles from "./DocumentList.module.css";

export function DocumentList({ docs, showClient = true }: { docs: DocumentRow[]; showClient?: boolean }) {
  return (
    <ul className={styles.list}>
      {docs.map((d) => (
        <li key={d.id} className={styles.item}>
          <div className={styles.main}>
            <Link href={`/documents/${d.id}` as never} className={styles.title}>
              {d.title}
            </Link>
            <span className={styles.meta}>
              {d.template_name}
              {showClient ? ` for ${d.client_name}` : ""}. Changed {when(d.updated_at)} by {d.author}.
            </span>
          </div>
          <Status status={d.status} version={d.version} />
        </li>
      ))}
    </ul>
  );
}
