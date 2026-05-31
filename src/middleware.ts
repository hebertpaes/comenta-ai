import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/api/me/:path*", "/api/sites/:path*", "/api/comments/:path*"],
};

export async function middleware(req: NextRequest) {
  // Skip auth for public widget API
  if (req.nextUrl.pathname.startsWith("/api/widget")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("auth_token")?.value;

  if (!token) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("auth_token");
    return res;
  }

  const headers = new Headers(req.headers);
  headers.set("x-user-id", payload.sub);
  headers.set("x-user-email", payload.email);
  headers.set("x-user-name", payload.name);

  return NextResponse.next({ request: { headers } });
}
