import f from "./forms.module.css";

/** Inline message, tied to its control by aria-describedby. Words match the summary's. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className={f.error}>
      <span className="visually-hidden">Error: </span>
      {message}
    </p>
  );
}
