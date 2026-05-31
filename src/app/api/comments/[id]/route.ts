import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { dbFirst, dbRun } from "@/lib/db";

export const runtime = "edge";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = (await headers()).get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json() as { status: string };
  const validStatuses = ["pending", "approved", "rejected", "spam"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  // Verify comment belongs to user's site
  const comment = await dbFirst<{ id: string }>(
    `SELECT c.id FROM comments c JOIN sites s ON c.site_id = s.id
     WHERE c.id = ? AND s.user_id = ?`,
    [id, userId]
  );

  if (!comment) return NextResponse.json({ error: "Comentário não encontrado" }, { status: 404 });

  await dbRun("UPDATE comments SET status = ? WHERE id = ?", [status, id]);
  return NextResponse.json({ ok: true });
}
