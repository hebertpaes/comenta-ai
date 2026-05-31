import { NextResponse } from "next/server";
import { dbFirst } from "@/lib/db";
import { verifyPassword } from "@/lib/utils";
import { signToken } from "@/lib/auth";

export const runtime = "edge";

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json() as { email: string; password: string };

    if (!email || !password) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios" }, { status: 400 });
    }

    const user = await dbFirst<UserRow>(
      "SELECT id, email, name, password_hash FROM users WHERE email = ?",
      [email.toLowerCase().trim()]
    );

    if (!user) {
      return NextResponse.json({ error: "E-mail ou senha incorretos" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "E-mail ou senha incorretos" }, { status: 401 });
    }

    const token = await signToken({ sub: user.id, email: user.email, name: user.name });
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
