import type { Metadata } from "next";
import Link from "next/link";
import ui from "@/components/ui.module.css";
import styles from "./status-page.module.css";

// Next sends this with a 404 status and a noindex robots tag. Title has no site name: the
// layout template adds it.
export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className={`wrap ${styles.page}`}>
      <h1>Page not found</h1>
      <p>If you typed the address, check it is spelled correctly. If you followed a link, the document or client may have been removed, or it may belong to someone else.</p>
      <div className={ui.actions}>
        <Link href="/" className={ui.primary}>
          Go to your documents
        </Link>
      </div>
    </div>
  );
}
