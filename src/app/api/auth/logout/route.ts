import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST() {
  const res = NextResponse.redirect(new URL("/login", "http://localhost"));
  res.cookies.delete("auth_token");
  return res;
}
