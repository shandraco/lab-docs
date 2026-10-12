import "server-only";
import { one } from "@/lib/db";
import type { LabDetails } from "@/lib/doc/types";
import { audit } from "./audit";

export const labKeys = [
  "name",
  "legal_name",
  "entity_description",
  "address",
  "email",
  "phone",
  "website",
  "signer_name",
  "signer_title",
  "governing_law",
  "venue",
] as const satisfies readonly (keyof LabDetails)[];

export async function getLab(): Promise<LabDetails> {
  const row = await one<LabDetails>(`select ${labKeys.join(", ")} from lab_settings where id = 1`);
  if (!row) throw new Error("lab_settings row is missing; run the migrations");
  return row;
}

/** Owner only; the caller checks the role. */
export async function updateLab(actorId: string, lab: LabDetails): Promise<void> {
  const sets = labKeys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  await one(`update lab_settings set ${sets}, updated_at = now(), updated_by = $${labKeys.length + 1} where id = 1`, [
    ...labKeys.map((k) => lab[k]),
    actorId,
  ]);
  await audit(actorId, "lab.update", "lab_settings", "1");
}
