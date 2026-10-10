export const OPS_ACCESS_COOKIE = "ops_access";
export const OPS_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 12;

export const OPS_ACCESS_COOKIE_PATHS = {
  page: "/app/ops",
  api: "/api/app/ops"
} as const;

export type OpsAccessCookiePath = typeof OPS_ACCESS_COOKIE_PATHS[keyof typeof OPS_ACCESS_COOKIE_PATHS];

export function opsAccessCookieOptions(
  path: OpsAccessCookiePath,
  production = process.env.NODE_ENV === "production"
) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: production,
    path,
    maxAge: OPS_ACCESS_MAX_AGE_SECONDS
  };
}
