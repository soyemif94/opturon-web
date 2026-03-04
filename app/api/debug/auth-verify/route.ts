import { compareSync } from "bcryptjs";
import { NextResponse } from "next/server";
import { getAuthUserByEmail } from "@/lib/auth-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function maskEmail(email?: string) {
  const value = String(email || "").trim();
  const atIndex = value.indexOf("@");
  if (!value) return "";
  if (atIndex <= 0) return `${value.slice(0, 3)}...`;
  return `${value.slice(0, 3)}...${value.slice(atIndex)}`;
}

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export async function GET(request: Request) {
  const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";
  if (isProd) {
    const debugKey = String(process.env.BOT_DEBUG_KEY || "").trim();
    const incomingKey = String(request.headers.get("x-debug-key") || "").trim();
    if (!debugKey || incomingKey !== debugKey) {
      return noStore(
        NextResponse.json(
          {
            error: "forbidden"
          },
          { status: 403 }
        )
      );
    }
  }

  const { searchParams } = new URL(request.url);
  const email = String(searchParams.get("email") || "").trim();
  const password = String(searchParams.get("password") || "");

  try {
    const user = await getAuthUserByEmail(email);
    if (!user) {
      return noStore(NextResponse.json({ found: false }));
    }

    let passwordValid = false;
    try {
      passwordValid = compareSync(password, user.passwordHash);
    } catch (error) {
      console.error("AUTH_VERIFY_BCRYPT_ERROR", {
        msg: String(error),
        hashPrefix: String(user.passwordHash || "").slice(0, 4),
        hashLen: String(user.passwordHash || "").length
      });
      passwordValid = false;
    }

    return noStore(
      NextResponse.json({
        found: true,
        emailMasked: maskEmail(user.email),
        hashPrefix: String(user.passwordHash || "").slice(0, 4),
        hashLen: String(user.passwordHash || "").length,
        passwordProvided: Boolean(password),
        passwordValid,
        globalRole: user.globalRole || null
      })
    );
  } catch (error) {
    console.error("AUTH_VERIFY_ERROR", { msg: String(error) });
    return noStore(
      NextResponse.json(
        {
          error: "verify_failed"
        },
        { status: 500 }
      )
    );
  }
}
