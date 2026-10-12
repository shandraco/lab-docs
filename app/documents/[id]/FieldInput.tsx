"use client";

import { useState } from "react";
import f from "@/components/forms/forms.module.css";
import ui from "@/components/ui.module.css";
import { formatMoney, parseMoney } from "@/lib/doc/format";
import type { Answer, FieldDef, Row } from "@/lib/doc/types";
import styles from "./editor.module.css";

/** One form control per field type. Labels above, hints under the label, no placeholders as labels. */
export function FieldInput({ field, value, onChange }: { field: FieldDef; value: Answer | undefined; onChange: (v: Answer) => void }) {
  const id = `f-${field.key}`;
  const v = value ?? field.default;
  const text = typeof v === "string" ? v : "";
  const hintId = field.hint ? `${id}-hint` : undefined;
  const label = (
    <>
      {field.label} {field.optional ? <span className={f.optional}>(optional)</span> : null}
    </>
  );

  if (field.type === "choice") {
    return (
      <fieldset className={f.field} data-field={field.key} aria-describedby={hintId}>
        <legend className={f.label}>{label}</legend>
        {field.hint ? <p id={hintId} className={f.hint}>{field.hint}</p> : null}
        <div className={f.radios}>
          {field.options?.map((o, i) => (
            <div key={o.value} className={f.radio}>
              <input id={i === 0 ? id : `${id}-${o.value}`} type="radio" name={field.key} value={o.value} checked={text === o.value} onChange={() => onChange(o.value)} />
              <label htmlFor={i === 0 ? id : `${id}-${o.value}`}>{o.label}</label>
            </div>
          ))}
        </div>
      </fieldset>
    );
  }

  if (field.type === "rows") return <RowsInput field={field} rows={Array.isArray(v) ? (v as Row[]) : []} onChange={onChange} />;

  const common = {
    id,
    value: field.type === "lines" && Array.isArray(v) ? (v as string[]).join("\n") : text,
    "aria-describedby": hintId,
    className: f.input,
  };

  return (
    <div className={f.field} data-field={field.key}>
      <label htmlFor={id} className={f.label}>
        {label}
      </label>
      {field.hint ? <p id={hintId} className={f.hint}>{field.hint}</p> : null}
      {field.type === "longtext" || field.type === "lines" ? (
        <textarea {...common} rows={field.type === "lines" ? 4 : 3} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === "money" ? (
        <div className={styles.money}>
          <span aria-hidden="true">$</span>
          <input {...common} type="text" inputMode="decimal" className={`${f.input} ${f.medium}`} onChange={(e) => onChange(e.target.value)} onBlur={() => tidy(text, (t) => onChange(t.replace(/^\$/, "")))} />
        </div>
      ) : (
        <input
          {...common}
          type={field.type === "date" ? "date" : field.type === "email" ? "email" : "text"}
          inputMode={field.type === "number" ? "numeric" : undefined}
          className={`${f.input} ${field.type === "text" ? "" : f.medium}`}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

/** A small table as stacked groups of inputs: works at phone width, and removing a line can be undone. */
function RowsInput({ field, rows, onChange }: { field: FieldDef; rows: Row[]; onChange: (v: Row[]) => void }) {
  const columns = field.columns ?? [];
  const blank = (): Row => Object.fromEntries(columns.map((c) => [c.key, ""]));
  const list = rows.length ? rows : [blank()];
  const [removed, setRemoved] = useState<{ row: Row; index: number } | null>(null);
  const id = `f-${field.key}`;

  const update = (i: number, key: string, value: string) => onChange(list.map((r, j) => (j === i ? { ...r, [key]: value } : r)));

  return (
    <fieldset className={`${f.field} ${styles.rows}`} data-field={field.key} aria-describedby={field.hint ? `${id}-hint` : undefined}>
      <legend className={f.label}>
        {field.label} {field.optional ? <span className={f.optional}>(optional)</span> : null}
      </legend>
      {field.hint ? <p id={`${id}-hint`} className={f.hint}>{field.hint}</p> : null}
      {list.map((row, i) => (
        <div key={i} className={styles.row} role="group" aria-label={`Line ${i + 1}`}>
          {columns.map((c, ci) => {
            const cid = i === 0 && ci === 0 ? id : `${id}-${i}-${c.key}`;
            return (
              <div key={c.key} className={styles.cell} data-type={c.type}>
                <label htmlFor={cid} className={styles.cellLabel}>
                  {c.label}
                  <span className="visually-hidden">, line {i + 1}</span>
                </label>
                <input
                  id={cid}
                  type={c.type === "date" ? "date" : "text"}
                  inputMode={c.type === "money" ? "decimal" : undefined}
                  value={row[c.key] ?? ""}
                  onChange={(e) => update(i, c.key, e.target.value)}
                  onBlur={c.type === "money" ? () => tidy(row[c.key] ?? "", (t) => update(i, c.key, t)) : undefined}
                  className={f.input}
                />
              </div>
            );
          })}
          {list.length > 1 ? (
            <button
              type="button"
              className={`${ui.quiet} ${styles.remove}`}
              onClick={() => {
                setRemoved({ row, index: i });
                onChange(list.filter((_, j) => j !== i));
              }}
            >
              Remove<span className="visually-hidden"> line {i + 1}</span>
            </button>
          ) : null}
        </div>
      ))}
      <div className={styles.rowActions}>
        <button type="button" className={ui.secondary} onClick={() => onChange([...list, blank()])}>
          Add a line
        </button>
        <p role="status">
          {removed ? (
            <>
              Line removed.{" "}
              <button
                type="button"
                className={ui.quiet}
                onClick={() => {
                  const next = [...list];
                  next.splice(removed.index, 0, removed.row);
                  onChange(next);
                  setRemoved(null);
                }}
              >
                Undo
              </button>
            </>
          ) : null}
        </p>
      </div>
    </fieldset>
  );
}

/** On leaving a money box, show the amount the way the document will print it ("6000" -> "$6,000.00"). */
function tidy(value: string, set: (formatted: string) => void) {
  if (parseMoney(value) === null) return;
  const formatted = formatMoney(value);
  if (formatted !== value) set(formatted);
}
