"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { site, type NavRole } from "@/lib/site-nav";
import styles from "./SiteHeader.module.css";

/** Client only for usePathname: marks the current section with aria-current. */
export function NavLinks({ role }: { role: NavRole }) {
  const pathname = usePathname();
  const items = site.nav.filter((i) => i.roles.includes(role));
  return (
    <ul className={styles.links}>
      {items.map(({ href, label }) => {
        const current =
          href === "/" ? pathname === "/" || pathname.startsWith("/documents") || pathname === "/new" : pathname.startsWith(href);
        return (
          <li key={href}>
            <Link href={href as never} className={styles.link} aria-current={current ? "page" : undefined}>
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
