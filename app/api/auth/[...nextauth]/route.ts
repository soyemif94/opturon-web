import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { checkLoginRateLimit } from "@/lib/login-rate-limit";

const handler = NextAuth(authOptions);

function getClientIp(request: Request) {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

async function getRequestEmail(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.clone().formData();
      return String(formData.get("email") || "").trim().toLowerCase();
    }
    if (contentType.includes("application/json")) {
      const body = await request.clone().json();
      return String(body?.email || "").trim().toLowerCase();
    }
  } catch {
    return "";
  }
  return "";
}

export { handler as GET };

export async function POST(request: Request) {
  const pathname = new URL(request.url).pathname;
  const isCredentialsCallback = pathname.endsWith("/callback/credentials");

  if (isCredentialsCallback) {
    const ip = getClientIp(request);
    const email = await getRequestEmail(request);
    const rateKey = `${ip}:${email || "unknown"}`;
    const rate = checkLoginRateLimit(rateKey);

    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "Too many login attempts. Try again later."
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rate.retryAfterSec)
          }
        }
      );
    }
  }

  return (handler as any)(request);
}