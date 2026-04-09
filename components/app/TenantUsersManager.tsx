"use client";

import { FormEvent, useState } from "react";
import { toast } from "@/components/ui/toast";

type UserRow = { id: string; email: string; name: string; tenantRole: string };

type Props = {
  initialUsers: UserRow[];
  canManage: boolean;
  currentUserId?: string;
  currentTenantRole?: string;
  currentGlobalRole?: string;
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

function accountKindLabel(role: string) {
  return role === "owner" ? "cuenta principal" : "subcuenta";
}

export function TenantUsersManager({ initialUsers, canManage, currentUserId, currentTenantRole, currentGlobalRole }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState({ email: "", name: "", role: "viewer", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingRoleUserId, setPendingRoleUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | null; text: string }>({ tone: null, text: "" });
  const isStaffManager = currentGlobalRole === "superadmin" || currentGlobalRole === "ops_admin";
  const allowedRoles = isStaffManager ? ["owner", "manager", "seller", "viewer"] : ["seller", "viewer"];
  const subaccountCount = users.filter((user) => user.tenantRole !== "owner").length;

  function canManageTarget(user: UserRow) {
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
      const response = await fetch("/api/app/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, email, name })
      });

      if (!response.ok) {
        const json = await safeJson(response);
        const message = json?.error?.formErrors?.[0] || json?.error || "No se pudo invitar al usuario.";
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
    const response = await fetch("/api/app/users", { cache: "no-store" });
    if (!response.ok) return;
    const json = await response.json();
    setUsers((json.users || []).map((user: UserRow) => ({ ...user, tenantRole: user.tenantRole === "editor" ? "seller" : user.tenantRole })));
  }

  async function updateRole(userId: string, role: string) {
    setPendingRoleUserId(userId);
    setFeedback({ tone: null, text: "" });
    try {
      const response = await fetch("/api/app/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role })
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

  async function removeUser(userId: string) {
    setRemovingUserId(userId);
    setFeedback({ tone: null, text: "" });
    try {
      const response = await fetch(`/api/app/users?id=${encodeURIComponent(userId)}`, { method: "DELETE" });
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
          <p className="mt-2 text-xs text-muted">
            Cuenta principal: propietario. Subcuentas activas hoy: {subaccountCount}. Punto futuro para plan: limite por tenant sobre subcuentas.
          </p>
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
            <button type="submit" disabled={isSubmitting} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
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
                  <td className="px-4 py-3">{accountKindLabel(user.tenantRole)}</td>
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
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
