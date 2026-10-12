import "server-only";
import type { PoolClient } from "pg";
import { pool } from "@/lib/db";

/** Every change writes one row: who, what, which record. Pass `client` inside a transaction. */
export async function audit(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  detail: Record<string, unknown> = {},
  client?: PoolClient,
): Promise<void> {
  await (client ?? pool()).query(
    "insert into audit_log (actor_id, action, entity, entity_id, detail) values ($1, $2, $3, $4, $5)",
    [actorId, action, entity, entityId, detail],
  );
}
