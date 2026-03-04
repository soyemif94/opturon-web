import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function maskEmail(email?: string) {
  const value = String(email || "").trim();
  if (!value) return "";
  const atIndex = value.indexOf("@");
  if (atIndex <= 0) return `${value.slice(0, 3)}...`;
  const name = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1);
  return `${name.slice(0, 3)}...@${domain || "..."}`;
}

function hostFromUrl(input?: string) {
  try {
    if (!input) return "";
    return new URL(input).host;
  } catch {
    return "";
  }
}

export async function GET(request: Request) {
  const isDev = process.env.NODE_ENV !== "production";
  const debugKey = String(process.env.BOT_DEBUG_KEY || "").trim();
  const incomingKey = String(request.headers.get("x-debug-key") || "").trim();

  if (!isDev) {
    if (!debugKey || incomingKey !== debugKey) {
      return NextResponse.json(
        {
          error: "forbidden"
        },
        {
          status: 403,
          headers: {
            "Cache-Control": "no-store"
          }
        }
      );
    }
  }

  const adminEmail = String(process.env.AUTH_ADMIN_EMAIL || "");
  const adminHash = String(process.env.AUTH_ADMIN_PASSWORD_HASH || "");
  const nextAuthUrl = String(process.env.NEXTAUTH_URL || "");
  const secret = String(process.env.NEXTAUTH_SECRET || "");

  return NextResponse.json(
    {
      buildTag: "auth-env-v1",
      hasAdminEmail: Boolean(adminEmail),
      hasAdminHash: Boolean(adminHash),
      adminEmail: maskEmail(adminEmail),
      adminHashPrefix: adminHash ? adminHash.slice(0, 4) : "",
      adminHashLen: adminHash.length,
      nextAuthUrlHost: hostFromUrl(nextAuthUrl),
      hasSecret: Boolean(secret),
      secretLen: secret.length
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
