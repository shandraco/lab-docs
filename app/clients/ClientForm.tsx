"use client";

import { useActionState, useEffect } from "react";
import { ErrorSummary } from "@/components/forms/ErrorSummary";
import { FieldError } from "@/components/forms/FieldError";
import f from "@/components/forms/forms.module.css";
import ui from "@/components/ui.module.css";
import type { ClientInput } from "@/lib/data/clients";
import { saveClientAction, type ClientFormState } from "./actions";

type Key = keyof ClientInput;
const fields: { key: Key; label: string; hint?: string; type?: "email" | "area"; optional?: boolean; auto?: string }[] = [
  { key: "name", label: "Client name", hint: "What you call them, for example \"Acme\"." },
  { key: "legal_name", label: "Legal name", hint: "As registered, for example \"Acme Widgets Inc.\" Contracts use this.", optional: true, auto: "organization" },
  { key: "entity_description", label: "Type of company", hint: "For example \"a Texas limited liability company\". Contracts use this.", optional: true },
  { key: "address", label: "Postal address", type: "area", optional: true, auto: "street-address" },
  { key: "contact_name", label: "Contact's name", hint: "The person who signs or receives documents.", optional: true },
  { key: "contact_title", label: "Contact's job title", optional: true },
  { key: "contact_email", label: "Contact's email", type: "email", optional: true },
  { key: "notes", label: "Notes", type: "area", optional: true, hint: "Only people in the lab see these." },
];

export function ClientForm({ id, initial, back, then, submitLabel }: { id?: string; initial: Partial<ClientInput>; back?: string; then?: string; submitLabel: string }) {
  const [state, action, pending] = useActionState(saveClientAction, { attempt: 0, errors: {}, values: initial } as ClientFormState);
  const { errors, values } = state;
  const hasErrors = Object.keys(errors).length > 0 || Boolean(state.formError);

  useEffect(() => {
    const base = document.title.replace(/^Error: /, "");
    document.title = hasErrors ? `Error: ${base}` : base;
  }, [hasErrors, state.attempt]);

  return (
    <form action={action} noValidate className={f.form}>
      {hasErrors ? (
        <ErrorSummary attempt={state.attempt} formError={state.formError} items={(Object.keys(errors) as Key[]).map((k) => ({ href: `#${k}`, text: errors[k]! }))} />
      ) : null}
      {id ? <input type="hidden" name="id" value={id} /> : null}
      {back ? <input type="hidden" name="back" value={back} /> : null}
      {then ? <input type="hidden" name="then" value={then} /> : null}
      {fields.map((fd) => {
        const describedBy = [fd.hint ? `${fd.key}-hint` : "", errors[fd.key] ? `${fd.key}-error` : ""].filter(Boolean).join(" ") || undefined;
        const common = {
          id: fd.key,
          name: fd.key,
          defaultValue: values[fd.key] ?? "",
          "aria-invalid": errors[fd.key] ? true : undefined,
          "aria-describedby": describedBy,
          className: f.input,
          autoComplete: fd.auto ?? "off",
        };
        return (
          <div key={fd.key} className={f.field} data-invalid={errors[fd.key] ? "" : undefined}>
            <label htmlFor={fd.key} className={f.label}>
              {fd.label} {fd.optional ? <span className={f.optional}>(optional)</span> : null}
            </label>
            {fd.hint ? <p id={`${fd.key}-hint`} className={f.hint}>{fd.hint}</p> : null}
            <FieldError id={`${fd.key}-error`} message={errors[fd.key]} />
            {fd.type === "area" ? <textarea {...common} rows={3} /> : <input {...common} type={fd.type === "email" ? "email" : "text"} spellCheck={fd.type === "email" ? false : undefined} />}
          </div>
        );
      })}
      <div className={ui.actions}>
        <button type="submit" className={ui.primary} aria-disabled={pending || undefined}>
          {submitLabel}
        </button>
        <p role="status" className={f.pending}>
          {pending ? "Saving…" : state.saved ? "Saved." : ""}
        </p>
      </div>
    </form>
  );
}
