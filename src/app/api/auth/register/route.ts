import { NextResponse } from "next/server";
import { nanoid, generateApiKey, hashPassword } from "@/lib/utils";
import { dbFirst, dbRun } from "@/lib/db";
import { signToken } from "@/lib/auth";
import type { User } from "@/types";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json() as { name: string; email: string; password: string };

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "A senha deve ter no mínimo 8 caracteres" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await dbFirst<User>("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
    if (existing) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    }

    const id = nanoid();
    const apiKey = generateApiKey();
    const passwordHash = await hashPassword(password);

    await dbRun(
      "INSERT INTO users (id, email, name, password_hash, api_key) VALUES (?, ?, ?, ?, ?)",
      [id, normalizedEmail, name.trim(), passwordHash, apiKey]
    );

    const token = await signToken({ sub: id, email: normalizedEmail, name });
    const res = NextResponse.json({ ok: true });
    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
