import { describe, expect, it } from "vitest";
import { formatMoney, parseMoney } from "@/lib/doc/format";
import { plain, resolve } from "@/lib/doc/resolve";
import type { Context, RBlock } from "@/lib/doc/types";
import { msa } from "@/lib/templates/msa";
import { capability, outreachEmail } from "@/lib/templates/outreach";
import { sow } from "@/lib/templates/sow";

const lab = {
  name: "Northfield Lab",
  legal_name: "Northfield Lab LLC",
  entity_description: "a Kansas limited liability company",
  address: "100 Main St, Wichita, KS 67202",
  email: "hello@northfield.test",
  phone: "316-555-0100",
  website: "northfield.test",
  signer_name: "Sam Rivera",
  signer_title: "Managing Director",
  governing_law: "Kansas",
  venue: "Sedgwick County, Kansas",
};
const client = {
  name: "Acme",
  legal_name: "Acme Widgets Inc.",
  entity_description: "a Delaware corporation",
  address: "1 Industrial Way, Austin, TX",
  contact_name: "Jo Park",
  contact_title: "COO",
  contact_email: "jo@acme.test",
};
const ctx = (answers: Context["answers"], over: Partial<Context> = {}): Context => ({
  answers,
  client,
  lab,
  sender: { name: "Sam Rivera", email: "sam@northfield.test" },
  today: "2026-10-12",
  ...over,
});
const text = (blocks: RBlock[]) =>
  blocks
    .map((b) =>
      b.t === "list" ? b.items.map(plain).join("\n") : b.t === "table" ? b.rows.flat().join(" ") : b.t === "signatures" ? "" : plain(b.runs),
    )
    .join("\n");

describe("money", () => {
  it("accepts what people type", () => {
    expect(parseMoney("$12,500")).toBe(12500);
    expect(parseMoney(" 1 200.50 ")).toBe(1200.5);
    expect(parseMoney("about 5k")).toBeNull();
    expect(formatMoney("12500")).toBe("$12,500.00");
  });
});

describe("resolve", () => {
  it("fills an MSA from defaults and the client and lab records", () => {
    const doc = resolve(msa, ctx({ effective_date: "2026-11-01" }));
    expect(doc.gaps).toEqual([]);
    const body = text(doc.blocks);
    expect(body).toContain("starts on November 1, 2026");
    expect(body).toContain("Acme Widgets Inc., a Delaware corporation");
    expect(body).toContain("due within 30 days");
    expect(body).toContain("1% per month");
    expect(body).toContain("in the 12 months before the event");
    expect(body).not.toContain("greater of");
    expect(body).toContain("laws of the State of Kansas");
  });

  it("numbers only the clauses that are included", () => {
    const withNs = resolve(msa, ctx({ effective_date: "2026-11-01" }));
    const without = resolve(msa, ctx({ effective_date: "2026-11-01", nonsolicit: "no" }));
    const count = (d: typeof withNs) => d.blocks.filter((b) => b.t === "h").length;
    expect(count(without)).toBe(count(withNs) - 1);
    const last = without.blocks.filter((b) => b.t === "h").at(-1);
    expect(last && last.t === "h" ? last.n : 0).toBe(count(without));
  });

  it("marks a missing detail as a gap and says where to fix it", () => {
    const doc = resolve(msa, ctx({}, { client: { ...client, legal_name: "", address: "" } }));
    expect(doc.gaps).toContainEqual({ label: "Start date of this agreement", where: "form", key: "effective_date" });
    expect(doc.gaps).toContainEqual({ label: "Client's address", where: "client", key: "address" });
    // legal_name falls back to the display name, so it is not a gap
    expect(doc.gaps.find((g) => g.key === "legal_name")).toBeUndefined();
    expect(text(doc.blocks)).toContain("and Acme, a Delaware corporation, of [Client's address]");
  });

  it("asks for the fixed amount only when that cap is chosen", () => {
    const floorless = resolve(msa, ctx({ effective_date: "2026-11-01", liability_cap: "greater_of" }));
    expect(floorless.gaps.map((g) => g.key)).toEqual(["liability_floor"]);
    const done = resolve(msa, ctx({ effective_date: "2026-11-01", liability_cap: "greater_of", liability_floor: "100000" }));
    expect(text(done.blocks)).toContain("(b) $100,000.00");
  });

  it("totals SOW fees and skips blank rows", () => {
    const doc = resolve(
      sow,
      ctx({
        project_name: "Booking app",
        msa_date: "2026-10-01",
        start_date: "2026-11-02",
        summary: "A booking app.",
        deliverables: [{ item: "Web app", criteria: "Bookings work" }, { item: "", criteria: "" }],
        out_of_scope: "- Native apps\n\nHosting costs",
        assumptions: "Client supplies copy",
        client_tasks: "Brand assets",
        milestones: [{ milestone: "Launch", date: "2026-12-15" }],
        fees: [{ item: "Deposit", amount: "$6,000" }, { item: "Final", amount: "6000" }],
        lab_lead: "Sam Rivera",
      }),
    );
    expect(doc.gaps).toEqual([]);
    expect(plain(doc.heading)).toBe("Statement of Work: Booking app");
    const fees = doc.blocks.find((b) => b.t === "table" && b.total);
    expect(fees && fees.t === "table" ? fees.total : "").toBe("$12,000.00");
    const deliverables = doc.blocks.find((b) => b.t === "table");
    expect(deliverables && deliverables.t === "table" ? deliverables.rows.length : 0).toBe(1);
    expect(text(doc.blocks)).toContain("Native apps\nHosting costs");
    expect(text(doc.blocks)).toContain("December 15, 2026");
  });

  it("leaves optional outreach lines out and keeps the opt-out footer", () => {
    const doc = resolve(outreachEmail, ctx({ subject: "Booking for Acme", first_name: "Jo", why_them: "Saw your launch.", offer: "We build booking apps." }));
    expect(doc.gaps).toEqual([]);
    expect(plain(doc.subject!)).toBe("Booking for Acme");
    const body = text(doc.blocks);
    expect(body).toContain("20-minute call");
    expect(body).toContain("100 Main St, Wichita");
    expect(body).toContain('reply “no thanks”');
  });

  it("requires the lab address on outreach (CAN-SPAM)", () => {
    const doc = resolve(outreachEmail, ctx({ subject: "s", first_name: "Jo", why_them: "w", offer: "o" }, { lab: { ...lab, address: "" } }));
    expect(doc.gaps).toContainEqual({ label: "Lab's postal address", where: "lab", key: "address" });
  });

  it("leaves empty company data off the capability statement", () => {
    const doc = resolve(capability, ctx({ overview: "o", capabilities: "Web", differentiators: "Fast", past_work: [{ project: "Acme", result: "2x" }] }));
    expect(doc.gaps).toEqual([]);
    expect(text(doc.blocks)).not.toContain("UEI");
  });
});
