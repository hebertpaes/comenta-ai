import { NextResponse } from "next/server";
import { dbFirst, dbQuery, dbRun } from "@/lib/db";
import { moderateComment } from "@/lib/ai";
import { nanoid } from "@/lib/utils";
import type { Comment, Site } from "@/types";

export const runtime = "edge";

// CORS headers for cross-origin widget requests
function cors(res: NextResponse): NextResponse {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, X-API-Key");
  return res;
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

  let sql = "SELECT * FROM comments WHERE site_id = ? AND status = 'approved'";
  const args: string[] = [siteId];

  if (pageUrl) { sql += " AND page_url = ?"; args.push(pageUrl); }
  sql += " ORDER BY created_at DESC LIMIT 50";

  const comments = await dbQuery<Comment>(sql, args);
  return cors(NextResponse.json({ comments }));
}

export async function POST(req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const { siteId } = await params;
    const apiKey = req.headers.get("x-api-key");

    // Validate site & API key
    const site = await dbFirst<Site & { api_key: string }>(
      `SELECT s.*, u.api_key
       FROM sites s JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [siteId]
    );

    if (!site) return cors(NextResponse.json({ error: "Site não encontrado" }, { status: 404 }));
    if (site.api_key !== apiKey) return cors(NextResponse.json({ error: "API key inválida" }, { status: 401 }));

    const { page_url, author_name, author_email, content } = await req.json() as {
      page_url: string; author_name: string; author_email?: string; content: string;
    };

    if (!page_url || !author_name || !content) {
      return cors(NextResponse.json({ error: "page_url, author_name e content são obrigatórios" }, { status: 400 }));
    }
    if (content.length < 3) {
      return cors(NextResponse.json({ error: "Comentário muito curto" }, { status: 400 }));
    }
    if (content.length > 2000) {
      return cors(NextResponse.json({ error: "Comentário muito longo (máx 2000 chars)" }, { status: 400 }));
    }

    // AI moderation
    const aiResult = await moderateComment(content, page_url, site.domain);

    // Determine status based on site thresholds
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
      [id, siteId, page_url, author_name, author_email ?? null, content, status, aiResult.score, aiResult.label, aiResult.reason]
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
