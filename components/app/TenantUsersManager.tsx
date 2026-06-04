"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Clock3,
  Crown,
  Mail,
  PencilLine,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  UserRoundCheck,
  KeyRound,
  Wand2
} from "lucide-react";
import type { PortalUserAuditEvent } from "@/lib/api";
import { normalizePortalUserRole, portalUserRoleLabel } from "@/lib/portal-users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SimpleAvatar } from "@/components/app/simple-avatar";
import { toast } from "@/components/ui/toast";

type UserRow = {
  id: string;
  email: string;
  name: string;
  tenantRole: string;
  accountKind?: "primary" | "subaccount";
  invitationStatus?: string;
  invitationExpiresAt?: string | null;
  invitationSentAt?: string | null;
};
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

const ADMIN_ROLE_OPTIONS = [
  { value: "owner", label: "Nuevo cliente (crea workspace)" },
  { value: "manager", label: "Manager" },
  { value: "seller", label: "Vendedor" },
  { value: "viewer", label: "Solo lectura" }
];
const CLIENT_ROLE_OPTIONS = [
  { value: "seller", label: "Vendedor" },
  { value: "viewer", label: "Solo lectura" }
];

function accountKindLabel(accountKind?: string) {
  return accountKind === "primary" ? "cuenta principal" : "subcuenta";
}

export function TenantUsersManager({
  initialUsers,
  initialMeta,
  initialActivity,
  canManage,
  currentUserId,
  currentTenantRole,
  currentGlobalRole,
  targetTenantId
}: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [meta, setMeta] = useState(initialMeta);
  const [activity, setActivity] = useState(initialActivity);
  const [form, setForm] = useState({ email: "", name: "", role: "seller" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingRoleUserId, setPendingRoleUserId] = useState<string | null>(null);
  const [pendingPrimaryUserId, setPendingPrimaryUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingNameUserId, setSavingNameUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | null; text: string }>({ tone: null, text: "" });
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<"all" | "manager" | "seller" | "other">("all");
  const [search, setSearch] = useState("");

  const isStaffManager = currentGlobalRole === "superadmin" || currentGlobalRole === "ops_admin";
  const isOpturonAdminScope = meta.accountScope === "opturon_admin";
  const roleOptions = isOpturonAdminScope ? ADMIN_ROLE_OPTIONS : CLIENT_ROLE_OPTIONS;
  const subaccountCount = meta.subaccountCount;
  const subaccountLimit = meta.subaccountLimit;
  const remainingSubaccounts = meta.remainingSubaccounts;
  const unlimitedSubaccounts = Boolean(meta.unlimitedSubaccounts || meta.limitScope === "opturon_admin");
  const usedPct = !unlimitedSubaccounts && Number(subaccountLimit) > 0 ? Math.min(100, Math.round((subaccountCount / Number(subaccountLimit)) * 100)) : 0;
  const inviteBlockedByLimit = !unlimitedSubaccounts && form.role !== "owner" && Number(remainingSubaccounts) <= 0;
  const usersEndpoint = targetTenantId ? `/api/app/users?tenantId=${encodeURIComponent(targetTenantId)}` : "/api/app/users";
  const teamUsers = useMemo(
    () =>
      isOpturonAdminScope
        ? users
        : users.filter((user) => {
            const normalizedRole = normalizePortalUserRole(user.tenantRole);
            return user.accountKind !== "primary" && normalizedRole !== "owner";
          }),
    [isOpturonAdminScope, users]
  );

  const lastActivityByUser = useMemo(() => {
    const map = new Map<string, PortalUserAuditEvent>();
    for (const entry of activity) {
      const candidateIds = [entry.targetUserId, entry.actorUserId].filter(Boolean) as string[];
      for (const id of candidateIds) {
        const current = map.get(id);
        if (!current || new Date(entry.createdAt).getTime() > new Date(current.createdAt).getTime()) {
          map.set(id, entry);
        }
      }
    }
    return map;
  }, [activity]);

  const roleDistribution = useMemo(() => {
    const counts = { manager: 0, seller: 0, other: 0 };
    teamUsers.forEach((user) => {
      const normalized = normalizePortalUserRole(user.tenantRole);
      if (normalized === "owner" || normalized === "manager") counts.manager += 1;
      else if (normalized === "seller") counts.seller += 1;
      else counts.other += 1;
    });
    return counts;
  }, [teamUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return teamUsers.filter((user) => {
      const normalized = normalizePortalUserRole(user.tenantRole);
      const roleGroup =
        normalized === "owner" || normalized === "manager" ? "manager" : normalized === "seller" ? "seller" : "other";
      if (selectedRoleFilter !== "all" && roleGroup !== selectedRoleFilter) return false;
      if (!query) return true;
      return [user.name, user.email, roleLabel(user.tenantRole, user.accountKind)]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [teamUsers, search, selectedRoleFilter]);

  function canManageTarget(user: UserRow) {
    if (!isOpturonAdminScope && user.accountKind === "primary") return false;
    if (isStaffManager) return true;
    return user.tenantRole === "seller" || user.tenantRole === "viewer";
  }

  function canPromoteToPrimary(user: UserRow) {
    if (isOpturonAdminScope) return false;
    if (user.accountKind === "primary") return false;
    if (isStaffManager) return true;
    return user.tenantRole === "seller" || user.tenantRole === "viewer";
  }

  function roleLabel(role: string, accountKind?: string) {
    if (isOpturonAdminScope) {
      const normalized = normalizePortalUserRole(role);
      if (normalized === "owner" || String(accountKind || "").trim().toLowerCase() === "primary") return "Cuenta principal";
    }
    return portalUserRoleLabel(role, accountKind);
  }

  function visibleRoleValue(user: UserRow) {
    const normalizedRole = normalizePortalUserRole(user.tenantRole);
    if (isOpturonAdminScope) {
      return normalizedRole === "owner" || user.accountKind === "primary" ? "owner" : normalizedRole || "viewer";
    }
    return normalizedRole === "viewer" ? "viewer" : "seller";
  }

  async function invite(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const email = form.email.trim().toLowerCase();
    const name = form.name.trim();

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
      setForm({ email: "", name: "", role: "seller" });
      setFeedback({ tone: "success", text: "Invitacion enviada correctamente." });
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

  function startNameEdit(user: UserRow) {
    setEditingUserId(user.id);
    setEditingName(user.name);
  }

  function cancelNameEdit() {
    setEditingUserId(null);
    setEditingName("");
  }

  async function saveName(userId: string) {
    const nextName = editingName.trim();
    if (nextName.length < 2) {
      setFeedback({ tone: "error", text: "Ingresa un nombre valido." });
      toast.error("Nombre invalido");
      return;
    }

    setSavingNameUserId(userId);
    setFeedback({ tone: null, text: "" });
    try {
      const response = await fetch(usersEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, name: nextName, tenantId: targetTenantId })
      });
      if (!response.ok) {
        const json = await safeJson(response);
        const message = json?.detail || json?.error || "No se pudo actualizar el nombre.";
        setFeedback({ tone: "error", text: String(message) });
        toast.error("Error al actualizar usuario", String(message));
        return;
      }
      setUsers((current) => current.map((user) => (user.id === userId ? { ...user, name: nextName } : user)));
      await reloadUsers();
      cancelNameEdit();
      setFeedback({ tone: "success", text: "Nombre actualizado correctamente." });
      toast.success("Usuario actualizado");
    } catch {
      setFeedback({ tone: "error", text: "Ocurrio un error de red al actualizar el nombre." });
      toast.error("Error de red", "No pudimos actualizar el usuario.");
    } finally {
      setSavingNameUserId(null);
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
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_82%_18%,rgba(139,92,246,0.14),transparent_18%),linear-gradient(135deg,rgba(12,20,32,0.98),rgba(10,16,28,0.96))] p-5 shadow-[var(--card-shadow)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted">
              <Link href="/app/settings" className="transition-colors hover:text-white">
                Configuracion
              </Link>
              <span>/</span>
              <span className="text-white">Usuarios del espacio</span>
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">Usuarios del espacio</h1>
            <p className="mt-2 text-sm leading-6 text-muted">Gestiona tu equipo y los accesos al portal segun las necesidades de tu negocio.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="muted">Espacio del cliente</Badge>
            <Badge variant="success">Portal activo</Badge>
            <Badge variant="warning">Operacion en vivo</Badge>
          </div>
        </div>
      </section>

      <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] shadow-[var(--card-shadow)]">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[1.1fr_0.9fr_1fr_1.1fr_260px] lg:items-center">
          <MetricBlock label="Plan actual" value={unlimitedSubaccounts ? "Ilimitado" : "Cupo del espacio"} helper={unlimitedSubaccounts ? "Usuarios sin limite visible" : `${subaccountCount} de ${subaccountLimit || 0} usuarios activos`} accent="violet" />
          <MetricBlock label="Usuarios activos" value={`${subaccountCount} / ${subaccountLimit || subaccountCount}`} helper={`${Math.max(0, Number(remainingSubaccounts || 0))} cupo${Number(remainingSubaccounts || 0) === 1 ? "" : "s"} disponible${Number(remainingSubaccounts || 0) === 1 ? "" : "s"}`} accent="blue" />
          <div className="space-y-2">
            <p className="text-sm text-muted">Distribucion</p>
            <div className="grid grid-cols-3 gap-3">
              <RoleCounter label="Manager" value={roleDistribution.manager} tone="violet" />
              <RoleCounter label="Vendedores" value={roleDistribution.seller} tone="blue" />
              <RoleCounter label="Otros" value={roleDistribution.other} tone="amber" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted">
              <span>Uso del plan</span>
              <span>{unlimitedSubaccounts ? "Ilimitado" : `${usedPct}%`}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6,#c084fc)]"
                style={{ width: `${unlimitedSubaccounts ? 100 : usedPct}%` }}
              />
            </div>
            <p className="text-sm leading-6 text-muted">{inviteBlockedByLimit ? "Alcanzaste el limite de usuarios de tu plan." : "Aprovecha al maximo tu equipo."}</p>
          </div>
          <div className="flex justify-start lg:justify-end">
            <Button type="button" className="w-full rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#a855f7)] hover:bg-[linear-gradient(135deg,#8b5cf6,#c084fc)] lg:w-auto" onClick={() => document.getElementById("invite-user-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              <UserPlus className="mr-2 h-4 w-4" />
              Enviar invitacion
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card id="invite-user-section" className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] shadow-[var(--card-shadow)]">
        <CardContent className="space-y-5 p-5">
          <div>
            <h2 className="text-2xl font-semibold text-white">Invitar nuevo usuario</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Agrega un nuevo miembro y enviale un enlace real para activar su cuenta y crear su contrasena.</p>
            {!canManage ? <p className="mt-2 text-sm text-muted">Solo propietario puede gestionar usuarios y permisos.</p> : null}
            {inviteBlockedByLimit ? <p className="mt-2 text-sm text-amber-300">Alcanzaste el limite de usuarios de tu plan. Para crear otra subcuenta, primero hay que liberar cupo.</p> : null}
          </div>

          {canManage ? (
            <form className="grid gap-4 xl:grid-cols-[1fr_1fr_280px] xl:items-start" onSubmit={invite}>
              <FieldGroup label="Nombre completo">
                <Input placeholder="Ej: Juan Perez" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </FieldGroup>
              <FieldGroup label="Email">
                <Input placeholder="ejemplo@email.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </FieldGroup>
              <FieldGroup label="Rol">
                <select className="h-10 w-full rounded-xl border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-3 text-sm text-text" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </FieldGroup>
              <div className="rounded-[20px] border border-white/8 bg-white/5 p-4 text-sm leading-6 text-muted">
                El usuario recibira un email de Opturon con un enlace seguro para activar su cuenta.
              </div>
              <div className="xl:col-span-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
                {feedback.tone ? <p className={`text-sm ${feedback.tone === "success" ? "text-emerald-300" : "text-red-300"}`}>{feedback.text}</p> : null}
                <Button type="submit" disabled={isSubmitting || inviteBlockedByLimit} className="rounded-2xl bg-[linear-gradient(135deg,#7c3aed,#a855f7)] hover:bg-[linear-gradient(135deg,#8b5cf6,#c084fc)]">
                  <Wand2 className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Enviando..." : "Enviar invitacion"}
                </Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] shadow-[var(--card-shadow)]">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">Miembros del equipo</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Administra usuarios y permisos del espacio sin perder contexto comercial.</p>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { key: "all", label: "Todos" },
                    { key: "manager", label: "Managers" },
                    { key: "seller", label: "Vendedores" },
                    { key: "other", label: "Otros" }
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedRoleFilter(item.key as typeof selectedRoleFilter)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${selectedRoleFilter === item.key ? "border-violet-400/40 bg-violet-500/15 text-violet-200" : "border-white/10 bg-white/5 text-muted hover:text-white"}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="relative w-full lg:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input className="pl-9" placeholder="Buscar usuario..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-white/8">
              <div className="hidden grid-cols-[1.5fr_0.9fr_0.7fr_0.9fr_0.95fr_0.7fr] gap-4 border-b border-white/8 bg-black/12 px-5 py-4 text-xs uppercase tracking-[0.18em] text-muted lg:grid">
                <span>Usuario</span>
                <span>Rol</span>
                <span>Estado</span>
                <span>Ultimo acceso</span>
                <span>Acceso</span>
                <span className="text-right">Acciones</span>
              </div>
              <div className="divide-y divide-white/8">
                {filteredUsers.map((user) => {
                  const isCurrentUser = user.id === currentUserId;
                  const latestActivity = lastActivityByUser.get(user.id);
                  const accessMeta = accessDescriptor(user);
                  return (
                    <div key={user.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1.5fr_0.9fr_0.7fr_0.9fr_0.95fr_0.7fr] lg:items-center">
                      <div className="flex items-center gap-3">
                        <SimpleAvatar
                          name={user.name}
                          className="h-12 w-12 rounded-full border border-white/8 bg-[linear-gradient(135deg,rgba(124,58,237,0.26),rgba(59,130,246,0.22))]"
                          fallbackClassName="bg-transparent text-sm font-semibold text-white"
                        />
                        <div className="min-w-0">
                          {editingUserId === user.id ? (
                            <div className="space-y-2">
                              <Input
                                value={editingName}
                                onChange={(event) => setEditingName(event.target.value)}
                                className="h-9"
                                disabled={savingNameUserId === user.id}
                              />
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => void saveName(user.id)}
                                  disabled={savingNameUserId === user.id}
                                >
                                  {savingNameUserId === user.id ? "Guardando..." : "Guardar"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={cancelNameEdit}
                                  disabled={savingNameUserId === user.id}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="truncate text-base font-semibold text-white">{user.name}</p>
                          )}
                          <p className="truncate text-sm text-muted">{user.email}</p>
                        </div>
                      </div>

                      <div>
                        {canManage && canManageTarget(user) ? (
                          <select
                            className="h-10 w-full rounded-xl border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-3 text-sm text-text"
                            value={visibleRoleValue(user)}
                            disabled={pendingRoleUserId === user.id}
                            onChange={(event) => void updateRole(user.id, event.target.value)}
                          >
                            {roleOptions
                              .filter((role) => role.value !== "owner" || visibleRoleValue(user) === "owner")
                              .map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                              ))}
                          </select>
                        ) : (
                          <RoleBadge role={user.tenantRole} accountKind={user.accountKind} />
                        )}
                      </div>

                      <InvitationStatusBadge status={user.invitationStatus} expiresAt={user.invitationExpiresAt} />

                      <div className="text-sm">
                        <p className="text-white">{latestActivity ? formatActivityTimestamp(latestActivity.createdAt) : "Sin registro"}</p>
                        <p className="mt-1 text-xs text-muted">{latestActivity ? formatActivityMessage(latestActivity) : "Todavia sin actividad visible"}</p>
                      </div>

                      <div className="text-sm">
                        <p className="font-medium text-white">{accessMeta.title}</p>
                        <p className="mt-1 text-xs text-muted">{accessMeta.copy}</p>
                      </div>

                      <div className="flex items-center justify-start gap-2 lg:justify-end">
                        {canPromoteToPrimary(user) ? (
                          <ActionButton
                            label={pendingPrimaryUserId === user.id ? "Actualizando..." : "Marcar principal"}
                            icon={<Crown className="h-4 w-4" />}
                            tone="amber"
                            onClick={() => void makePrimary(user.id)}
                            disabled={pendingPrimaryUserId === user.id}
                          />
                        ) : user.accountKind === "primary" ? (
                          <ActionPill label="Principal" tone="emerald" />
                        ) : null}
                        {canManageTarget(user) ? (
                          <ActionButton
                            label={editingUserId === user.id ? "Editando..." : "Editar"}
                            icon={<PencilLine className="h-4 w-4" />}
                            tone="neutral"
                            onClick={() => startNameEdit(user)}
                            disabled={editingUserId === user.id}
                          />
                        ) : null}
                        <ActionButton
                          label={removingUserId === user.id ? "Eliminando..." : "Eliminar"}
                          icon={<Trash2 className="h-4 w-4" />}
                          tone="danger"
                          onClick={() => void removeUser(user.id)}
                          disabled={removingUserId === user.id || isCurrentUser || !canManageTarget(user)}
                        />
                      </div>
                    </div>
                  );
                })}
                {!filteredUsers.length ? (
                  <div className="px-5 py-10 text-center text-sm text-muted">No hay usuarios que coincidan con esta busqueda.</div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-muted">
              <span>
                Mostrando 1 a {filteredUsers.length} de {teamUsers.length} usuarios
              </span>
              <div className="flex items-center gap-2">
                <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted">
                  ‹
                </button>
                <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/40 bg-violet-500/20 text-violet-200">
                  1
                </button>
                <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted">
                  ›
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] shadow-[var(--card-shadow)]">
            <CardContent className="space-y-4 p-5">
              <h3 className="text-2xl font-semibold text-white">Detalles importantes</h3>
              <SidebarInfo
                icon={<ShieldCheck className="h-4 w-4" />}
                title="Roles y permisos"
                copy="Asigna el rol adecuado para controlar el acceso a funcionalidades del portal."
                tone="violet"
              />
              <SidebarInfo
                icon={<KeyRound className="h-4 w-4" />}
                title="Seguridad"
                copy="Cada usuario activa su cuenta desde un enlace unico y define su propia contrasena."
                tone="amber"
              />
              <SidebarInfo
                icon={<Users className="h-4 w-4" />}
                title="Usuarios limitados"
                copy={unlimitedSubaccounts ? "Este espacio hoy no muestra limite visible de subcuentas." : `En este plan tenes ${subaccountCount} usuarios activos de ${subaccountLimit || 0} disponibles.`}
                tone="blue"
              />
              <SidebarInfo
                icon={<Clock3 className="h-4 w-4" />}
                title="Historial de actividad"
                copy="Desde cada usuario puedes ver cambios recientes de rol, acceso y altas dentro del espacio."
                tone="brand"
              />
              <Button asChild variant="secondary" className="w-full rounded-2xl">
                <Link href="/app/settings">
                  Ver guia de usuarios
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] shadow-[var(--card-shadow)]">
            <CardContent className="space-y-3 p-5">
              <h3 className="text-lg font-semibold text-white">Actividad reciente</h3>
              {activity.length ? (
                activity.slice(0, 4).map((entry) => (
                  <div key={entry.id} className="rounded-[18px] border border-white/8 bg-surface/55 p-3.5">
                    <p className="text-sm leading-6 text-white">{formatActivityMessage(entry)}</p>
                    <p className="mt-1 text-xs text-muted">{formatActivityTimestamp(entry.createdAt)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">Todavia no hay eventos operativos registrados para usuarios.</p>
              )}
            </CardContent>
          </Card>
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
      return `${actor} cambio el rol de ${target} de ${previousRole} a ${nextRole}.`;
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

function accessDescriptor(user: UserRow) {
  const normalized = normalizePortalUserRole(user.tenantRole);
  if (user.accountKind === "primary" || normalized === "owner" || normalized === "manager") {
    return { title: "Acceso total", copy: "Todo el portal" };
  }
  if (normalized === "seller") {
    return { title: "Acceso operativo", copy: "Inbox, clientes y ventas" };
  }
  return { title: "Acceso limitado", copy: "Vista restringida del espacio" };
}

function InvitationStatusBadge({ status, expiresAt }: { status?: string; expiresAt?: string | null }) {
  const normalized = String(status || "").trim().toLowerCase();
  const expired = normalized === "expired";
  const pending = normalized === "pending";
  const invited = normalized === "invited";
  const active = !expired && !pending && !invited;

  const toneClass = active
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
    : expired
      ? "border-red-500/20 bg-red-500/10 text-red-200"
      : "border-amber-500/20 bg-amber-500/10 text-amber-200";

  const label = active ? "Activo" : expired ? "Expirado" : pending ? "Pendiente" : "Invitado";

  return (
    <div className="text-sm">
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}>
        {label}
      </span>
      {!active && expiresAt ? <p className="mt-1 text-xs text-muted">Vence {formatActivityTimestamp(expiresAt)}</p> : null}
    </div>
  );
}

function RoleBadge({ role, accountKind }: { role: string; accountKind?: "primary" | "subaccount" }) {
  const normalized = normalizePortalUserRole(role);
  if (accountKind === "primary" || normalized === "owner") {
    return <ActionPill label="Principal" tone="violet" />;
  }
  if (normalized === "manager") {
    return <ActionPill label="Manager" tone="violet" />;
  }
  if (normalized === "seller") {
    return <ActionPill label="Vendedor" tone="blue" />;
  }
  return <ActionPill label="Otros" tone="amber" />;
}

function MetricBlock({
  label,
  value,
  helper,
  accent
}: {
  label: string;
  value: string;
  helper: string;
  accent: "violet" | "blue" | "amber";
}) {
  const accents = {
    violet: "text-violet-300",
    blue: "text-sky-300",
    amber: "text-amber-300"
  } as const;
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">{label}</p>
      <p className={`text-2xl font-semibold ${accents[accent]}`}>{value}</p>
      <p className="text-sm leading-6 text-muted">{helper}</p>
    </div>
  );
}

function RoleCounter({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "violet" | "blue" | "amber";
}) {
  const toneClasses = {
    violet: "text-violet-300",
    blue: "text-sky-300",
    amber: "text-amber-300"
  } as const;
  return (
    <div className="rounded-[18px] border border-white/8 bg-surface/55 p-3 text-center">
      <p className={`text-3xl font-semibold ${toneClasses[tone]}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-white">{label}</span>
      {children}
    </label>
  );
}

function SidebarInfo({
  icon,
  title,
  copy,
  tone
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  tone: "violet" | "amber" | "blue" | "brand";
}) {
  const toneClass = {
    violet: "text-violet-300 border-violet-500/20 bg-violet-500/10",
    amber: "text-amber-300 border-amber-500/20 bg-amber-500/10",
    blue: "text-sky-300 border-sky-500/20 bg-sky-500/10",
    brand: "text-brandBright border-brand/20 bg-brand/10"
  } as const;

  return (
    <div className="rounded-[18px] border border-white/8 bg-surface/55 p-4">
      <div className="flex items-start gap-3">
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${toneClass[tone]}`}>{icon}</span>
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{copy}</p>
        </div>
      </div>
    </div>
  );
}

function ActionPill({ label, tone }: { label: string; tone: "violet" | "blue" | "amber" | "emerald" }) {
  const styles = {
    violet: "border-violet-500/20 bg-violet-500/10 text-violet-200",
    blue: "border-sky-500/20 bg-sky-500/10 text-sky-200",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
  } as const;
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${styles[tone]}`}>{label}</span>;
}

function ActionButton({
  label,
  icon,
  tone,
  onClick,
  disabled = false
}: {
  label: string;
  icon: React.ReactNode;
  tone: "neutral" | "danger" | "amber";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const styles = {
    neutral: "border-white/10 bg-white/5 text-white hover:bg-white/8",
    danger: "border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/15",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[tone]}`}
    >
      {icon}
    </button>
  );
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
