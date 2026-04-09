import { createHmac, timingSafeEqual } from "node:crypto";

export const OPS_ACCESS_COOKIE = "ops_access";
export const OPS_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 12;
type CookieReader = { get(name: string): { value?: string } | undefined };

function getOpsPassword() {
  return String(process.env.OPS_PASSWORD || process.env.PORTAL_INTERNAL_KEY || "").trim();
}

function getOpsSecret() {
  return String(process.env.OPS_ACCESS_SECRET || process.env.NEXTAUTH_SECRET || process.env.PORTAL_INTERNAL_KEY || "").trim();
}

function signPayload(payload: string) {
  const secret = getOpsSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function isOpsAccessConfigured() {
  return Boolean(getOpsPassword() && getOpsSecret());
}

export function validateOpsPassword(password: string) {
  const expected = getOpsPassword();
  return Boolean(expected) && password.trim() === expected;
}

export function createOpsAccessToken(now = Date.now()) {
  if (!isOpsAccessConfigured()) return null;
  const expiresAt = now + OPS_ACCESS_MAX_AGE_SECONDS * 1000;
  const payload = String(expiresAt);
  const signature = signPayload(payload);
  if (!signature) return null;
  return `${payload}.${signature}`;
}

export function verifyOpsAccessToken(token?: string | null, now = Date.now()) {
  if (!token || !isOpsAccessConfigured()) return false;
  const [payload, providedSignature] = String(token).split(".");
  if (!payload || !providedSignature) return false;

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;

  const expectedSignature = signPayload(payload);
  if (!expectedSignature) return false;

  const providedBuffer = Buffer.from(providedSignature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (providedBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function hasOpsAccessCookie(cookieStore: CookieReader) {
  return verifyOpsAccessToken(cookieStore.get(OPS_ACCESS_COOKIE)?.value || null);
}
