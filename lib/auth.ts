import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth-server";

/**
 * THE AUTH SEAM. Every server action and route handler calls requireUser() or requireRole()
 * as its first line; pages call pageUser(). proxy.ts is not a gate: server actions are POSTs
 * to whatever page hosts the form, so only a check inside the action protects it
 * (Brain: next-middleware-cannot-gate-server-actions, gate-every-entry-point-to-a-mutation-not-just-the-api).
 *
 * Roles:
 *  - owner:   everything, including templates, lab details and people
 *  - staff:   all clients and documents
 *  - partner: only the clients and documents they created
 */
export type Role = "owner" | "staff" | "partner";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export class UnauthorizedError extends Error {
  override name = "UnauthorizedError";
  constructor() {
    super("No signed-in user");
  }
}

export class ForbiddenError extends Error {
  override name = "ForbiddenError";
  constructor(message = "Not allowed for your role") {
    super(message);
  }
}

/** The current user, or null. Deactivated people are treated as signed out. */
export async function getUser(): Promise<User | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  const u = session?.user;
  if (!u || u.deactivatedAt) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role as Role };
}

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new ForbiddenError();
  return user;
}

/** For pages: the user, or a redirect to sign-in that brings them back here afterwards. */
export async function pageUser(returnTo = "/"): Promise<User> {
  const user = await getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}` as never);
  return user;
}

export const seesEverything = (user: User) => user.role !== "partner";
