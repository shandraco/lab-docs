"use client";

import { useEffect } from "react";
import ui from "@/components/ui.module.css";
import styles from "./status-page.module.css";

/** Whole-page failure (GOV.UK pattern): plain words, no red, no status code, a way forward. */
export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    document.title = "Error | Shed";
  }, []);

  return (
    <div className={`wrap ${styles.page}`}>
      <h1>Sorry, there is a problem with the service</h1>
      <p>Try again in a moment. If you were filling in a form, your answers were not saved.</p>
      <div>
        <button type="button" className={ui.primary} onClick={() => retry()}>
          Try again
        </button>
      </div>
      {error.digest ? <p className="muted">If it keeps happening, quote reference {error.digest}.</p> : null}
    </div>
  );
}
