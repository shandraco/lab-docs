/** US formats. Fixed locale and time zone so server and browser print the same thing. */

const dateFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
const moneyFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** "2026-10-12" -> "October 12, 2026". Anything unparseable is returned as typed. */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return iso;
  return dateFmt.format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))));
}

/** Accepts what people type: "$12,500", "12500.5", "12 500". Returns null when it is not a number. */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[\s$,]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

export function formatMoney(input: string | number): string {
  const n = typeof input === "number" ? input : parseMoney(input);
  return n === null ? String(input) : moneyFmt.format(n);
}

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
