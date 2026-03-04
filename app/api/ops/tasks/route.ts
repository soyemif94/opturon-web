import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOpsApi } from "@/lib/saas/access";
import { appendAuditLog, newId, readSaasData, touchTenantActivity, writeSaasData } from "@/lib/saas/store";

const createSchema = z.object({
  tenantId: z.string().min(1),
  title: z.string().min(2),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional()
});

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["todo", "in_progress", "done"])
});

export async function GET(request: NextRequest) {
  const guard = await requireOpsApi();
  if (guard.error) return guard.error;

  const tenantId = new URL(request.url).searchParams.get("tenantId") || "";
  const data = readSaasData();
  const tasks = data.tenantTasks.filter((item) => (tenantId ? item.tenantId === tenantId : true));
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const guard = await requireOpsApi();
  if (guard.error) return guard.error;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const task = {
    id: newId("task"),
    tenantId: parsed.data.tenantId,
    title: parsed.data.title,
    description: parsed.data.description,
    assignedTo: parsed.data.assignedTo,
    dueDate: parsed.data.dueDate,
    status: "todo" as const,
    createdAt: new Date().toISOString()
  };

  const data = readSaasData();
  data.tenantTasks.unshift(task);
  writeSaasData(data);

  appendAuditLog({
    tenantId: task.tenantId,
    userId: guard.ctx?.userId,
    action: "task_created",
    entity: "tenant_task",
    entityId: task.id
  });
  touchTenantActivity(task.tenantId);

  return NextResponse.json({ ok: true, task }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const guard = await requireOpsApi();
  if (guard.error) return guard.error;

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = readSaasData();
  const task = data.tenantTasks.find((item) => item.id === parsed.data.id);
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  task.status = parsed.data.status;
  writeSaasData(data);

  appendAuditLog({
    tenantId: task.tenantId,
    userId: guard.ctx?.userId,
    action: "task_status_changed",
    entity: "tenant_task",
    entityId: task.id,
    metadata: { status: task.status }
  });

  return NextResponse.json({ ok: true, task });
}

