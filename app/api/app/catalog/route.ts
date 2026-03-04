import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAppApi } from "@/lib/saas/access";
import { appendAuditLog, newId, readSaasData, touchTenantActivity, writeSaasData } from "@/lib/saas/store";

const createSchema = z.object({
  name: z.string().min(2),
  category: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().min(0),
  promoPrice: z.number().min(0).optional(),
  stockQty: z.number().int().min(0),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  active: z.boolean().default(true)
});

export async function GET() {
  const guard = await requireAppApi();
  if (guard.error) return guard.error;
  const tenantId = guard.ctx?.tenantId as string;

  const data = readSaasData();
  return NextResponse.json({ products: data.catalogProducts.filter((item) => item.tenantId === tenantId) });
}

export async function POST(request: NextRequest) {
  const guard = await requireAppApi();
  if (guard.error) return guard.error;
  const tenantId = guard.ctx?.tenantId as string;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const now = new Date().toISOString();
  const product = {
    id: newId("prod"),
    tenantId,
    ...parsed.data,
    createdAt: now,
    updatedAt: now
  };

  const data = readSaasData();
  data.catalogProducts.unshift(product);
  writeSaasData(data);

  appendAuditLog({
    tenantId,
    userId: guard.ctx?.userId,
    action: "product_created",
    entity: "catalog_product",
    entityId: product.id
  });
  touchTenantActivity(tenantId);

  return NextResponse.json({ ok: true, product }, { status: 201 });
}

