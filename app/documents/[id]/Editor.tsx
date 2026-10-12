"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sheet } from "@/components/doc/Sheet";
import f from "@/components/forms/forms.module.css";
import ui from "@/components/ui.module.css";
import { resolve } from "@/lib/doc/resolve";
import { toEmail } from "@/lib/doc/text";
import type { Answers, Context, Gap, TemplateDefinition } from "@/lib/doc/types";
import { binAction, finalizeAction, saveDraftAction, type ActionResult } from "./actions";
import { FieldInput } from "./FieldInput";
import styles from "./editor.module.css";

type SaveState = { kind: "saved"; at?: string } | { kind: "dirty" } | { kind: "saving" } | { kind: "error"; message: string };

export interface EditorProps {
  docId: string;
  clientId: string;
  title: string;
  version: number;
  definition: TemplateDefinition;
  context: Omit<Context, "answers">;
  answers: Answers;
  isOwner: boolean;
  reviewed: boolean;
}

const SAVE_DELAY = 1200;

/**
 * One job: fill in the form until the sheet has no yellow gaps, then download or mark final.
 * Saves by itself a moment after each change, so there is no Save button to forget; the
 * status line says what happened, and nothing typed is thrown away if a save fails.
 */
export function Editor(props: EditorProps) {
  const { docId, definition, context } = props;
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(props.answers);
  const [title, setTitle] = useState(props.title);
  const [save, setSave] = useState<SaveState>({ kind: "saved" });
  const [notice, setNotice] = useState<string>();
  const [finalError, setFinalError] = useState<string>();
  const [finalizing, setFinalizing] = useState(false);
  const latest = useRef({ answers, title });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inFlight = useRef<Promise<ActionResult> | null>(null);

  const doc = useMemo(() => resolve(definition, { ...context, answers }), [definition, context, answers]);
  const email = doc.format === "email" ? toEmail(doc) : null;

  const flush = useCallback(async (): Promise<boolean> => {
    clearTimeout(timer.current);
    if (inFlight.current) await inFlight.current;
    const { answers: a, title: t } = latest.current;
    if (!t.trim()) {
      setSave({ kind: "error", message: "Give the document a name to save it." });
      return false;
    }
    setSave({ kind: "saving" });
    const p = saveDraftAction(docId, a, t.trim());
    inFlight.current = p;
    const result = await p;
    inFlight.current = null;
    // Edited while saving: those edits already scheduled their own save, so stay "unsaved".
    if (latest.current.answers !== a || latest.current.title !== t) {
      setSave({ kind: "dirty" });
      return result.ok;
    }
    setSave(result.ok ? { kind: "saved", at: result.savedAt } : { kind: "error", message: result.error });
    return result.ok;
  }, [docId]);

  const change = useCallback(
    (next: { answers?: Answers; title?: string }) => {
      latest.current = { answers: next.answers ?? latest.current.answers, title: next.title ?? latest.current.title };
      if (next.answers) setAnswers(next.answers);
      if (next.title !== undefined) setTitle(next.title);
      setSave({ kind: "dirty" });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY);
    },
    [flush],
  );

  // Warn before leaving with unsaved edits; retry a failed save every 10 seconds.
  useEffect(() => {
    const unsaved = save.kind !== "saved";
    const onLeave = (e: BeforeUnloadEvent) => {
      if (unsaved) e.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    const retry = save.kind === "error" ? setTimeout(() => void flush(), 10_000) : undefined;
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      clearTimeout(retry);
    };
  }, [save.kind, flush]);

  const setAnswer = (key: string, value: Answers[string]) => change({ answers: { ...latest.current.answers, [key]: value } });

  async function download(format: "pdf" | "docx") {
    if (!(await flush())) return;
    // A file download from a route handler, not a page navigation, so the router is not involved.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/documents/${docId}/download?format=${format}`);
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${what} copied. Paste it into your email.`);
    } catch {
      setNotice(`Could not copy automatically. Select the ${what.toLowerCase()} on the preview and copy it.`);
    }
  }

  async function finalize() {
    setFinalError(undefined);
    if (doc.gaps.length) {
      setFinalError(`Fill in the ${doc.gaps.length === 1 ? "missing detail" : `${doc.gaps.length} missing details`} listed above first.`);
      document.getElementById("gaps")?.focus();
      return;
    }
    clearTimeout(timer.current);
    setFinalizing(true);
    const result = await finalizeAction(docId, latest.current.answers, latest.current.title.trim());
    setFinalizing(false);
    if (!result.ok) {
      setFinalError(result.error);
      return;
    }
    setSave({ kind: "saved" });
    router.refresh();
  }

  function jumpTo(gap: Gap) {
    const el = document.getElementById(`f-${gap.key}`) ?? document.querySelector<HTMLElement>(`[data-field="${gap.key}"] input, [data-field="${gap.key}"] textarea`);
    el?.focus();
    el?.scrollIntoView({ block: "center" });
  }

  return (
    <div className={styles.layout}>
      <div className={styles.formCol}>
        <div className={f.field}>
          <label htmlFor="doc-title" className={f.label}>
            Document name
          </label>
          <input id="doc-title" type="text" value={title} onChange={(e) => change({ title: e.target.value })} className={f.input} />
        </div>

        {definition.sections.map((section) => (
          <section key={section.title} className={styles.section} aria-labelledby={`s-${section.title}`}>
            <h2 id={`s-${section.title}`} className={styles.sectionTitle}>
              {section.title}
            </h2>
            {section.hint ? <p className={f.hint}>{section.hint}</p> : null}
            {section.fields.map((field) => (
              <FieldInput key={field.key} field={field} value={answers[field.key]} onChange={(v) => setAnswer(field.key, v)} />
            ))}
          </section>
        ))}
      </div>

      <div className={styles.sheetCol}>
        <div className={styles.panel}>
          <p className={styles.saveLine} role="status" data-kind={save.kind}>
            {save.kind === "saved" ? "All changes saved." : save.kind === "saving" ? "Saving…" : save.kind === "dirty" ? "Saving in a moment…" : `Not saved: ${save.message} Trying again shortly.`}
          </p>

          {doc.gaps.length ? (
            <div id="gaps" tabIndex={-1} className={styles.gaps}>
              <h2 className={styles.panelTitle}>
                {doc.gaps.length === 1 ? "1 detail missing" : `${doc.gaps.length} details missing`}
              </h2>
              <ul className={styles.gapList}>
                {doc.gaps.map((g) => (
                  <li key={`${g.where}:${g.key}`}>
                    {g.where === "form" ? (
                      <button type="button" className={ui.quiet} onClick={() => jumpTo(g)}>
                        {g.label}
                      </button>
                    ) : g.where === "client" ? (
                      <Link href={`/clients/${props.clientId}?back=/documents/${docId}` as never}>{g.label}, on the client&rsquo;s page</Link>
                    ) : props.isOwner ? (
                      <Link href={`/settings?back=/documents/${docId}` as never}>{g.label}, in lab details</Link>
                    ) : (
                      <span>{g.label}: ask the lab owner to add it in lab details</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className={styles.ready}>Everything is filled in.</p>
          )}

          <div className={styles.actions}>
            {email ? (
              <>
                <button type="button" className={ui.secondary} onClick={() => copy(email.subject, "Subject")}>
                  Copy subject
                </button>
                <button type="button" className={ui.secondary} onClick={() => copy(email.body, "Message")}>
                  Copy message
                </button>
              </>
            ) : (
              <>
                <button type="button" className={ui.secondary} onClick={() => download("pdf")}>
                  Download PDF
                </button>
                <button type="button" className={ui.secondary} onClick={() => download("docx")}>
                  Download Word
                </button>
              </>
            )}
          </div>
          <p role="status" className={styles.notice}>
            {notice}
          </p>

          <div className={styles.finalBox}>
            <button type="button" className={ui.primary} onClick={finalize} aria-disabled={finalizing || doc.gaps.length > 0 || undefined}>
              {finalizing ? "Marking as final…" : "Mark as final"}
            </button>
            <p className={f.hint}>
              {email ? "Do this once you have sent it, so there is a record of exactly what went out." : "Do this before you send it. Final locks this version; you can still start a new version later."}
            </p>
            {!props.reviewed && !email ? (
              <p className={styles.warn}>This template has not been checked by a lawyer yet. Have one review it before a client signs.</p>
            ) : null}
            {finalError ? (
              <p className={f.error} role="alert">
                {finalError}
              </p>
            ) : null}
          </div>
        </div>

        <Sheet doc={doc} draft footer={`Version ${props.version}, draft`} />

        <form
          action={async () => {
            await binAction(docId);
          }}
          className={styles.bin}
        >
          <button type="submit" className={`${ui.quiet} ${ui.danger}`}>
            Move this document to the bin
          </button>
        </form>
      </div>
    </div>
  );
}
