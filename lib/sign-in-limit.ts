import type { Pool } from "pg";

/**
 * Two limits per window. Per caller and address: tight, so one person retrying is slowed.
 * Per address from all callers: looser, so an inbox cannot be flooded. Keeping the tight one
 * per caller means a stranger asking for your codes uses up their allowance, not yours.
 */
export const CODE_EMAILS_PER_CALLER = 3;
export const CODE_EMAILS_PER_ADDRESS = 10;
export const CODE_EMAIL_WINDOW_MINUTES = 10;

/**
 * Records a code email for `email` asked for by `ip` and says whether it may be sent. The
 * address-wide cap holds even when a caller fakes X-Forwarded-For to look like many callers.
 * The advisory lock makes concurrent requests for the same address queue, so a burst cannot
 * slip several sends past the count. Rows older than the window are cleared as it goes.
 */
export async function claimCodeEmail(db: Pool, email: string, ip: string): Promise<boolean> {
  const client = await db.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext('sign-in-code:' || $1))", [email]);
    await client.query("delete from sign_in_code_sends where email = $1 and sent_at < now() - make_interval(mins => $2)", [email, CODE_EMAIL_WINDOW_MINUTES]);
    const { rows } = await client.query<{ total: number; mine: number }>(
      "select count(*)::int as total, (count(*) filter (where ip = $2))::int as mine from sign_in_code_sends where email = $1",
      [email, ip],
    );
    const { total = 0, mine = 0 } = rows[0] ?? {};
    const allowed = mine < CODE_EMAILS_PER_CALLER && total < CODE_EMAILS_PER_ADDRESS;
    if (allowed) await client.query("insert into sign_in_code_sends (email, ip) values ($1, $2)", [email, ip]);
    await client.query("commit");
    return allowed;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
