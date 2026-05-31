import { NextResponse } from "next/server";
import { dbFirst, dbQuery, dbRun } from "@/lib/db";
import { moderateComment } from "@/lib/ai";
import { nanoid } from "@/lib/utils";
import type { Comment, Site } from "@/types";

export const runtime = "edge";

function cors(res: NextResponse): NextResponse {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

// Validate that the request comes from the registered domain (or dev environment)
function isOriginAllowed(req: Request, siteDomain: string): boolean {
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) return true; // Allow server-side / curl / dev requests
  try {
    const originHost = new URL(origin).hostname.replace(/^www\./, "");
    const siteHost = siteDomain.toLowerCase().replace(/^www\./, "");
    return originHost === siteHost || originHost.endsWith("." + siteHost) || originHost === "localhost";
  } catch {
    return false;
  }
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

export async function GET(req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { searchParams } = new URL(req.url);
  const pageUrl = searchParams.get("page_url");

  const site = await dbFirst<Site>("SELECT id FROM sites WHERE id = ?", [siteId]);
  if (!site) return cors(NextResponse.json({ error: "Site não encontrado" }, { status: 404 }));

  let sql = "SELECT id, site_id, page_url, author_name, content, created_at FROM comments WHERE site_id = ? AND status = 'approved'";
  const args: string[] = [siteId];

  if (pageUrl) { sql += " AND page_url = ?"; args.push(pageUrl); }
  sql += " ORDER BY created_at DESC LIMIT 50";

  const comments = await dbQuery<Comment>(sql, args);
  return cors(NextResponse.json({ comments }));
}

export async function POST(req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const { siteId } = await params;

    const site = await dbFirst<Site>(
      "SELECT id, domain, auto_approve_threshold, auto_reject_threshold FROM sites WHERE id = ?",
      [siteId]
    );

    if (!site) return cors(NextResponse.json({ error: "Site não encontrado" }, { status: 404 }));

    // Validate origin against the registered domain
    if (!isOriginAllowed(req, site.domain)) {
      return cors(NextResponse.json({ error: "Origem não autorizada para este site" }, { status: 403 }));
    }

    const { page_url, author_name, author_email, content } = await req.json() as {
      page_url: string; author_name: string; author_email?: string; content: string;
    };

    if (!page_url || !author_name?.trim() || !content) {
      return cors(NextResponse.json({ error: "page_url, author_name e content são obrigatórios" }, { status: 400 }));
    }
    if (content.length < 3) {
      return cors(NextResponse.json({ error: "Comentário muito curto" }, { status: 400 }));
    }
    if (content.length > 2000) {
      return cors(NextResponse.json({ error: "Comentário muito longo (máx 2000 chars)" }, { status: 400 }));
    }

    const aiResult = await moderateComment(content, page_url, site.domain);

    let status: "approved" | "pending" | "rejected" | "spam";
    if (aiResult.label === "spam" || aiResult.label === "toxic") {
      status = aiResult.label === "spam" ? "spam" : "rejected";
    } else if (aiResult.score >= site.auto_approve_threshold) {
      status = "approved";
    } else if (aiResult.score < site.auto_reject_threshold) {
      status = "rejected";
    } else {
      status = "pending";
    }

    const id = nanoid();
    await dbRun(
      `INSERT INTO comments (id, site_id, page_url, author_name, author_email, content, status, ai_score, ai_label, ai_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, siteId, page_url, author_name.trim(), author_email ?? null, content, status, aiResult.score, aiResult.label, aiResult.reason]
    );

    return cors(NextResponse.json({
      id,
      status,
      message: status === "approved"
        ? "Comentário publicado!"
        : status === "pending"
        ? "Comentário enviado para revisão."
        : "Comentário não aprovado.",
    }, { status: 201 }));

  } catch (err) {
    console.error(err);
    return cors(NextResponse.json({ error: "Erro interno" }, { status: 500 }));
  }
}
