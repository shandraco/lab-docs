import type { TemplateDefinition } from "@/lib/doc/types";
import { msa } from "./msa";
import { capability, outreachEmail } from "./outreach";
import { sow } from "./sow";

/**
 * The starter templates, seeded into template_versions by scripts/seed.ts. Documents always
 * use the stored version they were made from, so editing these files only affects new
 * versions after a re-seed.
 */
export const starterTemplates: { id: string; name: string; summary: string; sort: number; definition: TemplateDefinition }[] = [
  {
    id: "sow",
    name: "Statement of Work",
    summary: "What you will build for one project, by when, and for how much. Signed under an MSA.",
    sort: 1,
    definition: sow,
  },
  {
    id: "msa",
    name: "Master Services Agreement",
    summary: "The main contract with a client. Sign it once; each project then gets its own SOW.",
    sort: 2,
    definition: msa,
  },
  {
    id: "outreach_email",
    name: "Outreach email",
    summary: "A first email to someone at a business you would like to work with.",
    sort: 3,
    definition: outreachEmail,
  },
  {
    id: "capability",
    name: "Capability statement",
    summary: "One page on what the lab does and has done, tailored to who it is for.",
    sort: 4,
    definition: capability,
  },
];
