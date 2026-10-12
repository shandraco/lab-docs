"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { ErrorSummary } from "@/components/forms/ErrorSummary";
import { FieldError } from "@/components/forms/FieldError";
import f from "@/components/forms/forms.module.css";
import ui from "@/components/ui.module.css";
import { addPersonAction, changePersonAction, type AddPersonState } from "./actions";
import styles from "./people.module.css";

const roles = [
  { value: "staff", label: "Staff", hint: "Sees and works on every client and document." },
  { value: "partner", label: "Partner", hint: "Sees only the clients and documents they create." },
  { value: "owner", label: "Owner", hint: "Everything, plus templates, lab details and people." },
];

export interface PersonRow {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  me: boolean;
}

export function PeopleList({ people }: { people: PersonRow[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ text: string; undo?: () => Promise<void> }>();

  async function change(p: PersonRow, c: { role?: string; active?: boolean }, done: string, undo?: () => Promise<void>) {
    const r = await changePersonAction(p.id, c);
    setMessage(r.ok ? { text: done, undo } : { text: r.error ?? "That did not work." });
    router.refresh();
  }

  return (
    <>
      <p role="status" className={styles.message}>
        {message?.text}{" "}
        {message?.undo ? (
          <button type="button" className={ui.quiet} onClick={() => message.undo!().then(() => setMessage(undefined))}>
            Undo
          </button>
        ) : null}
      </p>
      <ul className={styles.list}>
        {people.map((p) => (
          <li key={p.id} className={styles.item} data-inactive={!p.active || undefined}>
            <div className={styles.who}>
              <span className={styles.name}>
                {p.name}
                {p.me ? " (you)" : ""}
              </span>
              <span className="muted">{p.email}</span>
              {!p.active ? <span className={styles.off}>Access switched off</span> : null}
            </div>
            <div className={styles.controls}>
              <label className="visually-hidden" htmlFor={`role-${p.id}`}>
                What {p.name} can do
              </label>
              <select
                id={`role-${p.id}`}
                className={f.input}
                value={p.role}
                disabled={!p.active}
                onChange={(e) => {
                  const before = p.role;
                  void change(p, { role: e.target.value }, `${p.name} is now ${e.target.value === "owner" ? "an owner" : `a ${e.target.value}`}.`, async () => {
                    await changePersonAction(p.id, { role: before });
                    router.refresh();
                  });
                }}
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {!p.me ? (
                <button
                  type="button"
                  className={p.active ? `${ui.quiet} ${ui.danger}` : ui.secondary}
                  onClick={() =>
                    change(p, { active: !p.active }, p.active ? `${p.name} can no longer sign in.` : `${p.name} can sign in again.`, async () => {
                      await changePersonAction(p.id, { active: p.active });
                      router.refresh();
                    })
                  }
                >
                  {p.active ? "Switch off access" : "Switch access back on"}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function AddPersonForm() {
  const [state, action, pending] = useActionState(addPersonAction, { attempt: 0, errors: {}, values: {} } as AddPersonState);
  const { errors, values } = state;
  const hasErrors = Object.keys(errors).length > 0 || Boolean(state.formError);
  return (
    <form action={action} noValidate className={f.form} key={state.added ?? "form"}>
      {hasErrors ? (
        <ErrorSummary
          attempt={state.attempt}
          formError={state.formError}
          items={(["name", "email", "role"] as const).filter((k) => errors[k]).map((k) => ({ href: k === "role" ? "#role-staff" : `#${k}`, text: errors[k]! }))}
        />
      ) : null}
      {state.added ? (
        <p role="status" className={styles.added}>
          {state.added}
        </p>
      ) : null}
      <div className={f.field} data-invalid={errors.name ? "" : undefined}>
        <label htmlFor="name" className={f.label}>
          Their name
        </label>
        <FieldError id="name-error" message={errors.name} />
        <input id="name" name="name" type="text" autoComplete="off" defaultValue={values.name} aria-describedby={errors.name ? "name-error" : undefined} className={`${f.input} ${f.medium}`} />
      </div>
      <div className={f.field} data-invalid={errors.email ? "" : undefined}>
        <label htmlFor="email" className={f.label}>
          Their email
        </label>
        <p id="email-hint" className={f.hint}>
          They sign in with a code sent here.
        </p>
        <FieldError id="email-error" message={errors.email} />
        <input id="email" name="email" type="email" autoComplete="off" spellCheck={false} defaultValue={values.email} aria-describedby={["email-hint", errors.email ? "email-error" : ""].filter(Boolean).join(" ")} className={`${f.input} ${f.medium}`} />
      </div>
      <fieldset className={f.field} data-invalid={errors.role ? "" : undefined}>
        <legend className={f.label}>What can they do?</legend>
        <FieldError id="role-error" message={errors.role} />
        <div className={f.radios}>
          {roles.map((r) => (
            <div key={r.value} className={f.radio}>
              <input id={`role-${r.value}`} type="radio" name="role" value={r.value} defaultChecked={(values.role || "staff") === r.value} aria-describedby={`role-${r.value}-hint`} />
              <label htmlFor={`role-${r.value}`}>
                <strong>{r.label}.</strong> <span id={`role-${r.value}-hint`}>{r.hint}</span>
              </label>
            </div>
          ))}
        </div>
      </fieldset>
      <div className={ui.actions}>
        <button type="submit" className={ui.primary} aria-disabled={pending || undefined}>
          Add this person
        </button>
      </div>
    </form>
  );
}
