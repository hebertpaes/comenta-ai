import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { dbFirst } from "@/lib/db";
import type { User } from "@/types";

export const runtime = "edge";

export async function GET() {
  const userId = (await headers()).get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const user = await dbFirst<Pick<User, "id" | "email" | "name" | "api_key" | "plan">>(
    "SELECT id, email, name, api_key, plan FROM users WHERE id = ?",
    [userId]
  );

  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  return NextResponse.json({ user });
}
