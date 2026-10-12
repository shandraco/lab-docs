import "server-only";
import { seesEverything, type User } from "@/lib/auth";
import { one, query } from "@/lib/db";
import type { ClientDetails } from "@/lib/doc/types";
import { audit } from "./audit";

export interface Client extends ClientDetails {
  id: string;
  notes: string;
  created_by: string;
  updated_at: Date;
  archived_at: Date | null;
}

export const clientKeys = [
  "name",
  "legal_name",
  "entity_description",
  "address",
  "contact_name",
  "contact_title",
  "contact_email",
  "notes",
] as const;
export type ClientInput = Record<(typeof clientKeys)[number], string>;

const cols = `id, ${clientKeys.join(", ")}, created_by, updated_at, archived_at`;
/** Partners only see what they created. $1 is always the user id. */
const scope = (user: User) => (seesEverything(user) ? "$1::text is not null" : "created_by = $1");

export async function listClients(user: User): Promise<(Client & { documents: number })[]> {
  return query(
    `select ${cols.split(", ").map((c) => `c.${c}`).join(", ")},
            (select count(*)::int from documents d where d.client_id = c.id and d.archived_at is null) as documents
       from clients c where c.archived_at is null and ${scope(user).replace("created_by", "c.created_by")}
      order by lower(c.name)`,
    [user.id],
  );
}

export async function getClient(user: User, id: string): Promise<Client | null> {
  if (!isUuid(id)) return null;
  return one<Client>(`select ${cols} from clients where id = $2 and ${scope(user)}`, [user.id, id]);
}

export async function createClient(user: User, input: ClientInput): Promise<Client> {
  const row = await one<Client>(
    `insert into clients (${clientKeys.join(", ")}, created_by)
     values (${clientKeys.map((_, i) => `$${i + 1}`).join(", ")}, $${clientKeys.length + 1}) returning ${cols}`,
    [...clientKeys.map((k) => input[k]), user.id],
  );
  await audit(user.id, "client.create", "client", row!.id);
  return row!;
}

export async function updateClient(user: User, id: string, input: ClientInput): Promise<boolean> {
  const existing = await getClient(user, id);
  if (!existing) return false;
  const sets = clientKeys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  await query(`update clients set ${sets}, updated_at = now() where id = $1`, [id, ...clientKeys.map((k) => input[k])]);
  await audit(user.id, "client.update", "client", id);
  return true;
}

/** Archive is the delete; it can be undone, and documents keep pointing at the client. */
export async function setClientArchived(user: User, id: string, archived: boolean): Promise<boolean> {
  const existing = await getClient(user, id);
  if (!existing) return false;
  await query(`update clients set archived_at = ${archived ? "now()" : "null"}, updated_at = now() where id = $1`, [id]);
  await audit(user.id, archived ? "client.archive" : "client.restore", "client", id);
  return true;
}

export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
