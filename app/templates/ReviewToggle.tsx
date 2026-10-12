"use client";

import { useRouter } from "next/navigation";
import ui from "@/components/ui.module.css";
import { setReviewedAction } from "./actions";

export function ReviewToggle({ versionId, reviewed, version }: { versionId: string; reviewed: boolean; version: number }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={reviewed ? ui.quiet : ui.secondary}
      onClick={async () => {
        await setReviewedAction(versionId, !reviewed);
        router.refresh();
      }}
    >
      {reviewed ? "Remove the review mark" : `A lawyer has reviewed version ${version}`}
    </button>
  );
}
