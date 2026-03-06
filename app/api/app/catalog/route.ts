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

  try {
    const data = readSaasData();
    const catalogProducts = Array.isArray(data.catalogProducts) ? data.catalogProducts : [];
    return NextResponse.json({ products: catalogProducts.filter((item) => item?.tenantId === tenantId) });
  } catch (error) {
    console.error("[api/app/catalog][GET] Failed to load catalog.", error);
    return NextResponse.json({ error: "No se pudo cargar el catalogo." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireAppApi();
  if (guard.error) return guard.error;
  const tenantId = guard.ctx?.tenantId as string;

  try {
    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
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
    if (!Array.isArray(data.catalogProducts)) data.catalogProducts = [];
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
  } catch (error) {
    console.error("[api/app/catalog][POST] Failed to create product.", error);
    return NextResponse.json({ error: "No se pudo crear el producto." }, { status: 500 });
  }
}
