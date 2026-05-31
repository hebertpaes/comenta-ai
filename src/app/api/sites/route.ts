import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { dbQuery, dbRun } from "@/lib/db";
import { nanoid } from "@/lib/utils";
import type { Site } from "@/types";

export const runtime = "edge";

export async function GET() {
  const userId = (await headers()).get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const sites = await dbQuery<Site & { comment_count: number }>(
    `SELECT s.*, COUNT(c.id) as comment_count
     FROM sites s
     LEFT JOIN comments c ON c.site_id = s.id
     WHERE s.user_id = ?
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
    [userId]
  );

  return NextResponse.json({ sites });
}

export async function POST(req: Request) {
  const userId = (await headers()).get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { name, domain } = await req.json() as { name: string; domain: string };

  if (!name || !domain) {
    return NextResponse.json({ error: "Nome e domínio são obrigatórios" }, { status: 400 });
  }

  const id = nanoid();
  const cleanedDomain = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  await dbRun(
    "INSERT INTO sites (id, user_id, name, domain) VALUES (?, ?, ?, ?)",
    [id, userId, name.trim(), cleanedDomain]
  );

  const site: Site = {
    id,
    user_id: userId,
    name: name.trim(),
    domain: cleanedDomain,
    auto_approve_threshold: 0.8,
    auto_reject_threshold: 0.3,
    created_at: new Date().toISOString(),
  };

  return NextResponse.json({ site }, { status: 201 });
}
