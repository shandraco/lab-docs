"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ui from "@/components/ui.module.css";
import { restoreAction } from "./actions";

export function RestoreButton({ id, label = "Restore it" }: { id: string; label?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  return (
    <>
      <button
        type="button"
        className={ui.primary}
        onClick={async () => {
          const r = await restoreAction(id);
          if (r.ok) router.refresh();
          else setError(r.error);
        }}
      >
        {label}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </>
  );
}
