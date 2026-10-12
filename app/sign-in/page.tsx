import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { SignInForm } from "./SignInForm";
import styles from "./sign-in.module.css";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Only a path on this site. Browsers drop tabs and newlines and treat "\\" as "/", so
 * "/<TAB>/evil.com" would leave the site: reject control characters and backslashes, then
 * check the parsed result is still same-origin.
 */
function safeNext(next: string | string[] | undefined): string {
  const n = Array.isArray(next) ? next[0] : next;
  if (!n || !n.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(n)) return "/";
  const base = "http://same.invalid";
  const url = new URL(n, base);
  return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : "/";
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const next = safeNext((await searchParams).next);
  if (await getUser()) redirect(next as never);
  return (
    <div className={`wrap ${styles.page}`}>
      <div className={styles.card}>
        <h1>Sign in</h1>
        <p className="muted">We email you a code. There is no password to remember.</p>
        <SignInForm next={next} />
      </div>
    </div>
  );
}
