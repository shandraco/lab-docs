import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { env } from "@/lib/env";

/**
 * One pg Pool per server instance. The same driver talks to local Postgres in development and
 * to Neon's pooled endpoint in production, so there is no shim to drift. Better Auth shares it.
 * Brain: nextjs-on-vercel-with-hosted-postgres.
 */
const globalForDb = globalThis as unknown as { labDocsPool?: Pool };

export function pool(): Pool {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not set (see .env.example)");
  globalForDb.labDocsPool ??= new Pool({ connectionString: env.DATABASE_URL, max: 5 });
  return globalForDb.labDocsPool;
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await pool().query<T>(text, params)).rows;
}

export async function one<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await query<T>(text, params))[0] ?? null;
}

/** Runs fn inside BEGIN/COMMIT; any throw rolls back. */
export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
