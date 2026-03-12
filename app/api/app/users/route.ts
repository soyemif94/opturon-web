import { hashSync } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createPortalUser,
  deletePortalUser,
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalUsers,
  isBackendConfigured,
  isPortalInternalAuthConfigured,
  patchPortalUserRole
} from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";
import { appendAuditLog, listTenantMembers, newId, readSaasData, writeSaasData } from "@/lib/saas/store";
import { hasExplicitRuntimeDataDir, resolveRuntimeDataDir } from "@/lib/runtime-data";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(["owner", "manager", "seller", "viewer"]),
  password: z.string().min(6).optional()
});

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["owner", "manager", "seller", "viewer"])
});

function mapBackendUserError(error: unknown) {
  const status = getBackendErrorStatus(error) || 502;
  const body = getBackendErrorBody(error) as Record<string, unknown> | undefined;
  const upstreamError = String(body?.error || "portal_user_request_failed");
  const errorMap: Record<string, string> = {
    invalid_name: "Ingresa un nombre valido.",
    invalid_email: "Ingresa un email valido.",
    invalid_role: "Selecciona un rol valido.",
    invalid_password: "La password temporal debe tener al menos 6 caracteres.",
    duplicate_user_email: "Ya existe un usuario con ese email.",
    cannot_delete_last_owner: "Debe quedar al menos un owner en el workspace.",
    cannot_delete_current_user: "No puedes eliminar tu propio usuario activo.",
    portal_internal_key_missing: "Falta configurar PORTAL_INTERNAL_KEY en el portal web."
  };

  return {
    status,
    message: errorMap[upstreamError] || upstreamError
  };
}

function requirePortalUsersBackend() {
  if (!isBackendConfigured()) return null;
  if (!isPortalInternalAuthConfigured()) {
    return NextResponse.json({ error: "portal_internal_key_missing" }, { status: 503 });
  }
  return null;
}

export async function GET() {
  const guard = await requireAppApi({ permission: "manage_users" });
  if (guard.error) return guard.error;

  const tenantId = guard.ctx?.tenantId as string;
  if (isBackendConfigured()) {
    const backendRequirement = requirePortalUsersBackend();
    if (backendRequirement) return backendRequirement;
    try {
      const response = await getPortalUsers(tenantId);
      return NextResponse.json({
        users: (response.data.users || []).map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          tenantRole: user.role
        }))
      });
    } catch (error) {
      const status = getBackendErrorStatus(error) || 502;
      const body = getBackendErrorBody(error) as Record<string, unknown> | undefined;
      return NextResponse.json({ error: String(body?.error || "portal_users_unavailable") }, { status });
    }
  }

  return NextResponse.json({ users: listTenantMembers(tenantId).map((user) => ({ ...user, tenantRole: user.tenantRole })) });
}

export async function POST(request: NextRequest) {
  const guard = await requireAppApi({ permission: "manage_users" });
  if (guard.error) return guard.error;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const tenantId = guard.ctx?.tenantId as string;
  const email = parsed.data.email.toLowerCase();

  if (isBackendConfigured()) {
    const backendRequirement = requirePortalUsersBackend();
    if (backendRequirement) return backendRequirement;
    try {
      const response = await createPortalUser(tenantId, {
        email,
        name: parsed.data.name,
        role: parsed.data.role,
        password: parsed.data.password || "demo1234"
      });

      try {
        appendAuditLog({
          tenantId,
          userId: guard.ctx?.userId,
          action: "tenant_user_invited",
          entity: "membership",
          entityId: response.data.user.id,
          metadata: { role: parsed.data.role, email }
        });
      } catch (error) {
        console.warn("[users-route] Audit log append failed after backend user persistence.", error);
      }

      return NextResponse.json({ ok: true, userId: response.data.user.id }, { status: 201 });
    } catch (error) {
      const mapped = mapBackendUserError(error);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
  }

  const isServerlessRuntime = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
  const hasDurableRuntimeStorage = hasExplicitRuntimeDataDir();
  if (isServerlessRuntime && !hasDurableRuntimeStorage) {
    return NextResponse.json(
      {
        error: "User creation is temporarily unavailable in production",
        detail: "Tenant users need durable runtime storage. Configure OPTURON_RUNTIME_DATA_DIR or OPTURON_DATA_DIR to a persistent path."
      },
      { status: 503 }
    );
  }

  const data = readSaasData();
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

  try {
    writeSaasData(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "User was not persisted",
        detail: error instanceof Error ? error.message : String(error),
        storagePath: resolveRuntimeDataDir()
      },
      { status: 500 }
    );
  }

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

export async function PATCH(request: NextRequest) {
  const guard = await requireAppApi({ permission: "manage_users" });
  if (guard.error) return guard.error;

  const parsed = updateRoleSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const tenantId = guard.ctx?.tenantId as string;
  if (isBackendConfigured()) {
    const backendRequirement = requirePortalUsersBackend();
    if (backendRequirement) return backendRequirement;
    try {
      const response = await patchPortalUserRole(tenantId, parsed.data.userId, parsed.data.role);
      appendAuditLog({
        tenantId,
        userId: guard.ctx?.userId,
        action: "tenant_user_role_updated",
        entity: "membership",
        entityId: parsed.data.userId,
        metadata: { role: parsed.data.role }
      });
      return NextResponse.json({ ok: true, user: response.data.user });
    } catch (error) {
      const mapped = mapBackendUserError(error);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
  }

  const data = readSaasData();
  const membership = data.memberships.find((item) => item.userId === parsed.data.userId && item.tenantId === tenantId);
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });
  membership.role = parsed.data.role;
  writeSaasData(data);
  appendAuditLog({
    tenantId,
    userId: guard.ctx?.userId,
    action: "tenant_user_role_updated",
    entity: "membership",
    entityId: parsed.data.userId,
    metadata: { role: parsed.data.role }
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const guard = await requireAppApi({ permission: "manage_users" });
  if (guard.error) return guard.error;

  const userId = new URL(request.url).searchParams.get("id") || "";
  if (!userId) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  const tenantId = guard.ctx?.tenantId as string;
  const currentUserId = guard.ctx?.userId as string;

  if (isBackendConfigured()) {
    const backendRequirement = requirePortalUsersBackend();
    if (backendRequirement) return backendRequirement;
    try {
      const response = await deletePortalUser(tenantId, userId, currentUserId);
      appendAuditLog({
        tenantId,
        userId: currentUserId,
        action: "tenant_user_deleted",
        entity: "membership",
        entityId: userId
      });
      return NextResponse.json({ ok: true, userId: response.data.userId });
    } catch (error) {
      const mapped = mapBackendUserError(error);
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
  }

  const data = readSaasData();
  if (userId === currentUserId) {
    return NextResponse.json({ error: "No puedes eliminar tu propio usuario activo." }, { status: 400 });
  }

  const ownerCount = data.memberships.filter((item) => item.tenantId === tenantId && (item.role === "owner")).length;
  const membership = data.memberships.find((item) => item.userId === userId && item.tenantId === tenantId);
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (membership.role === "owner" && ownerCount <= 1) {
    return NextResponse.json({ error: "Debe quedar al menos un owner en el workspace." }, { status: 400 });
  }

  data.memberships = data.memberships.filter((item) => !(item.userId === userId && item.tenantId === tenantId));
  data.users = data.users.filter((item) => item.id !== userId);
  writeSaasData(data);
  appendAuditLog({
    tenantId,
    userId: currentUserId,
    action: "tenant_user_deleted",
    entity: "membership",
    entityId: userId
  });
  return NextResponse.json({ ok: true, userId });
}
