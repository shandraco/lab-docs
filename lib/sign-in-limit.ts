import type { Pool } from "pg";

/** At most this many sign-in code emails per address in the window, whatever IP asks. */
export const CODE_EMAILS_PER_WINDOW = 3;
export const CODE_EMAIL_WINDOW_MINUTES = 10;

/**
 * Records a code email for `email` and says whether it may be sent. Counted per address, so a
 * caller who fakes X-Forwarded-For to dodge the per-IP limit still cannot flood one inbox.
 * The advisory lock makes concurrent requests for the same address queue, so a burst cannot
 * slip several sends past the count. Rows older than the window are cleared as it goes.
 */
export async function claimCodeEmail(db: Pool, email: string): Promise<boolean> {
  const client = await db.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext('sign-in-code:' || $1))", [email]);
    await client.query("delete from sign_in_code_sends where email = $1 and sent_at < now() - make_interval(mins => $2)", [email, CODE_EMAIL_WINDOW_MINUTES]);
    const { rows } = await client.query<{ n: number }>("select count(*)::int as n from sign_in_code_sends where email = $1", [email]);
    const allowed = (rows[0]?.n ?? 0) < CODE_EMAILS_PER_WINDOW;
    if (allowed) await client.query("insert into sign_in_code_sends (email) values ($1)", [email]);
    await client.query("commit");
    return allowed;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
