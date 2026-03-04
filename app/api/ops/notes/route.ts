import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOpsApi } from "@/lib/saas/access";
import { appendAuditLog, newId, readSaasData, touchTenantActivity, writeSaasData } from "@/lib/saas/store";

const schema = z.object({
  tenantId: z.string().min(1),
  text: z.string().min(2)
});

export async function GET(request: NextRequest) {
  const guard = await requireOpsApi();
  if (guard.error) return guard.error;

  const tenantId = new URL(request.url).searchParams.get("tenantId") || "";
  const data = readSaasData();
  const notes = data.tenantNotes.filter((item) => (tenantId ? item.tenantId === tenantId : true));
  return NextResponse.json({ notes });
}

export async function POST(request: NextRequest) {
  const guard = await requireOpsApi();
  if (guard.error) return guard.error;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = readSaasData();
  const note = {
    id: newId("note"),
    tenantId: parsed.data.tenantId,
    authorId: guard.ctx?.userId || "",
    text: parsed.data.text,
    createdAt: new Date().toISOString()
  };
  data.tenantNotes.unshift(note);
  writeSaasData(data);

  appendAuditLog({
    tenantId: note.tenantId,
    userId: note.authorId,
    action: "note_added",
    entity: "tenant_note",
    entityId: note.id
  });
  touchTenantActivity(note.tenantId);

  return NextResponse.json({ ok: true, note }, { status: 201 });
}

