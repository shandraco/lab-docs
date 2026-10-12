"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Sheet } from "@/components/doc/Sheet";
import ui from "@/components/ui.module.css";
import type { Version } from "@/lib/data/documents";
import { resolve } from "@/lib/doc/resolve";
import { toEmail } from "@/lib/doc/text";
import type { Answers, Context, TemplateDefinition } from "@/lib/doc/types";
import { newVersionAction } from "./actions";
import styles from "./editor.module.css";

/** A locked version: the stored wording exactly as sent, plus the way to start the next version. */
export function FinalView({
  docId,
  version,
  live,
  archived,
}: {
  docId: string;
  version: Version;
  /** Only for a binned draft, which has no stored wording yet. */
  live: { definition: TemplateDefinition; context: Omit<Context, "answers">; answers: Answers } | null;
  archived: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const doc = useMemo(() => version.snapshot ?? resolve(live!.definition, { ...live!.context, answers: live!.answers }), [version.snapshot, live]);
  const final = Boolean(version.finalized_at);
  const email = doc.format === "email" ? toEmail(doc) : null;

  return (
    <div className={styles.layout}>
      <div className={styles.formCol}>
        {final ? (
          <div className={styles.banner}>
            <h2 className={styles.panelTitle}>Version {version.number} is final</h2>
            <p>This is exactly what was sent. It cannot be changed, so there is always a true record.</p>
            <p className={styles.fingerprint}>Fingerprint: {version.content_hash}</p>
            {!archived ? (
              <>
                <button
                  type="button"
                  className={ui.primary}
                  aria-disabled={busy || undefined}
                  onClick={async () => {
                    if (busy) return;
                    setBusy(true);
                    const r = await newVersionAction(docId);
                    setBusy(false);
                    if (r.ok) router.refresh();
                    else setMessage(r.error);
                  }}
                >
                  {busy ? "Starting…" : `Make changes in version ${version.number + 1}`}
                </button>
                <p className="muted">Your answers are copied over, so you only change what is different.</p>
              </>
            ) : null}
            {message ? <p role="alert">{message}</p> : null}
          </div>
        ) : null}
        <div className={styles.actions}>
          {email ? (
            <>
              <button type="button" className={ui.secondary} onClick={() => navigator.clipboard.writeText(email.subject).then(() => setMessage("Subject copied."))}>
                Copy subject
              </button>
              <button type="button" className={ui.secondary} onClick={() => navigator.clipboard.writeText(email.body).then(() => setMessage("Message copied."))}>
                Copy message
              </button>
            </>
          ) : (
            <>
              <a className={ui.secondary} href={`/documents/${docId}/download?format=pdf&v=${version.number}`}>
                Download PDF
              </a>
              <a className={ui.secondary} href={`/documents/${docId}/download?format=docx&v=${version.number}`}>
                Download Word
              </a>
            </>
          )}
        </div>
        <p role="status" className={styles.notice}>
          {message && !final ? message : null}
        </p>
      </div>
      <div className={styles.sheetCol}>
        <Sheet doc={doc} draft={!final} footer={`Version ${version.number}${final ? `, final. Fingerprint ${version.content_hash?.slice(0, 12)}` : ", draft"}`} />
      </div>
    </div>
  );
}
