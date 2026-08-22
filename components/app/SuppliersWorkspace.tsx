"use client";

import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { InventorySectionNav } from "@/components/app/InventorySectionNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { PortalSupplier } from "@/lib/api";

type SupplierStatusFilter = "all" | "active" | "inactive";

type SupplierDraft = {
  legalName: string;
  tradeName: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
};

const EMPTY_DRAFT: SupplierDraft = {
  legalName: "",
  tradeName: "",
  taxId: "",
  email: "",
  phone: "",
  address: "",
  notes: ""
};

function buildDraft(supplier?: PortalSupplier | null): SupplierDraft {
  return {
    legalName: supplier?.legalName || "",
    tradeName: supplier?.tradeName || "",
    taxId: supplier?.taxId || "",
    email: supplier?.email || "",
    phone: supplier?.phone || "",
    address: supplier?.address || "",
    notes: supplier?.notes || ""
  };
}

export function SuppliersWorkspace({
  initialSuppliers,
  readOnly = false,
  canBulkAdjust = false
}: {
  initialSuppliers: PortalSupplier[];
  readOnly?: boolean;
  canBulkAdjust?: boolean;
}) {
  const [suppliers, setSuppliers] = useState(Array.isArray(initialSuppliers) ? initialSuppliers : []);
  const [selectedId, setSelectedId] = useState<string | null>(initialSuppliers[0]?.id || null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SupplierStatusFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SupplierDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<PortalSupplier | null>(initialSuppliers[0] || null);

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === selectedId) || null,
    [selectedId, suppliers]
  );

  useEffect(() => {
    let cancelled = false;
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }

    async function loadDetail() {
      const supplierId = selectedId;
      if (!supplierId) return;
      try {
        const detail = await reloadSupplier(supplierId);
        if (!cancelled) setSelectedDetail(detail);
      } catch {
        if (!cancelled) {
          setSelectedDetail(suppliers.find((supplier) => supplier.id === supplierId) || null);
        }
      }
    }

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedId, suppliers]);

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      if (statusFilter !== "all" && supplier.status !== statusFilter) return false;
      if (!query) return true;
      const haystack = [supplier.legalName, supplier.tradeName, supplier.taxId, supplier.email, supplier.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [search, statusFilter, suppliers]);

  const metrics = useMemo(() => {
    const active = suppliers.filter((supplier) => supplier.status === "active").length;
    const inactive = suppliers.filter((supplier) => supplier.status === "inactive").length;
    return { total: suppliers.length, active, inactive };
  }, [suppliers]);

  function openCreate() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setFormOpen(true);
  }

  function openEdit(supplier: PortalSupplier) {
    setEditingId(supplier.id);
    setDraft(buildDraft(supplier));
    setFormOpen(true);
  }

  async function reloadSupplier(supplierId: string) {
    const response = await fetch(`/api/app/suppliers/${encodeURIComponent(supplierId)}`, { cache: "no-store" });
    const json = await response.json().catch(() => null);
    if (!response.ok) throw new Error(String(json?.error || "supplier_reload_failed"));
    return json?.supplier as PortalSupplier;
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.legalName.trim()) {
      toast.error("Razón social requerida", "Completa la razón social antes de guardar.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(editingId ? `/api/app/suppliers/${encodeURIComponent(editingId)}` : "/api/app/suppliers", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalName: draft.legalName.trim(),
          tradeName: draft.tradeName.trim() || null,
          taxId: draft.taxId.trim() || null,
          email: draft.email.trim() || null,
          phone: draft.phone.trim() || null,
          address: draft.address.trim() || null,
          notes: draft.notes.trim() || null
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(json?.error || "supplier_save_failed"));

      const supplier = (json?.supplier || json?.data) as PortalSupplier;
      setSuppliers((current) => {
        const next = editingId ? current.map((item) => (item.id === supplier.id ? supplier : item)) : [supplier, ...current];
        return [...next].sort((left, right) => left.displayName.localeCompare(right.displayName, "es"));
      });
      setSelectedId(supplier.id);
      setSelectedDetail(supplier);
      setFormOpen(false);
      setDraft(EMPTY_DRAFT);
      toast.success(editingId ? "Proveedor actualizado" : "Proveedor creado", "Los cambios ya quedaron guardados.");
    } catch (error) {
      toast.error("No se pudo guardar el proveedor", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(supplier: PortalSupplier, nextStatus: "active" | "inactive") {
    setStatusUpdatingId(supplier.id);
    try {
      const response = await fetch(`/api/app/suppliers/${encodeURIComponent(supplier.id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(json?.error || "supplier_status_failed"));
      const updated = await reloadSupplier(supplier.id);
      setSuppliers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedDetail(updated);
      if (selectedId === updated.id) setSelectedId(updated.id);
      toast.success(nextStatus === "inactive" ? "Proveedor desactivado" : "Proveedor reactivado", "El estado ya quedó actualizado.");
    } catch (error) {
      toast.error("No se pudo actualizar el estado", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setStatusUpdatingId(null);
    }
  }

  return (
    <ClientPageShell
      title="Proveedores"
      description="Maestro operativo multi-tenant para centralizar proveedores habituales y preparar las próximas fases de compras."
      badge="Inventario"
      backHref="/app/inventory"
      backLabel="Volver a Inventario"
    >
      <div className="min-w-0 max-w-full space-y-6">
        <InventorySectionNav canBulkAdjust={canBulkAdjust} />

        <section className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Total" value={String(metrics.total)} helper="Proveedores cargados en este tenant." />
          <MetricCard label="Activos" value={String(metrics.active)} helper="Disponibles para nuevas asociaciones." />
          <MetricCard label="Inactivos" value={String(metrics.inactive)} helper="Mantienen lectura histórica, sin nuevas selecciones." />
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="border-white/8 bg-card/90">
            <CardHeader
              action={
                !readOnly ? (
                  <Button type="button" onClick={openCreate}>
                    Nuevo proveedor
                  </Button>
                ) : null
              }
            >
              <div>
                <CardTitle className="text-xl">Listado</CardTitle>
                <CardDescription>Busca, filtra y gestiona el estado operativo de cada proveedor.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] [&_select]:w-full [&_select]:min-w-0 [&_select]:max-w-full">
                <Input placeholder="Buscar por nombre, fiscal o contacto..." value={search} onChange={(event) => setSearch(event.target.value)} />
                <select
                  className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as SupplierStatusFilter)}
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
                <Button type="button" variant="ghost" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
                  Limpiar
                </Button>
              </div>

              {filteredSuppliers.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[color:var(--border)] bg-surface/35 p-8 text-center">
                  <p className="text-lg font-medium">Todavía no hay proveedores para este filtro.</p>
                  <p className="mt-2 text-sm text-muted">Crea el primer proveedor para asociarlo luego a productos del mismo tenant.</p>
                  {!readOnly ? (
                    <Button type="button" className="mt-4" onClick={openCreate}>
                      Nuevo proveedor
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSuppliers.map((supplier) => {
                    const selected = supplier.id === selectedId;
                    return (
                      <button
                        key={supplier.id}
                        type="button"
                        className={`w-full rounded-3xl border p-4 text-left transition ${selected ? "border-brand/40 bg-brand/10" : "border-[color:var(--border)] bg-surface/45"}`}
                        onClick={() => setSelectedId(supplier.id)}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="break-words text-sm font-semibold">{supplier.legalName}</p>
                              {supplier.tradeName ? <Badge variant="outline">{supplier.tradeName}</Badge> : null}
                              <Badge variant={supplier.status === "active" ? "success" : "muted"}>{supplier.status === "active" ? "Activo" : "Inactivo"}</Badge>
                            </div>
                            <p className="text-sm text-muted">
                              {[supplier.taxId, supplier.phone, supplier.email].filter(Boolean).join(" · ") || "Sin identificación ni contacto cargado."}
                            </p>
                            <p className="text-xs text-muted">
                              {supplier.linkedProductsCount || 0} producto{supplier.linkedProductsCount === 1 ? "" : "s"} vinculados · actualizado {formatRelativeDate(supplier.updatedAt)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {!readOnly ? (
                              <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(supplier)}>
                                Editar
                              </Button>
                            ) : null}
                            {!readOnly ? (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={statusUpdatingId === supplier.id}
                                onClick={() => void updateStatus(supplier, supplier.status === "active" ? "inactive" : "active")}
                              >
                                {supplier.status === "active" ? "Desactivar" : "Reactivar"}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-white/8 bg-card/90">
              <CardHeader
                action={
                  selectedSupplier ? (
                    <Badge variant={selectedSupplier.status === "active" ? "success" : "muted"}>
                      {selectedSupplier.status === "active" ? "Activo" : "Inactivo"}
                    </Badge>
                  ) : null
                }
              >
                <div>
                  <CardTitle className="text-xl">{selectedSupplier?.displayName || "Selecciona un proveedor"}</CardTitle>
                  <CardDescription>
                    {selectedSupplier ? "Detalle operativo y trazabilidad básica del proveedor." : "Elige un proveedor para ver su detalle."}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {selectedDetail ? (
                  <>
                    <DetailLine label="Razón social" value={selectedDetail.legalName} />
                    <DetailLine label="Nombre comercial" value={selectedDetail.tradeName || "Sin nombre comercial"} />
                    <DetailLine label="Identificación fiscal" value={selectedDetail.taxId || "Sin identificación fiscal"} />
                    <DetailLine label="Email" value={selectedDetail.email || "Sin email"} />
                    <DetailLine label="Teléfono" value={selectedDetail.phone || "Sin teléfono"} />
                    <DetailLine label="Dirección" value={selectedDetail.address || "Sin dirección"} />
                    <DetailLine label="Notas" value={selectedDetail.notes || "Sin notas"} />
                    <DetailLine label="Productos vinculados" value={String(selectedDetail.linkedProductsCount || 0)} />
                    <DetailLine label="Actualizado" value={formatRelativeDate(selectedDetail.updatedAt)} />
                    {selectedDetail.linkedProducts?.length ? (
                      <div className="rounded-2xl border border-[color:var(--border)] bg-surface/50 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted">Productos vinculados</p>
                        <div className="mt-3 space-y-2">
                          {selectedDetail.linkedProducts.map((product) => (
                            <div key={product.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/10 px-3 py-2 text-sm">
                              <span>{product.name}</span>
                              <span className="min-w-0 break-all text-right text-muted">{product.sku || product.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {selectedDetail.status === "inactive" ? (
                      <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                        Los productos existentes conservarán la referencia, pero el proveedor no podrá seleccionarse en nuevas asociaciones.
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-muted">No hay un proveedor seleccionado.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/8 bg-card/90">
              <CardHeader>
                <div>
                  <CardTitle className="text-xl">{editingId ? "Editar proveedor" : "Alta de proveedor"}</CardTitle>
                  <CardDescription>Formulario compacto para crear o actualizar el maestro sin tocar stock ni recepciones.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {formOpen ? (
                  <form className="space-y-4" onSubmit={submitForm}>
                    <Field label="Razón social">
                      <Input value={draft.legalName} onChange={(event) => setDraft((current) => ({ ...current, legalName: event.target.value }))} disabled={readOnly || saving} />
                    </Field>
                    <Field label="Nombre comercial">
                      <Input value={draft.tradeName} onChange={(event) => setDraft((current) => ({ ...current, tradeName: event.target.value }))} disabled={readOnly || saving} />
                    </Field>
                    <Field label="Identificación fiscal">
                      <Input value={draft.taxId} onChange={(event) => setDraft((current) => ({ ...current, taxId: event.target.value }))} disabled={readOnly || saving} />
                    </Field>
                    <Field label="Email">
                      <Input value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} disabled={readOnly || saving} />
                    </Field>
                    <Field label="Teléfono">
                      <Input value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} disabled={readOnly || saving} />
                    </Field>
                    <Field label="Dirección">
                      <Input value={draft.address} onChange={(event) => setDraft((current) => ({ ...current, address: event.target.value }))} disabled={readOnly || saving} />
                    </Field>
                    <Field label="Notas">
                      <Textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} disabled={readOnly || saving} />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" disabled={readOnly || saving}>{saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear proveedor"}</Button>
                      <Button type="button" variant="ghost" disabled={saving} onClick={() => { setFormOpen(false); setEditingId(null); setDraft(EMPTY_DRAFT); }}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted">Abre el formulario para crear un proveedor nuevo o editar el seleccionado.</p>
                    {!readOnly ? (
                      <Button type="button" onClick={() => selectedSupplier ? openEdit(selectedSupplier) : openCreate()}>
                        {selectedSupplier ? "Editar proveedor" : "Nuevo proveedor"}
                      </Button>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </ClientPageShell>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card className="border-white/8 bg-card/90">
      <CardContent className="space-y-2 p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
        <p className="text-3xl font-semibold">{value}</p>
        <p className="text-sm text-muted">{helper}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/50 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 break-words text-sm">{value}</p>
    </div>
  );
}

function formatRelativeDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
