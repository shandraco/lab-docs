import styles from "./Status.module.css";

/** Draft or Final, in words and colour; the word carries the meaning, not the colour. */
export function Status({ status, version }: { status: "draft" | "final"; version?: number }) {
  return (
    <span className={styles.status} data-status={status}>
      {status === "final" ? "Final" : "Draft"}
      {version ? <span className={styles.v}>, version {version}</span> : null}
    </span>
  );
}
