import type { Metadata } from "next";
import Link from "next/link";
import { MiniSheet } from "@/components/MiniSheet";
import { listTemplates } from "@/lib/data/templates";
import { ownerPage } from "@/lib/owner-page";
import { ReviewToggle } from "./ReviewToggle";
import styles from "./templates.module.css";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage() {
  await ownerPage("/templates");
  const templates = await listTemplates();
  return (
    <div className={`wrap ${styles.page}`}>
      <h1>Templates</h1>
      <p className="muted">
        The approved wording every document is built from. Staff fill in the blanks; the wording itself only changes here. The starter wording
        is a sound draft, not legal advice: have a lawyer review each contract template, then record it below.
      </p>
      <ul className={styles.list}>
        {templates.map((t) => (
          <li key={t.id} className={styles.item}>
            <MiniSheet kind={t.kind} />
            <div className={styles.body}>
              <h2 className={styles.name}>
                <Link href={`/templates/${t.id}` as never}>{t.name}</Link>
              </h2>
              <p className="muted">{t.summary}</p>
              <p>
                Version {t.version}.{" "}
                {t.attorney_reviewed_at ? (
                  <span className={styles.ok}>Reviewed by a lawyer on {t.attorney_reviewed_at.toLocaleDateString("en-US", { dateStyle: "long" })}.</span>
                ) : (
                  <span className={styles.warn}>Not yet reviewed by a lawyer.</span>
                )}
              </p>
              <ReviewToggle versionId={t.version_id} reviewed={Boolean(t.attorney_reviewed_at)} version={t.version} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
