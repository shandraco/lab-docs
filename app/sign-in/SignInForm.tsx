"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FieldError } from "@/components/forms/FieldError";
import f from "@/components/forms/forms.module.css";
import ui from "@/components/ui.module.css";
import { authClient } from "@/lib/auth-client";
import styles from "./sign-in.module.css";

type Step = "email" | "code";

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (step === "code" ? codeRef : emailRef).current?.focus();
  }, [step]);

  async function sendCode(address: string) {
    setBusy(true);
    setError(undefined);
    const { error: err } = await authClient.emailOtp.sendVerificationOtp({ email: address, type: "sign-in" });
    setBusy(false);
    if (err) {
      setError(err.status === 429 ? "Too many codes asked for. Wait a minute, then try again." : "We could not send a code just now. Try again in a minute.");
      return false;
    }
    setNotice(`If ${address} is on the team, a 6-digit code is on its way. It works for 10 minutes.`);
    return true;
  }

  async function onEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Phone keyboards add trailing spaces; a code sent to "a@b.c " never matches (Brain: better-auth).
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Enter your email address, like name@example.com");
      emailRef.current?.focus();
      return;
    }
    setEmail(address);
    if (await sendCode(address)) setStep("code");
  }

  async function onCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const otp = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\D/g, "");
    if (otp.length !== 6) {
      setError("Enter the 6 numbers from the email.");
      codeRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(undefined);
    const { error: err } = await authClient.signIn.emailOtp({ email, otp });
    if (err) {
      setBusy(false);
      setError(
        err.status === 429
          ? "Too many tries. Wait a minute, then send a new code."
          : /expired/i.test(err.message ?? "")
            ? "That code has expired. Send a new one."
            : "That code did not match. Check the newest email, or send a new code.",
      );
      codeRef.current?.select();
      return;
    }
    router.push(next as never);
    router.refresh();
  }

  if (step === "email") {
    return (
      <form onSubmit={onEmail} noValidate className={f.form}>
        <div className={f.field} data-invalid={error ? "" : undefined}>
          <label htmlFor="email" className={f.label}>
            Your work email
          </label>
          <FieldError id="email-error" message={error} />
          <input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "email-error" : undefined}
            className={f.input}
          />
        </div>
        <div className={ui.actions}>
          <button type="submit" className={ui.primary} aria-disabled={busy || undefined} disabled={busy}>
            Email me a code
          </button>
          <p role="status" className={f.pending}>
            {busy ? "Sending…" : ""}
          </p>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onCode} noValidate className={f.form}>
      <p role="status">{notice}</p>
      <div className={f.field} data-invalid={error ? "" : undefined}>
        <label htmlFor="code" className={f.label}>
          Code from the email
        </label>
        <FieldError id="code-error" message={error} />
        <input
          ref={codeRef}
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={9}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "code-error" : undefined}
          className={`${f.input} ${styles.code}`}
        />
      </div>
      <div className={ui.actions}>
        <button type="submit" className={ui.primary} aria-disabled={busy || undefined} disabled={busy}>
          Sign in
        </button>
      </div>
      <div className={styles.links}>
        <button type="button" className={ui.quiet} onClick={() => void sendCode(email)} disabled={busy}>
          Send a new code
        </button>
        <button
          type="button"
          className={ui.quiet}
          onClick={() => {
            setStep("email");
            setError(undefined);
          }}
        >
          Use a different email
        </button>
      </div>
    </form>
  );
}
