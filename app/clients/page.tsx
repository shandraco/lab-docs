import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import ui from "@/components/ui.module.css";
import { pageUser } from "@/lib/auth";
import { listClients } from "@/lib/data/clients";
import styles from "./clients.module.css";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const user = await pageUser("/clients");
  const clients = await listClients(user);
  return (
    <div className={`wrap ${styles.page}`}>
      <div className={styles.top}>
        <h1>Clients</h1>
        <Link href="/clients/new" className={ui.primary}>
          Add a client
        </Link>
      </div>
      {clients.length ? (
        <ul className={styles.list}>
          {clients.map((c) => (
            <li key={c.id} className={styles.item}>
              <Link href={`/clients/${c.id}` as never} className={styles.name}>
                {c.name}
              </Link>
              <span className={styles.meta}>
                {c.documents === 1 ? "1 document" : `${c.documents} documents`}
                {c.contact_name ? `. Contact: ${c.contact_name}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No clients yet" action={<Link href="/clients/new" className={ui.primary}>Add your first client</Link>}>
          <p>Add a business once and every document for them fills in their details for you.</p>
        </EmptyState>
      )}
    </div>
  );
}
