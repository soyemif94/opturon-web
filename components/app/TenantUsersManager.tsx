"use client";

import { FormEvent, useState } from "react";
import type { PortalUserAuditEvent } from "@/lib/api";
import { toast } from "@/components/ui/toast";

type UserRow = { id: string; email: string; name: string; tenantRole: string; accountKind?: "primary" | "subaccount" };
type UsersMeta = {
  subaccountCount: number;
  primaryAccountCount: number;
  primaryPortalUserId?: string | null;
  subaccountLimit: number | null;
  remainingSubaccounts: number | null;
  futureLimitKey: string;
  limitScope: "subaccounts" | "opturon_admin";
  limitSource?: string | null;
  limitApplies?: boolean;
  accountScope?: string;
  unlimitedSubaccounts?: boolean;
};

type Props = {
  initialUsers: UserRow[];
  initialMeta: UsersMeta;
  initialActivity: PortalUserAuditEvent[];
  canManage: boolean;
  currentUserId?: string;
  currentTenantRole?: string;
  currentGlobalRole?: string;
  targetTenantId?: string;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "propietario",
  manager: "gerente",
  seller: "vendedor",
  viewer: "visualizador"
};

function roleLabel(role: string) {
  return ROLE_LABELS[role] || role;
}

function accountKindLabel(accountKind?: string) {
  return accountKind === "primary" ? "cuenta principal" : "subcuenta";
}

export function TenantUsersManager({ initialUsers, initialMeta, initialActivity, canManage, currentUserId, currentTenantRole, currentGlobalRole, targetTenantId }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [meta, setMeta] = useState(initialMeta);
  const [activity, setActivity] = useState(initialActivity);
  const [form, setForm] = useState({ email: "", name: "", role: "viewer", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingRoleUserId, setPendingRoleUserId] = useState<string | null>(null);
  const [pendingPrimaryUserId, setPendingPrimaryUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | null; text: string }>({ tone: null, text: "" });
  const isStaffManager = currentGlobalRole === "superadmin" || currentGlobalRole === "ops_admin";
  const allowedRoles = isStaffManager ? ["owner", "manager", "seller", "viewer"] : ["seller", "viewer"];
  const subaccountCount = meta.subaccountCount;
  const subaccountLimit = meta.subaccountLimit;
  const remainingSubaccounts = meta.remainingSubaccounts;
  const unlimitedSubaccounts = Boolean(meta.unlimitedSubaccounts || meta.limitScope === "opturon_admin");
  const usedPct = !unlimitedSubaccounts && Number(subaccountLimit) > 0 ? Math.min(100, Math.round((subaccountCount / Number(subaccountLimit)) * 100)) : 0;
  const inviteBlockedByLimit = !unlimitedSubaccounts && form.role !== "owner" && Number(remainingSubaccounts) <= 0;
  const usersEndpoint = targetTenantId ? `/api/app/users?tenantId=${encodeURIComponent(targetTenantId)}` : "/api/app/users";

  function canManageTarget(user: UserRow) {
    if (isStaffManager) return true;
    if (user.accountKind === "primary") return false;
    return user.tenantRole === "seller" || user.tenantRole === "viewer";
  }

  function canPromoteToPrimary(user: UserRow) {
    if (user.accountKind === "primary") return false;
    if (isStaffManager) return true;
    return user.tenantRole === "seller" || user.tenantRole === "viewer";
  }

  async function invite(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const email = form.email.trim().toLowerCase();
    const name = form.name.trim();
    const password = form.password.trim();

    if (!name || name.length < 2) {
      setFeedback({ tone: "error", text: "Ingresa un nombre valido." });
      toast.error("Nombre invalido");
      return;
    }
    if (!email || !email.includes("@")) {
      setFeedback({ tone: "error", text: "Ingresa un email valido." });
      toast.error("Email invalido");
      return;
    }
    if (password.length > 0 && password.length < 6) {
      setFeedback({ tone: "error", text: "La password temporal debe tener al menos 6 caracteres." });
      toast.error("Password temporal demasiado corta");
      return;
    }

    setIsSubmitting(true);
    setFeedback({ tone: null, text: "" });

    try {
      const response = await fetch(usersEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, email, name, tenantId: targetTenantId })
      });

      if (!response.ok) {
        const json = await safeJson(response);
        const message = json?.detail || json?.error?.formErrors?.[0] || json?.error || "No se pudo invitar al usuario.";
        if (json?.meta) setMeta(json.meta);
        setFeedback({ tone: "error", text: String(message) });
        toast.error("Error al invitar usuario", String(message));
        return;
      }

      await reloadUsers();
      setForm({ email: "", name: "", role: "viewer", password: "" });
      setFeedback({ tone: "success", text: "Usuario invitado correctamente." });
      toast.success("Invitacion enviada");
    } catch {
      setFeedback({ tone: "error", text: "Ocurrio un error de red al invitar al usuario." });
      toast.error("Error de red", "No pudimos invitar al usuario.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function reloadUsers() {
    const response = await fetch(usersEndpoint, { cache: "no-store" });
    if (!response.ok) return;
    const json = await response.json();
    setUsers((json.users || []).map((user: UserRow) => ({
      ...user,
      tenantRole: user.tenantRole === "editor" ? "seller" : user.tenantRole,
      accountKind: user.accountKind === "primary" ? "primary" : "subaccount"
    })));
    if (json.meta) setMeta(json.meta);
    setActivity(Array.isArray(json.activity) ? json.activity : []);
  }

  async function updateRole(userId: string, role: string) {
    setPendingRoleUserId(userId);
    setFeedback({ tone: null, text: "" });
    try {
      const response = await fetch(usersEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role, tenantId: targetTenantId })
      });
      if (!response.ok) {
        const json = await safeJson(response);
        const message = json?.error || "No se pudo actualizar el rol.";
        setFeedback({ tone: "error", text: String(message) });
        toast.error("Error al actualizar rol", String(message));
        return;
      }
      const json = await safeJson(response);
      const nextRole = json?.user?.role || role;
      setUsers((current) => current.map((user) => (user.id === userId ? { ...user, tenantRole: nextRole } : user)));
      await reloadUsers();
      setFeedback({ tone: "success", text: "Rol actualizado correctamente." });
      toast.success("Rol actualizado");
    } catch {
      setFeedback({ tone: "error", text: "Ocurrio un error de red al actualizar el rol." });
      toast.error("Error de red", "No pudimos actualizar el rol.");
    } finally {
      setPendingRoleUserId(null);
    }
  }

  async function makePrimary(userId: string) {
    const target = users.find((user) => user.id === userId);
    if (!target) return;
    const confirmed = window.confirm(`Vas a marcar a ${target.name} como cuenta principal del tenant. Esta accion reemplaza la principal actual.`);
    if (!confirmed) return;

    setPendingPrimaryUserId(userId);
    setFeedback({ tone: null, text: "" });

    try {
      const response = await fetch(usersEndpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tenantId: targetTenantId })
      });

      if (!response.ok) {
        const json = await safeJson(response);
        const message = json?.detail || json?.error || "No se pudo actualizar la cuenta principal.";
        if (json?.meta) setMeta(json.meta);
        setFeedback({ tone: "error", text: String(message) });
        toast.error("Error al actualizar cuenta principal", String(message));
        return;
      }

      await reloadUsers();
      setFeedback({ tone: "success", text: "Cuenta principal actualizada correctamente." });
      toast.success("Cuenta principal actualizada");
    } catch {
      setFeedback({ tone: "error", text: "Ocurrio un error de red al actualizar la cuenta principal." });
      toast.error("Error de red", "No pudimos actualizar la cuenta principal.");
    } finally {
      setPendingPrimaryUserId(null);
    }
  }

  async function removeUser(userId: string) {
    setRemovingUserId(userId);
    setFeedback({ tone: null, text: "" });
    try {
      const query = targetTenantId ? `&tenantId=${encodeURIComponent(targetTenantId)}` : "";
      const response = await fetch(`/api/app/users?id=${encodeURIComponent(userId)}${query}`, { method: "DELETE" });
      if (!response.ok) {
        const json = await safeJson(response);
        const message = json?.error || "No se pudo eliminar el usuario.";
        setFeedback({ tone: "error", text: String(message) });
        toast.error("Error al eliminar usuario", String(message));
        return;
      }
      setUsers((current) => current.filter((user) => user.id !== userId));
      await reloadUsers();
      setFeedback({ tone: "success", text: "Usuario eliminado correctamente." });
      toast.success("Usuario eliminado");
    } catch {
      setFeedback({ tone: "error", text: "Ocurrio un error de red al eliminar el usuario." });
      toast.error("Error de red", "No pudimos eliminar el usuario.");
    } finally {
      setRemovingUserId(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Usuarios cliente</h1>

      <div className="rounded-2xl border border-[color:var(--border)] bg-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="font-semibold">Plan y cupo de usuarios</h3>
            <p className="mt-1 text-sm text-muted">
              {unlimitedSubaccounts ? `${subaccountCount} subcuentas activas` : `${subaccountCount} / ${subaccountLimit} subcuentas utilizadas`}
            </p>
            <p className="mt-1 text-xs text-muted">
              {unlimitedSubaccounts
                ? "Cuenta administradora global de Opturon: no consume cupo de cliente."
                : `Disponibles: ${remainingSubaccounts}. La cuenta principal no consume cupo.`}
            </p>
            {meta.primaryPortalUserId ? (
              <p className="mt-1 text-xs text-muted">
                Cuenta principal actual: {users.find((user) => user.id === meta.primaryPortalUserId)?.name || "Configurada"}.
              </p>
            ) : null}
          </div>
          <div className="w-full max-w-xs">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Uso del plan</span>
              <span>{unlimitedSubaccounts ? "Ilimitado" : `${usedPct}%`}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
              <div
                className={`h-full rounded-full ${inviteBlockedByLimit ? "bg-amber-400" : "bg-brand"}`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
          </div>
        </div>

        {inviteBlockedByLimit ? (
          <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-3">
            <p className="text-sm font-medium text-amber-100">Alcanzaste el limite de usuarios de tu plan.</p>
            <p className="mt-1 text-xs text-amber-200">
              No podes crear mas subcuentas hasta liberar cupo o ampliar tu plan.
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-[color:var(--border)] bg-surface px-3 py-3">
            <p className="text-sm text-muted">
              Necesitas mas usuarios? Contactanos para ampliar tu plan.
            </p>
          </div>
        )}
      </div>

      {canManage ? (
        <form className="rounded-2xl border border-[color:var(--border)] bg-card p-4" onSubmit={invite}>
          <h3 className="font-semibold">Invitar usuario</h3>
          <p className="mt-1 text-sm text-muted">
            {isStaffManager
              ? "Crea accesos del portal con el rol que corresponda."
              : currentTenantRole === "owner"
                ? "La cuenta principal del negocio solo puede crear subcuentas operativas de vendedor o visualizador."
                : "Solo la cuenta principal puede gestionar usuarios de este espacio."}
          </p>
          {inviteBlockedByLimit ? (
            <p className="mt-2 text-xs text-amber-300">
              Alcanzaste el limite de usuarios de tu plan. Para crear otra subcuenta, primero hay que liberar cupo.
            </p>
          ) : null}
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <input className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="Nombre" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <input className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            <select className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
              {allowedRoles.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
            <input className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="Password temporal" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button type="submit" disabled={isSubmitting || inviteBlockedByLimit} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {isSubmitting ? "Invitando..." : "Invitar"}
            </button>
            {feedback.tone ? <p className={`text-xs ${feedback.tone === "success" ? "text-green-400" : "text-red-300"}`}>{feedback.text}</p> : null}
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted">Solo propietario puede gestionar usuarios y permisos.</p>
      )}

      <div className="overflow-hidden rounded-2xl border border-[color:var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Rol</th>
              {canManage ? <th className="px-4 py-3 text-right">Acciones</th> : null}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isCurrentUser = user.id === currentUserId;
              return (
                <tr key={user.id} className="border-t border-[color:var(--border)]">
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{accountKindLabel(user.accountKind)}</td>
                  <td className="px-4 py-3 capitalize">
                    {canManage && canManageTarget(user) ? (
                      <select
                        className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm"
                        value={user.tenantRole}
                        disabled={pendingRoleUserId === user.id}
                        onChange={(event) => void updateRole(user.id, event.target.value)}
                      >
                        {allowedRoles.map((role) => (
                          <option key={role} value={role}>
                            {roleLabel(role)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      roleLabel(user.tenantRole)
                    )}
                  </td>
                  {canManage ? (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {canPromoteToPrimary(user) ? (
                          <button
                            type="button"
                            onClick={() => void makePrimary(user.id)}
                            disabled={pendingPrimaryUserId === user.id}
                            className="text-xs text-amber-200 hover:underline disabled:opacity-50"
                            title="Marcar como cuenta principal"
                          >
                            {pendingPrimaryUserId === user.id ? "Actualizando..." : "Marcar principal"}
                          </button>
                        ) : user.accountKind === "primary" ? (
                          <span className="text-xs text-emerald-300">Principal actual</span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void removeUser(user.id)}
                          disabled={removingUserId === user.id || isCurrentUser || !canManageTarget(user)}
                          className="text-xs text-red-300 hover:underline disabled:opacity-50"
                          title={
                            isCurrentUser
                              ? "No puedes eliminar tu propio usuario activo."
                              : !canManageTarget(user)
                                ? "Esta cuenta no puede gestionar otra cuenta principal ni roles elevados."
                                : "Eliminar usuario"
                          }
                        >
                          {removingUserId === user.id ? "Eliminando..." : "Eliminar usuario"}
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-[color:var(--border)] bg-card p-4">
        <h3 className="font-semibold">Actividad reciente</h3>
        <div className="mt-3 space-y-2 text-sm">
          {activity.length ? (
            activity.slice(0, 8).map((entry) => (
              <div key={entry.id} className="rounded-xl border border-[color:var(--border)] bg-surface px-3 py-2">
                <p>{formatActivityMessage(entry)}</p>
                <p className="mt-1 text-xs text-muted">{formatActivityTimestamp(entry.createdAt)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">Todavia no hay eventos operativos registrados para usuarios.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatActivityMessage(entry: PortalUserAuditEvent) {
  const payload = entry.payload || {};
  const actor = entry.actorName || entry.actorEmail || "Sistema";
  const target = entry.targetName || entry.targetEmail || String(payload.name || payload.email || "usuario");

  if (entry.action === "tenant_portal_user_created") {
    return `${actor} creo la cuenta ${target}.`;
  }
  if (entry.action === "tenant_primary_portal_user_changed") {
    return `${actor} marco a ${target} como cuenta principal.`;
  }
  if (entry.action === "tenant_portal_user_role_updated") {
    const previousRole = String(payload.previousRole || "").trim();
    const nextRole = String(payload.nextRole || "").trim();
    if (previousRole && nextRole) {
      return `${actor} cambio el rol de ${target} de ${roleLabel(previousRole)} a ${roleLabel(nextRole)}.`;
    }
    return `${actor} actualizo el rol de ${target}.`;
  }
  if (entry.action === "tenant_portal_user_deleted") {
    return `${actor} elimino la cuenta ${target}.`;
  }
  return `${actor} registro ${entry.action} sobre ${target}.`;
}

function formatActivityTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
