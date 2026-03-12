import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/password-reset";

const schema = z.object({
  email: z.string().email()
});

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    await requestPasswordReset(parsed.data.email);
    return NextResponse.json({
      ok: true,
      message: "Si el email existe, te enviamos un enlace para restablecer tu contraseña."
    });
  } catch (error) {
    console.error("FORGOT_PASSWORD_ERROR", error);
    return NextResponse.json({ error: "forgot_password_failed" }, { status: 500 });
  }
}
