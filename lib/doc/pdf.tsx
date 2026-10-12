import "server-only";
import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { RBlock, ResolvedDoc, Run } from "./types";

/**
 * PDF from the resolved document, drawn as real text (not a screenshot of the page), with
 * static per-weight fonts embedded. Brain: react-pdf-export-needs-fonts-and-fixed-layout,
 * chrome-print-to-pdf-turns-variable-fonts-into-type-3. Fonts live in assets/fonts and are
 * traced into the function by next.config.ts.
 */
const fontDir = path.join(process.cwd(), "assets/fonts");
Font.register({
  family: "Source Serif",
  fonts: [
    { src: path.join(fontDir, "source-serif-4-latin-400-normal.woff"), fontWeight: 400 },
    { src: path.join(fontDir, "source-serif-4-latin-400-italic.woff"), fontWeight: 400, fontStyle: "italic" },
    { src: path.join(fontDir, "source-serif-4-latin-700-normal.woff"), fontWeight: 700 },
    { src: path.join(fontDir, "source-serif-4-latin-700-italic.woff"), fontWeight: 700, fontStyle: "italic" },
  ],
});
// Legal text should not hyphenate words across lines.
Font.registerHyphenationCallback((word) => [word]);

const ink = "#1A2332";
const muted = "#536173";
const s = StyleSheet.create({
  page: { paddingTop: 64, paddingBottom: 72, paddingHorizontal: 72, fontFamily: "Source Serif", fontSize: 10.5, lineHeight: 1.45, color: ink },
  draft: { position: "absolute", top: 28, left: 72, right: 72, fontSize: 9, color: "#9A3412", textAlign: "center" },
  heading: { fontSize: 20, fontWeight: 700, lineHeight: 1.2, marginBottom: 4 },
  date: { color: muted, marginBottom: 20 },
  h: { fontSize: 11.5, fontWeight: 700, marginTop: 14, marginBottom: 4 },
  p: { marginBottom: 7 },
  note: { fontSize: 9, color: muted, marginTop: 10 },
  li: { flexDirection: "row", marginBottom: 3, paddingLeft: 8 },
  bullet: { width: 12 },
  liText: { flex: 1 },
  table: { borderTopWidth: 1, borderColor: "#C5CDD8", marginVertical: 6 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#C5CDD8" },
  th: { flex: 1, paddingVertical: 4, paddingHorizontal: 6, fontWeight: 700 },
  td: { flex: 1, paddingVertical: 4, paddingHorizontal: 6 },
  num: { textAlign: "right" },
  sigs: { flexDirection: "row", gap: 36, marginTop: 28 },
  sig: { flex: 1 },
  sigOrg: { fontWeight: 700, marginBottom: 28 },
  sigLine: { borderBottomWidth: 1, borderColor: ink, marginBottom: 4 },
  sigLabel: { fontSize: 9, color: muted, marginBottom: 10 },
  footer: { position: "absolute", bottom: 36, left: 72, right: 72, fontSize: 8.5, color: muted, flexDirection: "row", justifyContent: "space-between" },
  gap: { backgroundColor: "#FDE68A" },
});

function Runs({ runs }: { runs: Run[] }) {
  return (
    <>
      {runs.map((r, i) => (
        <Text key={i} style={[r.b ? { fontWeight: 700 } : {}, r.gap ? s.gap : {}]}>
          {r.gap ? `[${r.text}]` : r.text}
        </Text>
      ))}
    </>
  );
}

function Block({ b }: { b: RBlock }) {
  switch (b.t) {
    case "h":
      return (
        <Text style={s.h} minPresenceAhead={40}>
          {b.n}. <Runs runs={b.runs} />
        </Text>
      );
    case "p":
      return (
        <Text style={s.p}>
          <Runs runs={b.runs} />
        </Text>
      );
    case "note":
      return (
        <Text style={s.note}>
          <Runs runs={b.runs} />
        </Text>
      );
    case "list":
      return (
        <View style={{ marginBottom: 6 }}>
          {b.items.map((item, i) => (
            <View key={i} style={s.li} wrap={false}>
              <Text style={s.bullet}>•</Text>
              <Text style={s.liText}>
                <Runs runs={item} />
              </Text>
            </View>
          ))}
        </View>
      );
    case "table":
      return (
        <View style={s.table}>
          <View style={s.tr}>
            {b.columns.map((c, i) => (
              <Text key={i} style={[s.th, c.numeric ? s.num : {}]}>
                {c.label}
              </Text>
            ))}
          </View>
          {b.rows.map((row, r) => (
            <View key={r} style={s.tr} wrap={false}>
              {row.map((cell, i) => (
                <Text key={i} style={[s.td, b.columns[i]?.numeric ? s.num : {}]}>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
          {b.total ? (
            <View style={s.tr} wrap={false}>
              <Text style={[s.td, { fontWeight: 700 }]}>Total</Text>
              {b.columns.slice(1).map((c, i) =>
                i === b.columns.length - 2 ? (
                  <Text key={i} style={[s.td, s.num, { fontWeight: 700 }]}>
                    {b.total}
                  </Text>
                ) : (
                  <Text key={i} style={s.td} />
                ),
              )}
            </View>
          ) : null}
        </View>
      );
    case "signatures":
      return (
        <View style={s.sigs} wrap={false}>
          {b.parties.map((p, i) => (
            <View key={i} style={s.sig}>
              <Text style={s.sigOrg}>
                <Runs runs={p.org} />
              </Text>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>Signature</Text>
              <Text>
                <Runs runs={p.name} />
              </Text>
              <Text style={s.sigLabel}>
                <Runs runs={p.title} />
              </Text>
              <View style={[s.sigLine, { marginTop: 14 }]} />
              <Text style={s.sigLabel}>Date</Text>
            </View>
          ))}
        </View>
      );
  }
}

export interface PdfMeta {
  title: string;
  /** e.g. "Version 2, final". */
  version: string;
  final: boolean;
  /** First 12 hex characters of the content hash, printed on final versions. */
  fingerprint?: string;
  author: string;
}

export async function renderPdf(doc: ResolvedDoc, meta: PdfMeta): Promise<Buffer> {
  const heading = doc.heading.map((r) => (r.gap ? `[${r.text}]` : r.text)).join("");
  return renderToBuffer(
    <Document title={meta.title} author={meta.author} creator="Lab Docs" producer="Lab Docs">
      <Page size="LETTER" style={s.page}>
        {meta.final ? null : (
          <Text style={s.draft} fixed>
            Draft. Not for signature.
          </Text>
        )}
        <Text style={s.heading}>{heading}</Text>
        <Text style={s.date}>{doc.date}</Text>
        {doc.blocks.map((b, i) => (
          <Block key={i} b={b} />
        ))}
        <View style={s.footer} fixed>
          <Text>
            {meta.version}
            {meta.fingerprint ? `, fingerprint ${meta.fingerprint}` : ""}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>,
  );
}
