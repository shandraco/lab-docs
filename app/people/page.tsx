import type { Metadata } from "next";
import { listPeople } from "@/lib/data/people";
import { ownerPage } from "@/lib/owner-page";
import { AddPersonForm, PeopleList } from "./People";
import styles from "./people.module.css";

export const metadata: Metadata = { title: "People" };

export default async function PeoplePage() {
  const me = await ownerPage("/people");
  const people = await listPeople();
  return (
    <div className={`wrap ${styles.page}`}>
      <h1>People</h1>
      <p className="muted">Everyone who can sign in to Lab Docs. Switching someone off signs them out straight away and can be undone.</p>
      <PeopleList people={people.map((p) => ({ id: p.id, name: p.name, email: p.email, role: p.role, active: !p.deactivatedAt, me: p.id === me.id }))} />
      <h2>Add someone</h2>
      <AddPersonForm />
    </div>
  );
}
