"use client";

import { useEffect, useRef } from "react";
import f from "./forms.module.css";

/**
 * GOV.UK error summary: "There is a problem", focus moved here on every failed submit, each
 * item linking to its field with the same words as the inline message.
 */
export function ErrorSummary({
  attempt,
  items,
  formError,
}: {
  attempt: number;
  items: { href: string; text: string }[];
  formError?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, [attempt]);

  return (
    <div ref={ref} tabIndex={-1} className={f.summary} aria-labelledby="error-summary-title">
      <h2 id="error-summary-title" className={f.summaryTitle}>
        There is a problem
      </h2>
      <ul className={f.summaryList}>
        {formError ? <li>{formError}</li> : null}
        {items.map((item) => (
          <li key={item.href}>
            <a href={item.href}>{item.text}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
