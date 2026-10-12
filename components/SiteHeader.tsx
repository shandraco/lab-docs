import Link from "next/link";
import { getUser } from "@/lib/auth";
import { NavLinks } from "./NavLinks";
import { SignOutButton } from "./SignOutButton";
import styles from "./SiteHeader.module.css";

export async function SiteHeader() {
  const user = await getUser();
  return (
    <header className={styles.header}>
      <div className={`wrap ${styles.bar}`}>
        <Link href="/" className={styles.mark}>
          Lab Docs<span className="visually-hidden">, all documents</span>
        </Link>
        {user ? (
          <>
            <nav aria-label="Main">
              <NavLinks role={user.role} />
            </nav>
            <div className={styles.who}>
              <span>{user.name}</span>
              <SignOutButton />
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
