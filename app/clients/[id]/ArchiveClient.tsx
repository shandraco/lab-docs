"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ui from "@/components/ui.module.css";
import { archiveClientAction } from "../actions";

/** Archive hides a client from lists; it is undone with one click, so no confirm dialog. */
export function ArchiveClient({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const run = async (next: boolean) => {
    const r = await archiveClientAction(id, next);
    setMessage(r.ok ? (next ? "Client archived." : undefined) : r.error);
    router.refresh();
  };
  return (
    <div>
      <button type="button" className={archived ? ui.primary : `${ui.quiet} ${ui.danger}`} onClick={() => run(!archived)}>
        {archived ? "Bring this client back" : "Archive this client"}
      </button>
      <p role="status">
        {message}
        {message === "Client archived." ? (
          <>
            {" "}
            <button type="button" className={ui.quiet} onClick={() => run(false)}>
              Undo
            </button>
          </>
        ) : null}
      </p>
    </div>
  );
}
