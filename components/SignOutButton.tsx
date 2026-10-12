"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import ui from "./ui.module.css";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={ui.quiet}
      aria-disabled={busy || undefined}
      onClick={async () => {
        if (busy) return;
        setBusy(true);
        await authClient.signOut();
        router.push("/sign-in");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
