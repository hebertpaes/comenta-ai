import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { dbQuery } from "@/lib/db";
import type { Comment } from "@/types";

export const runtime = "edge";

export async function GET(req: Request) {
  const userId = (await headers()).get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const siteId = searchParams.get("site_id");

  let sql = `SELECT c.* FROM comments c
             JOIN sites s ON c.site_id = s.id
             WHERE s.user_id = ?`;
  const params: string[] = [userId];

  if (status) { sql += " AND c.status = ?"; params.push(status); }
  if (siteId) { sql += " AND c.site_id = ?"; params.push(siteId); }

  sql += " ORDER BY c.created_at DESC LIMIT 100";

  const comments = await dbQuery<Comment>(sql, params);
  return NextResponse.json({ comments });
}
