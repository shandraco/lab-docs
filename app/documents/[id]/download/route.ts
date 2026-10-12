import { getUser } from "@/lib/auth";
import { contextFor, getDocument, listVersions } from "@/lib/data/documents";
import { getTemplateVersion } from "@/lib/data/templates";
import { renderDocx } from "@/lib/doc/docx";
import { renderPdf } from "@/lib/doc/pdf";
import { resolve } from "@/lib/doc/resolve";
import { problemResponse } from "@/lib/problem";
import { getRequestId, requestLogger } from "@/lib/request";

export const runtime = "nodejs";

/** Safe for a Content-Disposition filename: letters, numbers, spaces and a few marks. */
function filename(title: string, version: number, final: boolean, ext: string): string {
  const base = title.replace(/[^\p{L}\p{N} ._()-]+/gu, "").replace(/\s+/g, " ").trim().slice(0, 100) || "Document";
  return `${base} - v${version}${final ? "" : " DRAFT"}.${ext}`;
}

/**
 * GET /documents/:id/download?format=pdf|docx&v=N
 * Final versions print their stored wording (never re-worded from today's records); drafts are
 * worded from the saved answers. A signed-out browser is sent to sign in and brought back.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = await getRequestId();
  const log = await requestLogger("GET /documents/[id]/download");
  const url = new URL(request.url);
  const { id } = await params;

  const user = await getUser();
  if (!user) {
    return Response.redirect(new URL(`/sign-in?next=${encodeURIComponent(url.pathname + url.search)}`, url), 303);
  }

  const format = url.searchParams.get("format");
  if (format !== "pdf" && format !== "docx") return problemResponse("badRequest", requestId, { detail: "format must be pdf or docx" });

  const doc = await getDocument(user, id);
  if (!doc) return problemResponse("notFound", requestId);
  const versions = await listVersions(doc.id);
  const wanted = Number(url.searchParams.get("v") ?? versions[0]?.number);
  const version = versions.find((v) => v.number === wanted);
  if (!version) return problemResponse("notFound", requestId, { detail: "No such version" });

  try {
    let resolved = version.snapshot;
    if (!resolved) {
      const tv = (await getTemplateVersion(version.template_version_id))!;
      const { ctx } = await contextFor(user, doc, version.answers);
      resolved = resolve(tv.definition, ctx);
    }
    const final = Boolean(version.finalized_at);
    const meta = {
      title: doc.title,
      version: `Version ${version.number}, ${final ? "final" : "draft"}`,
      final,
      fingerprint: version.content_hash?.slice(0, 12),
      author: user.name,
    };
    const body = format === "pdf" ? await renderPdf(resolved, meta) : await renderDocx(resolved, meta);
    const name = filename(doc.title, version.number, final, format);
    log.info("download", { id: doc.id, version: version.number, format, actor: user.id });
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${name.replace(/[^\x20-\x7e]/g, "").replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "private, no-store",
        "x-request-id": requestId,
      },
    });
  } catch (err) {
    log.error("render failed", { error: err instanceof Error ? err : new Error(String(err)), id: doc.id, format });
    return problemResponse("internal", requestId);
  }
}
