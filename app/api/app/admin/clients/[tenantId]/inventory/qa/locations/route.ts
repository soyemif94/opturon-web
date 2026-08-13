import { NextRequest } from "next/server";
import { proxyAdminTenantQaInventory } from "@/lib/admin-qa-inventory-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return proxyAdminTenantQaInventory(request, tenantId, "locationCreate");
}
