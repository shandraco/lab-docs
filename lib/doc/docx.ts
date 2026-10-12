import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { PdfMeta } from "./pdf";
import type { RBlock, ResolvedDoc, Run } from "./types";

/**
 * Word file for clients whose lawyers want to redline. Plain paragraphs and real tables, no
 * Word auto-numbering (clause numbers are typed), so tracked changes stay readable.
 * Georgia because Source Serif is rarely installed on the reader's machine.
 */
const FONT = "Georgia";

function runs(list: Run[], extra: { bold?: boolean; size?: number; color?: string } = {}): TextRun[] {
  return list.flatMap((r) =>
    // Line breaks inside a paragraph (email sign-offs) become Word breaks.
    (r.gap ? `[${r.text}]` : r.text).split("\n").map(
      (line, i) =>
        new TextRun({
          text: line,
          break: i > 0 ? 1 : undefined,
          bold: r.b || extra.bold,
          size: extra.size,
          color: extra.color,
          highlight: r.gap ? "yellow" : undefined,
        }),
    ),
  );
}

const thin = { style: BorderStyle.SINGLE, size: 4, color: "C5CDD8" };
const borders = { top: thin, bottom: thin, left: thin, right: thin, insideHorizontal: thin, insideVertical: thin };

function cell(text: string, opts: { bold?: boolean; right?: boolean } = {}) {
  return new TableCell({
    children: [new Paragraph({ alignment: opts.right ? AlignmentType.RIGHT : undefined, children: [new TextRun({ text, bold: opts.bold })] })],
  });
}

function block(b: RBlock): (Paragraph | Table)[] {
  switch (b.t) {
    case "h":
      return [new Paragraph({ spacing: { before: 240, after: 80 }, keepNext: true, children: [new TextRun({ text: `${b.n}. `, bold: true }), ...runs(b.runs, { bold: true })] })];
    case "p":
      return [new Paragraph({ spacing: { after: 140 }, children: runs(b.runs) })];
    case "note":
      return [new Paragraph({ spacing: { before: 200 }, children: runs(b.runs, { size: 18, color: "536173" }) })];
    case "list":
      return b.items.map((item) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: runs(item) }));
    case "table": {
      const header = new TableRow({ tableHeader: true, children: b.columns.map((c) => cell(c.label, { bold: true, right: c.numeric })) });
      const body = b.rows.map((row) => new TableRow({ cantSplit: true, children: row.map((v, i) => cell(v, { right: b.columns[i]?.numeric })) }));
      const total = b.total
        ? [new TableRow({ children: b.columns.map((_, i) => (i === 0 ? cell("Total", { bold: true }) : i === b.columns.length - 1 ? cell(b.total!, { bold: true, right: true }) : cell(""))) })]
        : [];
      return [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders, rows: [header, ...body, ...total] }), new Paragraph({ children: [] })];
    }
    case "signatures":
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
          rows: [
            new TableRow({
              cantSplit: true,
              children: b.parties.map(
                (p) =>
                  new TableCell({
                    children: [
                      new Paragraph({ spacing: { before: 360, after: 480 }, children: runs(p.org, { bold: true }) }),
                      new Paragraph({ children: [new TextRun("Signature: ______________________")] }),
                      new Paragraph({ spacing: { before: 160 }, children: [new TextRun("Name: "), ...runs(p.name)] }),
                      new Paragraph({ children: [new TextRun("Title: "), ...runs(p.title)] }),
                      new Paragraph({ spacing: { before: 160 }, children: [new TextRun("Date: ______________________")] }),
                    ],
                  }),
              ),
            }),
          ],
        }),
      ];
  }
}

export async function renderDocx(doc: ResolvedDoc, meta: PdfMeta): Promise<Buffer> {
  const document = new Document({
    title: meta.title,
    creator: meta.author,
    styles: { default: { document: { run: { font: FONT, size: 21 }, paragraph: { spacing: { line: 300 } } } } },
    sections: [
      {
        properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
        headers: meta.final
          ? undefined
          : { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Draft. Not for signature.", color: "9A3412", size: 18 })] })] }) },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `${meta.version}${meta.fingerprint ? `, fingerprint ${meta.fingerprint}` : ""}. Page `, size: 17, color: "536173" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 17, color: "536173" }),
                  new TextRun({ text: " of ", size: 17, color: "536173" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 17, color: "536173" }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({ spacing: { after: 60 }, children: runs(doc.heading, { bold: true, size: 36 }) }),
          new Paragraph({ spacing: { after: 360 }, children: [new TextRun({ text: doc.date, color: "536173" })] }),
          ...doc.blocks.flatMap(block),
        ],
      },
    ],
  });
  return Packer.toBuffer(document);
}
