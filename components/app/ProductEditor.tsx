"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { PortalProduct, PortalProductCategory } from "@/lib/api";

type ProductDraft = {
  name: string;
  description: string;
  sku: string;
  price: string;
  stock: string;
  currency: string;
  vatRate: string;
  status: string;
  categoryId: string;
};

function buildInitialState(product: PortalProduct): ProductDraft {
  return {
    name: product.name || "",
    description: product.description || "",
    sku: product.sku || "",
    price: String(product.price ?? product.unitPrice ?? 0),
    stock: String(product.stock ?? 0),
    currency: product.currency || "ARS",
    vatRate: String(product.vatRate ?? product.taxRate ?? 0),
    status: product.status || "active",
    categoryId: product.categoryId || ""
  };
}

export function ProductEditor({ product }: { product: PortalProduct }) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProductDraft>(buildInitialState(product));
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<PortalProductCategory[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const response = await fetch("/api/app/catalog/categories?includeInactive=true", { cache: "no-store" });
        const json = await response.json().catch(() => null);
        if (!response.ok) throw new Error(String(json?.error || "No se pudieron cargar las categorias."));
        if (!cancelled) {
          setCategories(Array.isArray(json?.categories) ? json.categories : []);
        }
      } catch {
        if (!cancelled) setCategories([]);
      }
    }

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = draft.name.trim();
    const sku = draft.sku.trim();
    const price = Number(draft.price);
    const stock = Number(draft.stock || 0);
    const vatRate = Number(draft.vatRate || 0);

    if (!name) {
      toast.error("Nombre requerido", "Completa el nombre del producto antes de guardar.");
      return;
    }
    if (sku && sku.length > 64) {
      toast.error("Codigo invalido", "El codigo o SKU no puede superar los 64 caracteres.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Precio invalido", "Ingresa un precio valido mayor o igual a cero.");
      return;
    }
    if (!Number.isFinite(vatRate) || vatRate < 0) {
      toast.error("IVA invalido", "Ingresa una alicuota valida mayor o igual a cero.");
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      toast.error("Stock invalido", "Ingresa un stock valido mayor o igual a cero.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/app/catalog/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: draft.description.trim() || null,
          sku: sku || null,
          categoryId: draft.categoryId || null,
          price,
          stock,
          currency: draft.currency.trim().toUpperCase() || "ARS",
          vatRate,
          status: draft.status
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || "No se pudo actualizar el producto."));
      }

      toast.success("Producto actualizado", "Los cambios ya quedaron guardados en el catalogo.");
      router.push(`/app/catalog/${product.id}`);
      router.refresh();
    } catch (error) {
      toast.error("No se pudo guardar el producto", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={submitProduct}>
      <Card className="border-white/6 bg-card/90">
        <CardHeader action={<Badge variant="warning">Editable</Badge>}>
          <div>
            <CardTitle className="text-xl">Editar producto</CardTitle>
            <CardDescription>Actualiza informacion comercial basica sin salir del portal.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
          <Input placeholder="Nombre del producto" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} disabled={saving} />
          <Input placeholder="Codigo / SKU" value={draft.sku} onChange={(event) => setDraft((current) => ({ ...current, sku: event.target.value }))} disabled={saving} />
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="Precio"
            value={draft.price}
            onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))}
            disabled={saving}
          />
          <Input
            type="number"
            step="1"
            min="0"
            placeholder="Stock disponible"
            value={draft.stock}
            onChange={(event) => setDraft((current) => ({ ...current, stock: event.target.value }))}
            disabled={saving}
          />
          <Input placeholder="Moneda" maxLength={3} value={draft.currency} onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} disabled={saving} />
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="IVA %"
            value={draft.vatRate}
            onChange={(event) => setDraft((current) => ({ ...current, vatRate: event.target.value }))}
            disabled={saving}
          />
          <select
            className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
            value={draft.status}
            onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
            disabled={saving}
          >
            <option value="active">Activo</option>
            <option value="archived">Archivado</option>
          </select>
          <select
            className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
            value={draft.categoryId}
            onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))}
            disabled={saving}
          >
            <option value="">Sin categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}{category.isActive ? "" : " · Inactiva"}
              </option>
            ))}
          </select>
          <Textarea
            className="md:col-span-2"
            rows={6}
            placeholder="Descripcion comercial del producto"
            value={draft.description}
            onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            disabled={saving}
          />
        </CardContent>
      </Card>

      <Card className="border-white/6 bg-card/90">
        <CardHeader>
          <div>
            <CardTitle className="text-xl">Guardar cambios</CardTitle>
            <CardDescription>Cuando termines, vuelve al detalle del producto para seguir operando en catalogo.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Button type="submit" className="w-full rounded-2xl" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando..." : "Guardar producto"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
