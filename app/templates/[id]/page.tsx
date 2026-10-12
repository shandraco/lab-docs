import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sheet } from "@/components/doc/Sheet";
import { getLab } from "@/lib/data/settings";
import { getTemplate, getTemplateVersion } from "@/lib/data/templates";
import { todayIso } from "@/lib/doc/format";
import { resolve } from "@/lib/doc/resolve";
import { ownerPage } from "@/lib/owner-page";
import styles from "../templates.module.css";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Template preview" };

/** The wording with every blank showing as a highlighted label: what a lawyer reviews. */
export default async function TemplatePreview({ params }: Props) {
  const user = await ownerPage("/templates");
  const t = await getTemplate((await params).id);
  if (!t) notFound();
  const tv = (await getTemplateVersion(t.version_id))!;
  const blankClient = { name: "", legal_name: "", entity_description: "", address: "", contact_name: "", contact_title: "", contact_email: "" };
  const doc = resolve(tv.definition, { answers: {}, client: blankClient, lab: await getLab(), sender: { name: user.name, email: user.email }, today: todayIso() });
  return (
    <div className={`wrap ${styles.page}`}>
      <p>
        <Link href="/templates">Back to templates</Link>
      </p>
      <h1>{t.name}</h1>
      <p className="muted">Version {t.version}, with the default choices. Yellow labels are filled in for each document.</p>
      <div className={styles.preview}>
        <Sheet doc={doc} draft footer={`Template version ${t.version}`} />
      </div>
    </div>
  );
}
