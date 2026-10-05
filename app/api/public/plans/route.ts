import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api";

export const revalidate = 300;

const allowedPlanKeys = new Set(["core", "growth", "distribution", "enterprise"]);

export async function GET() {
  const base = getApiBaseUrl();
  if (!base) return NextResponse.json({ error: "plan_catalog_unavailable" }, { status: 503 });

  try {
    const response = await fetch(`${base}/api/public/plans`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 }
    });
    if (!response.ok) throw new Error("plan_catalog_unavailable");
    const payload = await response.json();
    if (!Array.isArray(payload?.plans)) throw new Error("plan_catalog_invalid");
    const plans = payload.plans.filter((plan: unknown) => {
      if (!plan || typeof plan !== "object") return false;
      const value = plan as Record<string, unknown>;
      return typeof value.key === "string" && allowedPlanKeys.has(value.key);
    }).map((plan: Record<string, unknown>) => ({
      key: plan.key,
      displayName: plan.displayName,
      description: plan.description,
      pricingMode: plan.pricingMode,
      amount: plan.amount,
      currency: plan.currency,
      billingCadence: plan.billingCadence,
      highlights: plan.highlights,
      recommended: plan.recommended === true,
      ctaMode: plan.ctaMode
    }));
    if (plans.length !== allowedPlanKeys.size) throw new Error("plan_catalog_incomplete");
    return NextResponse.json({ plans }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } });
  } catch {
    return NextResponse.json({ error: "plan_catalog_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
