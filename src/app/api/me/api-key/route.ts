import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { dbRun } from "@/lib/db";
import { generateApiKey } from "@/lib/utils";

export const runtime = "edge";

export async function POST() {
  const userId = (await headers()).get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const apiKey = generateApiKey();
  await dbRun("UPDATE users SET api_key = ? WHERE id = ?", [apiKey, userId]);

  return NextResponse.json({ api_key: apiKey });
}
