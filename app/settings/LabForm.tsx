"use client";

import { useActionState } from "react";
import { ErrorSummary } from "@/components/forms/ErrorSummary";
import { FieldError } from "@/components/forms/FieldError";
import f from "@/components/forms/forms.module.css";
import ui from "@/components/ui.module.css";
import type { LabDetails } from "@/lib/doc/types";
import st from "./settings.module.css";
import { saveLabAction, type LabFormState } from "./actions";

type Key = keyof LabDetails;
const groups: { title: string; fields: { key: Key; label: string; hint?: string; area?: boolean; type?: string }[] }[] = [
  {
    title: "Who you are",
    fields: [
      { key: "name", label: "Lab name", hint: "The name people know you by." },
      { key: "legal_name", label: "Legal name", hint: "As registered, for example \"Northfield Lab LLC\"." },
      { key: "entity_description", label: "Type of company", hint: "For example \"a Kansas limited liability company\"." },
      { key: "address", label: "Postal address", area: true, hint: "Printed on contracts, and required by law at the foot of every outreach email." },
    ],
  },
  {
    title: "Contact",
    fields: [
      { key: "email", label: "Email", type: "email", hint: "Also shown at the bottom of every page as where to get help." },
      { key: "phone", label: "Phone", type: "tel" },
      { key: "website", label: "Website" },
    ],
  },
  {
    title: "Who signs",
    fields: [
      { key: "signer_name", label: "Name of the person who signs contracts" },
      { key: "signer_title", label: "Their job title" },
    ],
  },
  {
    title: "Law and courts",
    fields: [
      { key: "governing_law", label: "Whose law governs your contracts", hint: "A state name, for example \"Kansas\"." },
      { key: "venue", label: "Which courts hear disputes", hint: "For example \"Sedgwick County, Kansas\". Ask your lawyer if unsure." },
    ],
  },
];

export function LabForm({ initial, back }: { initial: LabDetails; back?: string }) {
  const [state, action, pending] = useActionState(saveLabAction, { attempt: 0, errors: {}, values: initial } as LabFormState);
  const { errors, values } = state;
  const hasErrors = Object.keys(errors).length > 0 || Boolean(state.formError);
  return (
    <form action={action} noValidate className={f.form}>
      {hasErrors ? <ErrorSummary attempt={state.attempt} formError={state.formError} items={(Object.keys(errors) as Key[]).map((k) => ({ href: `#${k}`, text: errors[k]! }))} /> : null}
      {back ? <input type="hidden" name="back" value={back} /> : null}
      {groups.map((g) => (
        <fieldset key={g.title} className={f.field}>
          <legend className={`${f.label} ${st.groupTitle}`}>
            {g.title}
          </legend>
          <div className={f.form}>
            {g.fields.map((fd) => {
              const describedBy = [fd.hint ? `${fd.key}-hint` : "", errors[fd.key] ? `${fd.key}-error` : ""].filter(Boolean).join(" ") || undefined;
              const common = { id: fd.key, name: fd.key, defaultValue: values[fd.key] ?? "", "aria-describedby": describedBy, "aria-invalid": errors[fd.key] ? true : undefined, className: f.input };
              return (
                <div key={fd.key} className={f.field} data-invalid={errors[fd.key] ? "" : undefined}>
                  <label htmlFor={fd.key} className={`${f.label} ${st.fieldLabel}`}>
                    {fd.label}
                  </label>
                  {fd.hint ? <p id={`${fd.key}-hint`} className={f.hint}>{fd.hint}</p> : null}
                  <FieldError id={`${fd.key}-error`} message={errors[fd.key]} />
                  {fd.area ? <textarea {...common} rows={3} /> : <input {...common} type={fd.type ?? "text"} />}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className={ui.actions}>
        <button type="submit" className={ui.primary} aria-disabled={pending || undefined}>
          {back ? "Save and go back to the document" : "Save lab details"}
        </button>
        <p role="status" className={f.pending}>
          {pending ? "Saving…" : state.saved ? "Saved. New documents use these details." : ""}
        </p>
      </div>
    </form>
  );
}
