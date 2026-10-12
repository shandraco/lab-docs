/**
 * The document model. A template is data, not code: form sections (what to ask) plus blocks
 * (the wording, with {{placeholders}}). resolve() turns a template plus answers into a
 * ResolvedDoc, and every output (on-screen sheet, PDF, Word, email text) renders that one
 * structure, so the four can never say different things.
 *
 * Pure and dependency-free: it runs in the browser for the live preview and on the server
 * for downloads and finalising.
 */

export type DocKind = "msa" | "sow" | "outreach_email" | "capability";

export type FieldType = "text" | "longtext" | "date" | "money" | "number" | "email" | "choice" | "lines" | "rows";

export interface Column {
  key: string;
  label: string;
  type: "text" | "date" | "money";
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
  optional?: boolean;
  options?: { value: string; label: string }[];
  /** For "rows": the table's columns. A money column named "amount" also gives {{<key>.total}}. */
  columns?: Column[];
  default?: Answer;
}

export interface Section {
  title: string;
  hint?: string;
  fields: FieldDef[];
}

/** Include a block only when a field is filled in, or equals a value. */
export interface Cond {
  field: string;
  equals?: string;
}

export type Block =
  | { t: "h"; text: string; when?: Cond }
  | { t: "p"; text: string; when?: Cond }
  | { t: "note"; text: string; when?: Cond }
  | { t: "list"; items: string[]; when?: Cond }
  | { t: "lines"; field: string; when?: Cond }
  | { t: "rows"; field: string; when?: Cond }
  | { t: "signatures"; when?: Cond };

export interface TemplateDefinition {
  kind: DocKind;
  /** "document" downloads as PDF and Word; "email" also copies as plain text. */
  format: "document" | "email";
  /** Heading on the sheet; placeholders allowed. */
  heading: string;
  /** Email subject line (format "email" only). */
  subject?: string;
  sections: Section[];
  blocks: Block[];
}

export type Row = Record<string, string>;
export type Answer = string | string[] | Row[];
export type Answers = Record<string, Answer>;

export interface ClientDetails {
  name: string;
  legal_name: string;
  entity_description: string;
  address: string;
  contact_name: string;
  contact_title: string;
  contact_email: string;
}

export interface LabDetails {
  name: string;
  legal_name: string;
  entity_description: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  signer_name: string;
  signer_title: string;
  governing_law: string;
  venue: string;
}

export interface Context {
  answers: Answers;
  client: ClientDetails;
  lab: LabDetails;
  sender: { name: string; email: string };
  /** ISO date (YYYY-MM-DD) the document is dated. */
  today: string;
}

/** A piece of text. `gap` marks a missing detail (text is then its label); `b` is bold. */
export interface Run {
  text: string;
  gap?: boolean;
  b?: boolean;
}

export type RBlock =
  | { t: "h"; n: number; runs: Run[] }
  | { t: "p"; runs: Run[] }
  | { t: "note"; runs: Run[] }
  | { t: "list"; items: Run[][] }
  | { t: "table"; columns: { label: string; numeric: boolean }[]; rows: string[][]; total?: string }
  | { t: "signatures"; parties: SignatureParty[] };

export interface SignatureParty {
  org: Run[];
  name: Run[];
  title: Run[];
}

/** Where a missing detail is fixed: this form, the client's record, or the lab settings. */
export interface Gap {
  label: string;
  where: "form" | "client" | "lab";
  key: string;
}

export interface ResolvedDoc {
  kind: DocKind;
  format: "document" | "email";
  heading: Run[];
  subject?: Run[];
  date: string;
  blocks: RBlock[];
  gaps: Gap[];
}
