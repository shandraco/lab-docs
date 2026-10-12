"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { setReviewed } from "@/lib/data/templates";

export async function setReviewedAction(versionId: string, reviewed: boolean): Promise<{ ok: boolean; error?: string }> {
  const user = await requireRole("owner");
  if (!z.uuid().safeParse(versionId).success) return { ok: false, error: "Template not found." };
  await setReviewed(user.id, versionId, reviewed);
  revalidatePath("/templates");
  return { ok: true };
}
