/** Navigation, kept apart from lib/site.ts so client components do not import server env. */
export type NavRole = "owner" | "staff" | "partner";

export const site = {
  name: "Lab Docs",
  nav: [
    { href: "/", label: "Documents", roles: ["owner", "staff", "partner"] },
    { href: "/clients", label: "Clients", roles: ["owner", "staff", "partner"] },
    { href: "/templates", label: "Templates", roles: ["owner"] },
    { href: "/settings", label: "Lab details", roles: ["owner"] },
    { href: "/people", label: "People", roles: ["owner"] },
  ] as { href: string; label: string; roles: NavRole[] }[],
} as const;
