import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.delete("auth_token");
  return res;
}
