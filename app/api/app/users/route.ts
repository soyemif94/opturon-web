import { hashSync } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAppApi } from "@/lib/saas/access";
import { appendAuditLog, listTenantMembers, newId, readSaasData, writeSaasData } from "@/lib/saas/store";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(["owner", "manager", "editor", "viewer"]),
  password: z.string().min(6).optional()
});

export async function GET() {
  const guard = await requireAppApi();
  if (guard.error) return guard.error;

  const tenantId = guard.ctx?.tenantId as string;
  return NextResponse.json({ users: listTenantMembers(tenantId) });
}

export async function POST(request: NextRequest) {
  const guard = await requireAppApi();
  if (guard.error) return guard.error;
  const tenantRole = guard.ctx?.tenantRole;
  if (tenantRole !== "owner" && tenantRole !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const tenantId = guard.ctx?.tenantId as string;
  const data = readSaasData();
  const email = parsed.data.email.toLowerCase();

  let user = data.users.find((item) => item.email.toLowerCase() === email);
  if (!user) {
    user = {
      id: newId("usr"),
      email,
      name: parsed.data.name,
      globalRole: "client",
      passwordHash: hashSync(parsed.data.password || "demo1234", 10),
      createdAt: new Date().toISOString()
    };
    data.users.push(user);
  }

  const hasMembership = data.memberships.some((m) => m.userId === user!.id && m.tenantId === tenantId);
  if (!hasMembership) {
    data.memberships.push({
      id: newId("mbr"),
      userId: user.id,
      tenantId,
      role: parsed.data.role,
      createdAt: new Date().toISOString()
    });
  }

  writeSaasData(data);

  appendAuditLog({
    tenantId,
    userId: guard.ctx?.userId,
    action: "tenant_user_invited",
    entity: "membership",
    entityId: user.id,
    metadata: { role: parsed.data.role, email }
  });

  return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
}

