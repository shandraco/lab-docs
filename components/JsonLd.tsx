/**
 * Structured data as a non-executing <script type="application/ld+json">, which CSP does not
 * block. `<` is escaped so a value containing "</script>" cannot break out (per the Next docs).
 * Brain: structured-data-that-earns-rich-results.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
