import { NextResponse } from "next/server";
import { requireAppApi } from "@/lib/saas/access";
import { OPS_ACCESS_COOKIE } from "@/lib/ops-access";

export async function POST() {
  const auth = await requireAppApi();
  if ("error" in auth) return auth.error;

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: OPS_ACCESS_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/app/ops",
    maxAge: 0
  });

  return response;
}
