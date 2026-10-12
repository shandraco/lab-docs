"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { ErrorSummary } from "@/components/forms/ErrorSummary";
import { FieldError } from "@/components/forms/FieldError";
import f from "@/components/forms/forms.module.css";
import { MiniSheet } from "@/components/MiniSheet";
import ui from "@/components/ui.module.css";
import type { DocKind } from "@/lib/doc/types";
import { createDocumentAction, type NewDocState } from "./actions";
import styles from "./new.module.css";

const initialState: NewDocState = { attempt: 0, errors: {}, values: {} };

export function NewDocumentForm({
  templates,
  clients,
  initial,
}: {
  templates: { id: string; kind: DocKind; name: string; summary: string }[];
  clients: { id: string; name: string }[];
  initial: { template: string; client: string };
}) {
  const [state, action, pending] = useActionState(createDocumentAction, initialState);
  const values: Record<string, string> = { title: "", ...initial, ...state.values };
  const { errors } = state;
  const hasErrors = Object.keys(errors).length > 0 || Boolean(state.formError);

  useEffect(() => {
    const base = document.title.replace(/^Error: /, "");
    document.title = hasErrors ? `Error: ${base}` : base;
  }, [hasErrors, state.attempt]);

  return (
    <form action={action} noValidate className={`${f.form} ${styles.form}`}>
      {hasErrors ? (
        <ErrorSummary
          attempt={state.attempt}
          formError={state.formError}
          items={[
            ...(errors.template ? [{ href: `#template-${templates[0]?.id}`, text: errors.template }] : []),
            ...(errors.client ? [{ href: "#client", text: errors.client }] : []),
            ...(errors.title ? [{ href: "#title", text: errors.title }] : []),
          ]}
        />
      ) : null}

      <fieldset className={f.field} data-invalid={errors.template ? "" : undefined}>
        <legend className={f.label}>What do you need?</legend>
        <FieldError id="template-error" message={errors.template} />
        <div className={styles.tiles}>
          {templates.map((t) => (
            <label key={t.id} className={styles.tile} htmlFor={`template-${t.id}`}>
              <input id={`template-${t.id}`} type="radio" name="template" value={t.id} defaultChecked={values.template === t.id} className={styles.radio} />
              <MiniSheet kind={t.kind} />
              <span className={styles.tileText}>
                <span className={styles.tileName}>{t.name}</span>
                <span className={styles.tileSummary}>{t.summary}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={f.field} data-invalid={errors.client ? "" : undefined}>
        <label htmlFor="client" className={f.label}>
          Who is it for?
        </label>
        <p id="client-hint" className={f.hint}>
          Not in the list? <Link href="/clients/new?then=document">Add a client</Link> first.
        </p>
        <FieldError id="client-error" message={errors.client} />
        <select
          id="client"
          name="client"
          defaultValue={values.client}
          aria-invalid={errors.client ? true : undefined}
          aria-describedby={["client-hint", errors.client ? "client-error" : ""].filter(Boolean).join(" ")}
          className={`${f.input} ${f.medium}`}
        >
          <option value="">Choose a client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className={f.field} data-invalid={errors.title ? "" : undefined}>
        <label htmlFor="title" className={f.label}>
          Name for this document <span className={f.optional}>(optional)</span>
        </label>
        <p id="title-hint" className={f.hint}>
          Leave it blank and we will call it, for example, &ldquo;Statement of Work for Acme&rdquo;.
        </p>
        <FieldError id="title-error" message={errors.title} />
        <input id="title" name="title" type="text" defaultValue={values.title} aria-describedby="title-hint" className={`${f.input} ${f.medium}`} />
      </div>

      <div className={ui.actions}>
        <button type="submit" className={ui.primary} aria-disabled={pending || undefined}>
          Start the document
        </button>
        <p role="status" className={f.pending}>
          {pending ? "Starting…" : ""}
        </p>
      </div>
    </form>
  );
}
