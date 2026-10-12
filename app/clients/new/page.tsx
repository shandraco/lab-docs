import type { Metadata } from "next";
import Link from "next/link";
import { pageUser } from "@/lib/auth";
import { ClientForm } from "../ClientForm";
import styles from "../clients.module.css";

export const metadata: Metadata = { title: "Add a client" };

export default async function NewClientPage({ searchParams }: { searchParams: Promise<{ then?: string }> }) {
  await pageUser("/clients/new");
  const { then } = await searchParams;
  return (
    <div className={`wrap ${styles.page}`}>
      <p>
        <Link href="/clients">Back to clients</Link>
      </p>
      <h1>Add a client</h1>
      <p className="muted">Only the name is needed now. Contracts also need the legal name, company type and address, and you can add those later.</p>
      <ClientForm initial={{}} then={then === "document" ? "document" : undefined} submitLabel={then === "document" ? "Save and make a document" : "Save client"} />
    </div>
  );
}
