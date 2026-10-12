import type { Metadata } from "next";
import { getLab } from "@/lib/data/settings";
import { ownerPage } from "@/lib/owner-page";
import { LabForm } from "./LabForm";
import styles from "./settings.module.css";

export const metadata: Metadata = { title: "Lab details" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ back?: string }> }) {
  await ownerPage("/settings");
  const { back } = await searchParams;
  return (
    <div className={`wrap ${styles.page}`}>
      <h1>Lab details</h1>
      <p className="muted">These are printed on every document. Final documents keep the details they were made with.</p>
      <LabForm initial={await getLab()} back={back && /^\/documents\/[\w-]+$/.test(back) ? back : undefined} />
    </div>
  );
}
