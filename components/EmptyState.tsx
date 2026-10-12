import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

/** Says why it is empty and what to do next (Brain: empty-loading-error-states-designed). */
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <h2 className={styles.title}>{title}</h2>
      {children}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
