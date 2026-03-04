"use client";

import { useState } from "react";

type UserRow = { id: string; email: string; name: string; tenantRole: string };

type Props = {
  initialUsers: UserRow[];
  canManage: boolean;
};

export function TenantUsersManager({ initialUsers, canManage }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState({ email: "", name: "", role: "viewer", password: "" });

  async function invite() {
    const response = await fetch("/api/app/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (!response.ok) return;
    const reload = await fetch("/api/app/users");
    if (!reload.ok) return;
    const json = await reload.json();
    setUsers(json.users || []);
    setForm({ email: "", name: "", role: "viewer", password: "" });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Usuarios cliente</h1>

      {canManage ? (
        <div className="rounded-2xl border border-[color:var(--border)] bg-card p-4">
          <h3 className="font-semibold">Invitar usuario</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <input className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="Nombre" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <input className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            <select className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
              <option value="owner">owner</option>
              <option value="manager">manager</option>
              <option value="editor">editor</option>
              <option value="viewer">viewer</option>
            </select>
            <input className="rounded-lg border border-[color:var(--border)] bg-bg p-2 text-sm" placeholder="Password temporal" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
          </div>
          <button onClick={invite} className="mt-3 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white">Invitar</button>
        </div>
      ) : (
        <p className="text-sm text-muted">Solo owner o manager pueden invitar usuarios.</p>
      )}

      <div className="overflow-hidden rounded-2xl border border-[color:var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Rol</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-[color:var(--border)]">
                <td className="px-4 py-3">{user.name}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{user.tenantRole}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

