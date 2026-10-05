const fixedPlanKeys = new Set(["core", "growth", "distribution"]);

export function normalizeSafeInternalCallback(value: string | null | undefined, fallback: string, origin: string) {
  const candidate = String(value || "").trim();
  if (!candidate || candidate.length > 2048 || candidate.startsWith("//") || candidate.includes("\\")) return fallback;
  try {
    const parsed = new URL(candidate, origin);
    if (parsed.origin !== new URL(origin).origin || !parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function safeCheckoutCallback(value: string | null | undefined, origin: string) {
  const candidate = normalizeSafeInternalCallback(value, "/app", origin);
  try {
    const parsed = new URL(candidate, origin);
    const keys = [...parsed.searchParams.keys()];
    const planKey = parsed.searchParams.get("planKey");
    if (parsed.pathname !== "/checkout/start" || parsed.hash || keys.length !== 1
      || keys[0] !== "planKey" || !planKey || !fixedPlanKeys.has(planKey)) return "/app";
    return `/checkout/start?planKey=${encodeURIComponent(planKey)}`;
  } catch {
    return "/app";
  }
}
