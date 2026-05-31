import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { dbFirst, dbRun } from "@/lib/db";

export const runtime = "edge";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = (await headers()).get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const site = await dbFirst<{ id: string }>(
    "SELECT id FROM sites WHERE id = ? AND user_id = ?",
    [id, userId]
  );

  if (!site) return NextResponse.json({ error: "Site não encontrado" }, { status: 404 });

  await dbRun("DELETE FROM sites WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
