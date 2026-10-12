import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Source_Serif_4 } from "next/font/google";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SkipLink } from "@/components/SkipLink";
import { getLab } from "@/lib/data/settings";
import { site } from "@/lib/site";
import "./globals.css";

// next/font self-hosts at build time, so the CSP stays font-src 'self'.
const ui = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-ui-face", display: "swap" });
// The sheet's face, matching the static Source Serif 4 files embedded in the PDF.
const doc = Source_Serif_4({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--font-doc-face", display: "swap" });

/** A private tool: never indexed (also sent as X-Robots-Tag in next.config.ts). */
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.name,
  robots: { index: false, follow: false },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e6eaef" },
    { media: "(prefers-color-scheme: dark)", color: "#121821" },
  ],
};

// Runs before first paint so a saved theme never flashes. Allowed by the per-request nonce.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

async function helpEmail(): Promise<string | undefined> {
  try {
    return (await getLab()).email || undefined;
  } catch {
    return undefined; // the footer must render even when the database is down
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en-US" className={`${ui.variable} ${doc.variable}`} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SkipLink />
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter helpEmail={await helpEmail()} />
      </body>
    </html>
  );
}
