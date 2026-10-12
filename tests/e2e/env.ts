/** Shared by the Playwright config, global setup and specs. */
export const TEST_DB = process.env.E2E_DATABASE_URL ?? `postgres://${process.env.USER}@localhost:5433/lab_docs_test`;

/** The production server's output; sign-in codes are logged here because no mail key is set. */
export const SERVER_LOG = ".e2e/server.log";

export const testPeople = [
  { name: "Olive Owner", email: "owner@lab.test", role: "owner", state: ".e2e/auth/owner.json" },
  { name: "Pat Partner", email: "partner@lab.test", role: "partner", state: ".e2e/auth/partner.json" },
] as const;

export const [OWNER, PARTNER] = testPeople;

/** Never signs in; only asks for codes, to check the per-address limit. */
export const LIMITED = { name: "Lee Limits", email: "limits@lab.test", role: "staff" } as const;
