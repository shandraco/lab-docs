import "server-only";
import { notFound } from "next/navigation";
import { pageUser, type User } from "@/lib/auth";

/** Owner-only pages answer 404 to everyone else, so they do not even confirm the page exists. */
export async function ownerPage(path: string): Promise<User> {
  const user = await pageUser(path);
  if (user.role !== "owner") notFound();
  return user;
}
