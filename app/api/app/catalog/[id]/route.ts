import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAppApi } from "@/lib/saas/access";
import { appendAuditLog, readSaasData, touchTenantActivity, writeSaasData } from "@/lib/saas/store";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().min(0).optional(),
  promoPrice: z.number().min(0).nullable().optional(),
  stockQty: z.number().int().min(0).optional(),
  description: z.string().optional(),
  active: z.boolean().optional()
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAppApi();
  if (guard.error) return guard.error;
  const tenantId = guard.ctx?.tenantId as string;
  const { id } = await params;

  const data = readSaasData();
  const product = data.catalogProducts.find((item) => item.id === id && item.tenantId === tenantId);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAppApi();
  if (guard.error) return guard.error;
  const tenantId = guard.ctx?.tenantId as string;
  const { id } = await params;

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = readSaasData();
  const product = data.catalogProducts.find((item) => item.id === id && item.tenantId === tenantId);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  Object.assign(product, parsed.data);
  product.updatedAt = new Date().toISOString();
  writeSaasData(data);

  appendAuditLog({
    tenantId,
    userId: guard.ctx?.userId,
    action: "product_updated",
    entity: "catalog_product",
    entityId: id
  });
  touchTenantActivity(tenantId);

  return NextResponse.json({ ok: true, product });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAppApi();
  if (guard.error) return guard.error;
  const tenantId = guard.ctx?.tenantId as string;
  const { id } = await params;

  const data = readSaasData();
  const before = data.catalogProducts.length;
  data.catalogProducts = data.catalogProducts.filter((item) => !(item.id === id && item.tenantId === tenantId));
  if (before === data.catalogProducts.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  writeSaasData(data);

  appendAuditLog({
    tenantId,
    userId: guard.ctx?.userId,
    action: "product_deleted",
    entity: "catalog_product",
    entityId: id
  });

  return NextResponse.json({ ok: true });
}

