import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentList } from "@/components/DocumentList";
import ui from "@/components/ui.module.css";
import { pageUser } from "@/lib/auth";
import { clientKeys, getClient } from "@/lib/data/clients";
import { listDocuments } from "@/lib/data/documents";
import { ClientForm } from "../ClientForm";
import styles from "../clients.module.css";
import { ArchiveClient } from "./ArchiveClient";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ back?: string; added?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const client = await getClient(await pageUser(`/clients/${id}`), id);
  return { title: client?.name ?? "Client not found" };
}

export default async function ClientPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { back, added } = await searchParams;
  const user = await pageUser(`/clients/${id}`);
  const client = await getClient(user, id);
  if (!client) notFound();
  const docs = await listDocuments(user, { clientId: client.id });
  const safeBack = back && /^\/documents\/[\w-]+$/.test(back) ? back : undefined;

  return (
    <div className={`wrap ${styles.page}`}>
      <p>
        <Link href={(safeBack ?? "/clients") as never}>{safeBack ? "Back to the document" : "Back to clients"}</Link>
      </p>
      <h1>{client.name}</h1>
      {added ? <p className={styles.notice} role="status">Client added.</p> : null}
      {client.archived_at ? (
        <div className={styles.archived}>
          <p>This client is archived and hidden from lists.</p>
          <ArchiveClient id={client.id} archived />
        </div>
      ) : null}
      <div className={styles.columns}>
        <ClientForm
          id={client.id}
          initial={Object.fromEntries(clientKeys.map((k) => [k, client[k]]))}
          back={safeBack}
          submitLabel={safeBack ? "Save and go back to the document" : "Save changes"}
        />
        <div className={styles.side}>
          <h2>Documents</h2>
          {docs.length ? <DocumentList docs={docs} showClient={false} /> : <p className="muted">No documents for {client.name} yet.</p>}
          {!client.archived_at ? (
            <>
              <p>
                <Link href={`/new?client=${client.id}` as never} className={ui.secondary}>
                  Make a document for {client.name}
                </Link>
              </p>
              <ArchiveClient id={client.id} archived={false} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
