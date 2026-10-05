import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function resolvePortalBillingSession() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const tenantRole = String(user?.tenantRole || "").trim().toLowerCase();
  const accountScope = String(user?.accountScope || "").trim().toLowerCase();
  const tenantId = String(user?.tenantId || "").trim();
  const actorUserId = String(user?.portalActorId || user?.id || "").trim();
  if (!user || !tenantId || !actorUserId || accountScope !== "client" || !["owner", "manager"].includes(tenantRole)) return null;
  return { tenantId, actorUserId, tenantRole, accountScope };
}

export function isSameOriginJsonRequest(request: Request) {
  const origin = String(request.headers.get("origin") || "").trim();
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!origin || !contentType.startsWith("application/json")) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function trustedClientIpHint(request: Request) {
  const value = String(request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "").trim();
  return value.length <= 96 && /^[0-9a-fA-F:.]+$/.test(value) ? value : "";
}
