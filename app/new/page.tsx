import type { Metadata } from "next";
import Link from "next/link";
import { pageUser } from "@/lib/auth";
import { listClients } from "@/lib/data/clients";
import { listTemplates } from "@/lib/data/templates";
import { NewDocumentForm } from "./NewDocumentForm";
import styles from "./new.module.css";

export const metadata: Metadata = { title: "Make a document" };

export default async function NewDocumentPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await pageUser("/new");
  const sp = await searchParams;
  const [templates, clients] = await Promise.all([listTemplates(), listClients(user)]);
  return (
    <div className={`wrap ${styles.page}`}>
      <p>
        <Link href="/">Back to documents</Link>
      </p>
      <h1>Make a document</h1>
      <NewDocumentForm
        templates={templates.map((t) => ({ id: t.id, kind: t.kind, name: t.name, summary: t.summary }))}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        initial={{ template: sp.type ?? "", client: sp.client ?? "" }}
      />
    </div>
  );
}
