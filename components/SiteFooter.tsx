import { ThemeToggle } from "./ThemeToggle";
import styles from "./SiteFooter.module.css";

/** A human is always one email away (Brain: design-for-the-least-technical-user). */
export function SiteFooter({ helpEmail }: { helpEmail?: string }) {
  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.inner}`}>
        <p className={styles.note}>
          {helpEmail ? (
            <>
              Stuck or something looks wrong? Email <a href={`mailto:${helpEmail}`}>{helpEmail}</a>.
            </>
          ) : (
            "Stuck or something looks wrong? Ask the lab owner."
          )}
        </p>
        <ThemeToggle />
      </div>
    </footer>
  );
}
