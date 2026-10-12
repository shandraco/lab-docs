import Link from "next/link";
import { DocumentList } from "@/components/DocumentList";
import { EmptyState } from "@/components/EmptyState";
import ui from "@/components/ui.module.css";
import { pageUser } from "@/lib/auth";
import { listClients } from "@/lib/data/clients";
import { getDocument, listDocuments } from "@/lib/data/documents";
import { RestoreButton } from "./documents/[id]/RestoreButton";
import styles from "./home.module.css";

export default async function Home({ searchParams }: { searchParams: Promise<{ binned?: string }> }) {
  const user = await pageUser("/");
  const { binned } = await searchParams;
  const [docs, clients, binnedDoc] = await Promise.all([
    listDocuments(user, { limit: 100 }),
    listClients(user),
    binned ? getDocument(user, binned) : Promise.resolve(null),
  ]);

  return (
    <div className={`wrap ${styles.page}`}>
      <div className={styles.top}>
        <h1>Documents</h1>
        <Link href={(clients.length ? "/new" : "/clients/new?then=document") as never} className={ui.primary}>
          Make a document
        </Link>
      </div>

      {binnedDoc?.archived_at ? (
        <div className={styles.undo} role="status">
          <p>&ldquo;{binnedDoc.title}&rdquo; is in the bin.</p>
          <RestoreButton id={binnedDoc.id} label="Undo" />
        </div>
      ) : null}

      {docs.length ? (
        <DocumentList docs={docs} />
      ) : (
        <EmptyState
          title="No documents yet"
          action={
            <Link href={(clients.length ? "/new" : "/clients/new?then=document") as never} className={ui.primary}>
              {clients.length ? "Make your first document" : "Add your first client"}
            </Link>
          }
        >
          <p>
            {clients.length
              ? "Pick a document type and a client, fill in the form, and download it as a PDF or Word file."
              : "Every document is for a client, so start by adding one. It takes a minute."}
          </p>
        </EmptyState>
      )}
    </div>
  );
}
