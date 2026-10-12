import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Status } from "@/components/Status";
import { pageUser } from "@/lib/auth";
import { contextFor, getDocument, listVersions } from "@/lib/data/documents";
import { getTemplateVersion } from "@/lib/data/templates";
import { when } from "@/lib/when";
import { Editor } from "./Editor";
import { FinalView } from "./FinalView";
import { RestoreButton } from "./RestoreButton";
import styles from "./document.module.css";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await pageUser(`/documents/${id}`);
  const doc = await getDocument(user, id);
  return { title: doc?.title ?? "Document not found" };
}

export default async function DocumentPage({ params }: Props) {
  const { id } = await params;
  const user = await pageUser(`/documents/${id}`);
  const doc = await getDocument(user, id);
  if (!doc) notFound();

  const versions = await listVersions(doc.id);
  const current = versions[0]!;
  const tv = (await getTemplateVersion(current.template_version_id))!;
  const { ctx, client } = await contextFor(user, doc, current.answers);
  const context = { client: ctx.client, lab: ctx.lab, sender: ctx.sender, today: ctx.today };

  return (
    <div className={`wrap ${styles.page}`}>
      <div className={styles.top}>
        <p>
          <Link href="/">Back to documents</Link>
        </p>
        <h1>{doc.title}</h1>
        <p className={styles.meta}>
          <span>
            {doc.template_name} for <Link href={`/clients/${client.id}` as never}>{client.name}</Link>.
          </span>
          <Status status={current.finalized_at ? "final" : "draft"} version={current.number} />
        </p>
      </div>

      {doc.archived_at ? (
        <div className={styles.binned} role="status">
          <p>This document is in the bin. Nobody can change it until it is restored.</p>
          <RestoreButton id={doc.id} />
        </div>
      ) : null}

      {current.finalized_at || doc.archived_at ? (
        <FinalView
          docId={doc.id}
          version={current}
          live={current.snapshot ? null : { definition: tv.definition, context, answers: current.answers }}
          archived={Boolean(doc.archived_at)}
        />
      ) : (
        <Editor
          docId={doc.id}
          clientId={client.id}
          title={doc.title}
          version={current.number}
          definition={tv.definition}
          context={context}
          answers={current.answers}
          isOwner={user.role === "owner"}
          reviewed={Boolean(tv.attorney_reviewed_at)}
        />
      )}

      <section className={styles.versions} aria-labelledby="versions">
        <h2 id="versions">Versions</h2>
        <ul className={styles.vlist}>
          {versions.map((v) => (
            <li key={v.id} className={styles.vitem}>
              <span>
                <Status status={v.finalized_at ? "final" : "draft"} version={v.number} />{" "}
                {v.finalized_at ? `Locked ${when(v.finalized_at)} by ${v.finalized_by_name}.` : `Last saved ${when(v.updated_at)}.`}
              </span>
              <span className={styles.vlinks}>
                <a href={`/documents/${doc.id}/download?format=pdf&v=${v.number}`}>
                  PDF<span className="visually-hidden">, version {v.number}</span>
                </a>
                <a href={`/documents/${doc.id}/download?format=docx&v=${v.number}`}>
                  Word<span className="visually-hidden">, version {v.number}</span>
                </a>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
