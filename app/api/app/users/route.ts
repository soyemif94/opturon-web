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
  patchPortalPrimaryUser,
  patchPortalUserRole
} from "@/lib/api";
import { canManageUsers, isStaffRole, normalizeTenantRole } from "@/lib/app-permissions";
import { requireAppApi } from "@/lib/saas/access";
import { appendAuditLog, listTenantMembers, newId, readSaasData, writeSaasData } from "@/lib/saas/store";
import { hasExplicitRuntimeDataDir, resolveRuntimeDataDir } from "@/lib/runtime-data";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(["owner", "manager", "seller", "viewer"]),
  password: z.string().min(6).optional(),
  tenantId: z.string().min(1).optional()
});

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["owner", "manager", "seller", "viewer"]),
  tenantId: z.string().min(1).optional()
});

const CLIENT_SUBACCOUNT_ROLES = ["seller", "viewer"] as const;
const DEFAULT_SUBACCOUNT_LIMIT = (() => {
  const parsed = Number.parseInt(String(process.env.DEFAULT_TENANT_SUBACCOUNT_LIMIT || "5"), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 5;
})();

type RouteUserRow = {
  id: string;
  email: string;
  name: string;
  tenantRole: string;
  accountKind: "primary" | "subaccount";
};

type RouteUsersMeta = {
  allowedRoles: string[];
  subaccountCount: number;
  primaryAccountCount: number;
  primaryPortalUserId?: string | null;
  subaccountLimit: number | null;
  remainingSubaccounts: number | null;
  futureLimitKey: "tenant_portal_users";
  limitScope: "subaccounts" | "opturon_admin";
  limitSource: string;
  limitApplies?: boolean;
  accountScope?: string;
  unlimitedSubaccounts?: boolean;
};

function resolveBackendBaseUrl() {
  return (
    String(process.env.BACKEND_BASE_URL || "").trim() ||
    String(process.env.API_BASE_URL || "").trim() ||
    String(process.env.NEXT_PUBLIC_API_BASE_URL || "").trim() ||
    (process.env.NODE_ENV === "production" ? "https://opturon-api.onrender.com" : "")
  );
}

function requirePortalUsersBackend(tenantId?: string) {
  if (!isBackendConfigured()) return null;
  if (!isPortalInternalAuthConfigured()) {
    console.error("[users-route] Missing portal internal key for backend users proxy.", {
      tenantId,
      backendBaseUrl: resolveBackendBaseUrl(),
      hasBackendBaseUrl: Boolean(resolveBackendBaseUrl()),
      hasPortalInternalKey: false
    });
    return NextResponse.json(
      {
        error: "portal_internal_key_missing",
        detail: "PORTAL_INTERNAL_KEY is not configured in opturon-web.",
        debug: {
          tenantId: tenantId || null,
          backendBaseUrl: resolveBackendBaseUrl() || null,
          hasBackendBaseUrl: Boolean(resolveBackendBaseUrl()),
          hasPortalInternalKey: false
        }
      },
      { status: 503 }
    );
  }
  return null;
}

function proxyUsersBackendError(action: string, tenantId: string, error: unknown, metadata?: Record<string, unknown>) {
  const status = getBackendErrorStatus(error) || 502;
  const body = getBackendErrorBody(error);
  const detail = error instanceof Error ? error.message : String(error);
  const debug = {
    action,
    tenantId,
    backendBaseUrl: resolveBackendBaseUrl() || null,
    hasBackendBaseUrl: Boolean(resolveBackendBaseUrl()),
    hasPortalInternalKey: isPortalInternalAuthConfigured(),
    ...metadata
  };

  console.error("[users-route] Backend users proxy failed.", {
    status,
    detail,
    body,
    ...debug
  });

  if (body && typeof body === "object") {
    return NextResponse.json(body, { status });
  }

  return NextResponse.json(
    {
      error: "portal_user_request_failed",
      detail,
      debug
    },
    { status }
  );
}

function safeAppendUsersAuditLog(entry: Parameters<typeof appendAuditLog>[0]) {
  try {
    appendAuditLog(entry);
  } catch (error) {
    console.warn("[users-route] Audit log append failed.", {
      action: entry.action,
      entityId: entry.entityId,
      tenantId: entry.tenantId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

function resolvePortalUserPassword(password?: string) {
  const explicitPassword = password?.trim();
  if (explicitPassword) return explicitPassword;

  const envPassword = String(process.env.PORTAL_USER_DEFAULT_PASSWORD || "").trim();
  if (envPassword) return envPassword;

  return null;
}

function normalizeRouteUser(user: { id: string; email: string; name: string; role?: string; tenantRole?: string }): RouteUserRow {
  const tenantRole = String(user.role || user.tenantRole || "viewer");
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    tenantRole,
    accountKind: tenantRole === "owner" ? "primary" : "subaccount"
  };
}

function normalizeRouteUserWithKind(user: { id: string; email: string; name: string; role?: string; tenantRole?: string; accountKind?: string }): RouteUserRow {
  const base = normalizeRouteUser(user);
  const accountKind = String(user.accountKind || "").trim().toLowerCase() === "primary" ? "primary" : base.accountKind;
  return {
    ...base,
    accountKind
  };
}

function getUserManagementPolicy(ctx: { globalRole?: string; tenantRole?: string; tenantId?: string | null }) {
  const tenantRole = normalizeTenantRole(ctx.tenantRole);
  const staff = Boolean(isStaffRole(ctx.globalRole as any) && canManageUsers(ctx as any));
  const tenantOwner = tenantRole === "owner";
  const canManage = Boolean(staff || tenantOwner);
  const allowedRoles = staff ? ["owner", "manager", "seller", "viewer"] : [...CLIENT_SUBACCOUNT_ROLES];

  return {
    canManage,
    isStaff: staff,
    isTenantOwner: tenantOwner,
    tenantRole,
    allowedRoles
  };
}

function resolveTargetTenantId(ctx: { globalRole?: string; tenantId?: string | null }, requestedTenantId?: string | null) {
  const ownTenantId = String(ctx.tenantId || "").trim();
  if (ownTenantId) return ownTenantId;
  if (isStaffRole(ctx.globalRole as any)) return String(requestedTenantId || "").trim();
  return "";
}

function canManageTargetRole(policy: ReturnType<typeof getUserManagementPolicy>, targetRole?: string) {
  const normalized = String(targetRole || "").trim().toLowerCase();
  if (policy.isStaff) return true;
  return CLIENT_SUBACCOUNT_ROLES.includes(normalized as (typeof CLIENT_SUBACCOUNT_ROLES)[number]);
}

function canManageTargetUser(policy: ReturnType<typeof getUserManagementPolicy>, targetUser?: RouteUserRow | null) {
  if (!targetUser) return false;
  if (policy.isStaff) return true;
  if (targetUser.accountKind === "primary") return false;
  return canManageTargetRole(policy, targetUser.tenantRole);
}

async function listRouteUsers(tenantId: string): Promise<RouteUserRow[]> {
  if (isBackendConfigured()) {
    const response = await getPortalUsers(tenantId);
    return (response.data.users || []).map((user) => normalizeRouteUserWithKind(user));
  }

  return listTenantMembers(tenantId).map((user) =>
    normalizeRouteUserWithKind({
      id: user.id,
      email: user.email,
      name: user.name,
      tenantRole: user.tenantRole
    })
  );
}

function buildRouteUsersMeta(
  users: RouteUserRow[],
  allowedRoles: string[],
  sourceMeta?: {
    subaccountCount?: number;
    primaryAccountCount?: number;
    primaryPortalUserId?: string | null;
    subaccountLimit?: number | null;
    remainingSubaccounts?: number | null;
    limitSource?: string | null;
    limitScope?: "subaccounts" | "opturon_admin";
    limitApplies?: boolean;
    accountScope?: string;
    unlimitedSubaccounts?: boolean;
  } | null
): RouteUsersMeta {
  const subaccountCount = sourceMeta?.subaccountCount ?? users.filter((user) => user.accountKind === "subaccount").length;
  const primaryAccountCount = sourceMeta?.primaryAccountCount ?? users.filter((user) => user.accountKind === "primary").length;
  const unlimitedSubaccounts = Boolean(sourceMeta?.unlimitedSubaccounts || sourceMeta?.limitScope === "opturon_admin");
  const subaccountLimit = unlimitedSubaccounts
    ? null
    : Number(sourceMeta?.subaccountLimit) > 0
      ? Number(sourceMeta?.subaccountLimit)
      : DEFAULT_SUBACCOUNT_LIMIT;
  const remainingSubaccounts =
    unlimitedSubaccounts ? null : sourceMeta?.remainingSubaccounts ?? Math.max(0, Number(subaccountLimit) - subaccountCount);

  return {
    allowedRoles,
    subaccountCount,
    primaryAccountCount,
    primaryPortalUserId: sourceMeta?.primaryPortalUserId || null,
    subaccountLimit,
    remainingSubaccounts,
    futureLimitKey: "tenant_portal_users",
    limitScope: unlimitedSubaccounts ? "opturon_admin" : "subaccounts",
    limitSource: sourceMeta?.limitSource || "default_env",
    limitApplies: !unlimitedSubaccounts,
    accountScope: sourceMeta?.accountScope || (unlimitedSubaccounts ? "opturon_admin" : "client"),
    unlimitedSubaccounts
  };
}

export async function GET(request: NextRequest) {
  const guard = await requireAppApi({ permission: "manage_users" });
  if (guard.error) return guard.error;
  const policy = getUserManagementPolicy(guard.ctx || {});
  if (!policy.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const requestedTenantId = new URL(request.url).searchParams.get("tenantId");
  const tenantId = resolveTargetTenantId(guard.ctx || {}, requestedTenantId);
  if (!tenantId) return NextResponse.json({ error: "missing_target_tenant_id" }, { status: 400 });
  if (tenantId && !isBackendConfigured()) {
    return NextResponse.json(
      {
        users: [],
        source: "empty_real_tenant",
        activity: [],
        meta: buildRouteUsersMeta([], policy.allowedRoles)
      },
      { status: 200 }
    );
  }

  if (isBackendConfigured()) {
    const backendRequirement = requirePortalUsersBackend(tenantId);
    if (backendRequirement) return backendRequirement;
    try {
      const response = await getPortalUsers(tenantId);
      const users = (response.data.users || []).map((user) => normalizeRouteUserWithKind(user));
      return NextResponse.json({
        users,
        activity: response.data.activity || [],
        meta: buildRouteUsersMeta(users, policy.allowedRoles, response.data.meta || null)
      });
    } catch (error) {
      return proxyUsersBackendError("list_users", tenantId, error);
    }
  }

  const users = listTenantMembers(tenantId).map((user) =>
    normalizeRouteUserWithKind({
      id: user.id,
      email: user.email,
      name: user.name,
      tenantRole: user.tenantRole
    })
  );
  return NextResponse.json({
    users,
    activity: [],
    meta: buildRouteUsersMeta(users, policy.allowedRoles)
  });
}

export async function POST(request: NextRequest) {
  const guard = await requireAppApi({ permission: "manage_users" });
  if (guard.error) return guard.error;
  const policy = getUserManagementPolicy(guard.ctx || {});
  if (!policy.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (!policy.allowedRoles.includes(parsed.data.role)) {
    return NextResponse.json(
      {
        error: "role_not_allowed_for_actor",
        detail: "Solo la cuenta principal puede crear subcuentas operativas de vendedor o visualizador."
      },
      { status: 403 }
    );
  }

  const tenantId = resolveTargetTenantId(guard.ctx || {}, parsed.data.tenantId);
  if (!tenantId) return NextResponse.json({ error: "missing_target_tenant_id" }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const countsAsSubaccount = parsed.data.role !== "owner";
  const resolvedPassword = resolvePortalUserPassword(parsed.data.password);

  if (!resolvedPassword) {
    return NextResponse.json(
      {
        error: "tenant_user_password_required",
        detail: "Debes enviar password o configurar PORTAL_USER_DEFAULT_PASSWORD."
      },
      { status: 400 }
    );
  }

  if (tenantId && !isBackendConfigured()) {
    return NextResponse.json(
      {
        error: "portal_users_backend_unavailable",
        detail: "La gestion de usuarios para workspaces reales requiere backend persistente tenant-scoped."
      },
      { status: 503 }
    );
  }

  if (isBackendConfigured()) {
    const backendRequirement = requirePortalUsersBackend(tenantId);
    if (backendRequirement) return backendRequirement;
    try {
      const response = await createPortalUser(tenantId, {
        email,
        name: parsed.data.name,
        role: parsed.data.role,
        password: resolvedPassword
      }, guard.ctx?.userId || null);

      safeAppendUsersAuditLog({
        tenantId,
        userId: guard.ctx?.userId,
        action: "tenant_user_invited",
        entity: "membership",
        entityId: response.data.user.id,
        metadata: { role: parsed.data.role, email }
      });

      return NextResponse.json({ ok: true, userId: response.data.user.id }, { status: 201 });
    } catch (error) {
      return proxyUsersBackendError("create_user", tenantId, error, {
        email,
        requestedRole: parsed.data.role
      });
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
  const currentUsers = listTenantMembers(tenantId).map((user) =>
    normalizeRouteUserWithKind({
      id: user.id,
      email: user.email,
      name: user.name,
      tenantRole: user.tenantRole
    })
  );
  const currentMeta = buildRouteUsersMeta(currentUsers, policy.allowedRoles);
  if (countsAsSubaccount && currentMeta.limitApplies !== false && currentMeta.subaccountCount >= Number(currentMeta.subaccountLimit)) {
    return NextResponse.json(
      {
        error: "tenant_subaccount_limit_reached",
        detail: "Este espacio ya alcanzo el limite de subcuentas activas.",
        meta: currentMeta
      },
      { status: 409 }
    );
  }
  let user = data.users.find((item) => item.email.toLowerCase() === email);
  if (!user) {
    user = {
      id: newId("usr"),
      email,
      name: parsed.data.name,
      globalRole: "client",
      passwordHash: hashSync(resolvedPassword, 10),
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
  const policy = getUserManagementPolicy(guard.ctx || {});
  if (!policy.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updateRoleSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  if (!policy.allowedRoles.includes(parsed.data.role)) {
    return NextResponse.json(
      {
        error: "role_not_allowed_for_actor",
        detail: "No puedes asignar ese rol desde esta cuenta."
      },
      { status: 403 }
    );
  }

  const tenantId = resolveTargetTenantId(guard.ctx || {}, parsed.data.tenantId);
  if (!tenantId) return NextResponse.json({ error: "missing_target_tenant_id" }, { status: 400 });
  const currentUsers = await listRouteUsers(tenantId);
  const targetUser = currentUsers.find((user) => user.id === parsed.data.userId);
  if (!targetUser) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageTargetUser(policy, targetUser)) {
    return NextResponse.json(
      {
        error: "target_user_not_manageable",
        detail: "La cuenta principal no puede modificar otra cuenta principal ni roles elevados."
      },
      { status: 403 }
    );
  }
  if (tenantId && !isBackendConfigured()) {
    return NextResponse.json(
      {
        error: "portal_users_backend_unavailable",
        detail: "La gestion de usuarios para workspaces reales requiere backend persistente tenant-scoped."
      },
      { status: 503 }
    );
  }

  if (isBackendConfigured()) {
    const backendRequirement = requirePortalUsersBackend(tenantId);
    if (backendRequirement) return backendRequirement;
    try {
      const response = await patchPortalUserRole(tenantId, parsed.data.userId, parsed.data.role, guard.ctx?.userId || null);
      safeAppendUsersAuditLog({
        tenantId,
        userId: guard.ctx?.userId,
        action: "tenant_user_role_updated",
        entity: "membership",
        entityId: parsed.data.userId,
        metadata: { role: parsed.data.role }
      });
      return NextResponse.json({ ok: true, user: response.data.user });
    } catch (error) {
      return proxyUsersBackendError("update_user_role", tenantId, error, {
        targetUserId: parsed.data.userId,
        requestedRole: parsed.data.role
      });
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

const updatePrimarySchema = z.object({
  userId: z.string().min(1),
  tenantId: z.string().min(1).optional()
});

export async function PUT(request: NextRequest) {
  const guard = await requireAppApi({ permission: "manage_users" });
  if (guard.error) return guard.error;
  const policy = getUserManagementPolicy(guard.ctx || {});
  if (!policy.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updatePrimarySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const tenantId = resolveTargetTenantId(guard.ctx || {}, parsed.data.tenantId);
  if (!tenantId) return NextResponse.json({ error: "missing_target_tenant_id" }, { status: 400 });
  const currentUsers = await listRouteUsers(tenantId);
  const targetUser = currentUsers.find((user) => user.id === parsed.data.userId);
  if (!targetUser) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tenantId && !isBackendConfigured()) {
    return NextResponse.json(
      {
        error: "portal_users_backend_unavailable",
        detail: "La gestion de cuenta principal para workspaces reales requiere backend persistente tenant-scoped."
      },
      { status: 503 }
    );
  }

  if (isBackendConfigured()) {
    const backendRequirement = requirePortalUsersBackend(tenantId);
    if (backendRequirement) return backendRequirement;
    try {
      const response = await patchPortalPrimaryUser(tenantId, parsed.data.userId, guard.ctx?.userId || null);
      safeAppendUsersAuditLog({
        tenantId,
        userId: guard.ctx?.userId,
        action: "tenant_primary_user_updated",
        entity: "membership",
        entityId: parsed.data.userId,
        metadata: { previousPrimaryUserId: currentUsers.find((user) => user.accountKind === "primary")?.id || null }
      });
      return NextResponse.json({
        ok: true,
        user: normalizeRouteUserWithKind(response.data.user),
        meta: response.data.meta || null
      });
    } catch (error) {
      return proxyUsersBackendError("update_primary_user", tenantId, error, {
        targetUserId: parsed.data.userId
      });
    }
  }

  return NextResponse.json(
    {
      error: "portal_users_backend_unavailable",
      detail: "La gestion de cuenta principal para workspaces reales requiere backend persistente tenant-scoped."
    },
    { status: 503 }
  );
}

export async function DELETE(request: NextRequest) {
  const guard = await requireAppApi({ permission: "manage_users" });
  if (guard.error) return guard.error;
  const policy = getUserManagementPolicy(guard.ctx || {});
  if (!policy.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const userId = new URL(request.url).searchParams.get("id") || "";
  if (!userId) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  const tenantId = resolveTargetTenantId(guard.ctx || {}, new URL(request.url).searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "missing_target_tenant_id" }, { status: 400 });
  const currentUserId = guard.ctx?.userId as string;
  const currentUsers = await listRouteUsers(tenantId);
  const targetUser = currentUsers.find((user) => user.id === userId);
  if (!targetUser) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageTargetUser(policy, targetUser)) {
    return NextResponse.json(
      {
        error: "target_user_not_manageable",
        detail: "La cuenta principal no puede eliminar otra cuenta principal ni roles elevados."
      },
      { status: 403 }
    );
  }
  if (tenantId && !isBackendConfigured()) {
    return NextResponse.json(
      {
        error: "portal_users_backend_unavailable",
        detail: "La gestion de usuarios para workspaces reales requiere backend persistente tenant-scoped."
      },
      { status: 503 }
    );
  }

  if (isBackendConfigured()) {
    const backendRequirement = requirePortalUsersBackend(tenantId);
    if (backendRequirement) return backendRequirement;
    try {
      const response = await deletePortalUser(tenantId, userId, currentUserId);
      safeAppendUsersAuditLog({
        tenantId,
        userId: currentUserId,
        action: "tenant_user_deleted",
        entity: "membership",
        entityId: userId
      });
      return NextResponse.json({ ok: true, userId: response.data.userId });
    } catch (error) {
      return proxyUsersBackendError("delete_user", tenantId, error, {
        targetUserId: userId,
        currentUserId
      });
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
