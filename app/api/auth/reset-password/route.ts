import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isPasswordResetTokenValid, resetPasswordWithToken } from "@/lib/password-reset";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(8)
});

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = String(url.searchParams.get("token") || "");
  return NextResponse.json({ ok: true, valid: isPasswordResetTokenValid(token) });
}

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    resetPasswordWithToken(parsed.data.token, parsed.data.password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "reset_password_failed";
    const status = message === "invalid_or_expired_reset_token" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
