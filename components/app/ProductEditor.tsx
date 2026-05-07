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
import { getDiscountedPrice } from "@/lib/product-pricing";

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
  subcategory: string;
  imageUrl: string;
  imageAlt: string;
  expirationDate: string;
  discountPercentage: string;
  attributesText: string;
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
    categoryId: product.categoryId || "",
    subcategory: product.subcategory || "",
    imageUrl: product.image?.url || "",
    imageAlt: product.image?.alt || "",
    expirationDate: product.expirationDate || "",
    discountPercentage: product.discountPercentage != null ? String(product.discountPercentage) : "",
    attributesText: formatAttributesText(product.attributes)
  };
}

export function ProductEditor({ product }: { product: PortalProduct }) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProductDraft>(buildInitialState(product));
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<PortalProductCategory[]>([]);
  const image = buildCatalogImagePayload(draft.imageUrl, draft.imageAlt);

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
    const discountPercentage = draft.discountPercentage.trim() ? Number(draft.discountPercentage) : null;
    const attributes = parseAttributesText(draft.attributesText);

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
    if (draft.imageUrl.trim() && !image) {
      toast.error("Imagen invalida", "Ingresa una URL valida con http o https para la imagen principal.");
      return;
    }
    if (discountPercentage !== null && (!Number.isFinite(discountPercentage) || discountPercentage <= 0 || discountPercentage > 100)) {
      toast.error("Descuento invalido", "Ingresa un descuento mayor a 0 y menor o igual a 100.");
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
          subcategory: draft.subcategory.trim() || null,
          attributes,
          image,
          expirationDate: draft.expirationDate || null,
          discountPercentage,
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
          <Input
            placeholder="Subcategoria"
            value={draft.subcategory}
            onChange={(event) => setDraft((current) => ({ ...current, subcategory: event.target.value }))}
            disabled={saving}
          />
          <Input
            className="md:col-span-2"
            placeholder="Imagen principal URL (https://...)"
            value={draft.imageUrl}
            onChange={(event) => setDraft((current) => ({ ...current, imageUrl: event.target.value }))}
            disabled={saving}
          />
          <Input
            className="md:col-span-2"
            placeholder="Texto alternativo de la imagen"
            value={draft.imageAlt}
            onChange={(event) => setDraft((current) => ({ ...current, imageAlt: event.target.value }))}
            disabled={saving}
          />
          <Input
            type="date"
            value={draft.expirationDate}
            onChange={(event) => setDraft((current) => ({ ...current, expirationDate: event.target.value }))}
            disabled={saving}
          />
          <Input
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="Descuento %"
            value={draft.discountPercentage}
            onChange={(event) => setDraft((current) => ({ ...current, discountPercentage: event.target.value }))}
            disabled={saving}
          />
          <Textarea
            className="md:col-span-2"
            rows={6}
            placeholder="Descripcion comercial del producto"
            value={draft.description}
            onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            disabled={saving}
          />
          <Textarea
            className="md:col-span-2"
            rows={4}
            placeholder={"Atributos configurables (uno por linea)\nTalle: M, L, XL\nColor: Negro, Blanco"}
            value={draft.attributesText}
            onChange={(event) => setDraft((current) => ({ ...current, attributesText: event.target.value }))}
            disabled={saving}
          />
          <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 text-sm text-muted md:col-span-2">
            <p className="font-medium text-text">Preview de imagen</p>
            <div className="mt-3 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-bg/60">
              <CatalogProductImagePreview image={image} name={draft.name} />
            </div>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 text-sm text-muted md:col-span-2">
            Precio final visible: {new Intl.NumberFormat("es-AR", { style: "currency", currency: draft.currency || "ARS", maximumFractionDigits: 2 }).format(
              getDiscountedPrice(Number(draft.price || 0), draft.discountPercentage).finalPrice
            )}
          </div>
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

function parseAttributesText(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [namePart, optionsPart = ""] = line.split(":");
      return {
        name: namePart?.trim() || "",
        options: optionsPart
          .split(",")
          .map((option) => option.trim())
          .filter(Boolean)
      };
    })
    .filter((attribute) => attribute.name && attribute.options.length > 0);
}

function formatAttributesText(attributes?: PortalProduct["attributes"]) {
  if (!Array.isArray(attributes) || attributes.length === 0) return "";
  return attributes
    .filter((attribute) => attribute?.name && Array.isArray(attribute.options) && attribute.options.length > 0)
    .map((attribute) => `${attribute.name}: ${attribute.options.join(", ")}`)
    .join("\n");
}

function buildCatalogImagePayload(imageUrl: string, imageAlt: string) {
  const rawUrl = String(imageUrl || "").trim();
  if (!rawUrl) return null;

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return {
      url: parsed.toString(),
      alt: String(imageAlt || "").trim() || null,
      source: "external_url"
    };
  } catch {
    return null;
  }
}

function CatalogProductImagePreview({
  image,
  name
}: {
  image: { url: string; alt?: string | null } | null;
  name: string;
}) {
  if (image?.url) {
    return <img src={image.url} alt={image.alt || name || "Imagen del producto"} className="aspect-[16/10] w-full object-cover" loading="lazy" />;
  }

  return (
    <div className="flex aspect-[16/10] w-full items-center justify-center bg-[linear-gradient(135deg,rgba(176,80,0,0.18),rgba(255,255,255,0.04))] text-sm font-medium text-muted">
      Preview no disponible
    </div>
  );
}
