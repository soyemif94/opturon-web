import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAppApi } from "@/lib/saas/access";
import { appendAuditLog, newId, readSaasData, touchTenantActivity, writeSaasData } from "@/lib/saas/store";

const createSchema = z.object({
  question: z.string().min(3),
  answer: z.string().min(3),
  active: z.boolean().default(true)
});

const updateSchema = createSchema.extend({ id: z.string().min(1) }).partial({ question: true, answer: true, active: true });

function faqsBackendUnavailable() {
  return NextResponse.json(
    {
      error: "faqs_backend_unavailable_for_real_tenant",
      detail: "Las FAQs del workspace real todavia no estan conectadas a persistencia tenant-scoped."
    },
    { status: 503 }
  );
}

export async function GET() {
  const guard = await requireAppApi({ permission: "manage_workspace" });
  if (guard.error) return guard.error;
  const tenantId = guard.ctx?.tenantId as string;

  if (tenantId) {
    return NextResponse.json({ faqs: [], source: "empty_real_tenant" });
  }

  const data = readSaasData();
  return NextResponse.json({ faqs: data.faqs.filter((item) => item.tenantId === tenantId) });
}

export async function POST(request: NextRequest) {
  const guard = await requireAppApi({ permission: "manage_workspace" });
  if (guard.error) return guard.error;
  const tenantId = guard.ctx?.tenantId as string;

  if (tenantId) {
    return faqsBackendUnavailable();
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const faq = { id: newId("faq"), tenantId, ...parsed.data };
  const data = readSaasData();
  data.faqs.unshift(faq);
  writeSaasData(data);

  appendAuditLog({ tenantId, userId: guard.ctx?.userId, action: "faq_created", entity: "faq", entityId: faq.id });
  touchTenantActivity(tenantId);

  return NextResponse.json({ ok: true, faq }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAppApi({ permission: "manage_workspace" });
  if (guard.error) return guard.error;
  const tenantId = guard.ctx?.tenantId as string;

  if (tenantId) {
    return faqsBackendUnavailable();
  }

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id, ...rest } = parsed.data;

  const data = readSaasData();
  const faq = data.faqs.find((item) => item.id === id && item.tenantId === tenantId);
  if (!faq) return NextResponse.json({ error: "Not found" }, { status: 404 });

  Object.assign(faq, rest);
  writeSaasData(data);

  appendAuditLog({ tenantId, userId: guard.ctx?.userId, action: "faq_updated", entity: "faq", entityId: id });
  return NextResponse.json({ ok: true, faq });
}

export async function DELETE(request: NextRequest) {
  const guard = await requireAppApi({ permission: "manage_workspace" });
  if (guard.error) return guard.error;
  const tenantId = guard.ctx?.tenantId as string;

  if (tenantId) {
    return faqsBackendUnavailable();
  }

  const id = new URL(request.url).searchParams.get("id") || "";

  const data = readSaasData();
  const before = data.faqs.length;
  data.faqs = data.faqs.filter((item) => !(item.id === id && item.tenantId === tenantId));
  if (before === data.faqs.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  writeSaasData(data);

  appendAuditLog({ tenantId, userId: guard.ctx?.userId, action: "faq_deleted", entity: "faq", entityId: id });
  return NextResponse.json({ ok: true });
}

