"use client";

import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, FileText, ImageIcon, Layers3, Package2, Save, Upload, Wallet } from "lucide-react";
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
  brand: string;
  subcategory: string;
  imageUrl: string;
  imageAlt: string;
  imageSource: "external_url" | "uploaded";
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
    brand: product.brand || "",
    subcategory: product.subcategory || "",
    imageUrl: product.image?.url || "",
    imageAlt: product.image?.alt || "",
    imageSource: product.image?.source === "uploaded" ? "uploaded" : "external_url",
    expirationDate: product.expirationDate || "",
    discountPercentage: product.discountPercentage != null ? String(product.discountPercentage) : "",
    attributesText: formatAttributesText(product.attributes)
  };
}

export function ProductEditor({ product }: { product: PortalProduct }) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProductDraft>(buildInitialState(product));
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categories, setCategories] = useState<PortalProductCategory[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const image = buildCatalogImagePayload(draft.imageUrl, draft.imageAlt, draft.imageSource);
  const finalPrice = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: draft.currency || "ARS",
    maximumFractionDigits: 2
  }).format(getDiscountedPrice(Number(draft.price || 0), draft.discountPercentage).finalPrice);

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

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.set("file", file, file.name || "product-image");

      const response = await fetch("/api/app/catalog/image-upload", {
        method: "POST",
        body: formData
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.image?.url) {
        throw new Error(String(json?.error || "No se pudo subir la imagen."));
      }

      setDraft((current) => ({
        ...current,
        imageUrl: String(json.image.url || ""),
        imageSource: "uploaded"
      }));
      toast.success("Imagen subida", "La imagen ya quedo lista para este producto.");
    } catch (error) {
      toast.error("No se pudo subir la imagen", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setUploadingImage(false);
    }
  }

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
          brand: draft.brand.trim() || null,
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
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.22fr)_380px]">
        <div className="space-y-6">
          <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.94))] shadow-[0_20px_50px_rgba(3,8,16,0.22)]">
            <CardHeader action={<Badge variant="warning">Editable</Badge>}>
              <div>
                <CardTitle className="text-xl">Informacion general</CardTitle>
                <CardDescription>Actualiza la identidad comercial, clasificacion y estado operativo del producto.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 pt-0 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2 xl:col-span-2">
                <label className="text-sm font-medium">Nombre del producto</label>
                <Input placeholder="Ej. Plan Empresa" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} disabled={saving || uploadingImage} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">SKU</label>
                <Input placeholder="Ej. PLAN-PRO" value={draft.sku} onChange={(event) => setDraft((current) => ({ ...current, sku: event.target.value }))} disabled={saving || uploadingImage} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria</label>
                <select
                  className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                  value={draft.categoryId}
                  onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))}
                  disabled={saving || uploadingImage}
                >
                  <option value="">Sin categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}{category.isActive ? "" : " · Inactiva"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Subcategoria</label>
                <Input
                  placeholder="Ej. Premium"
                  value={draft.subcategory}
                  onChange={(event) => setDraft((current) => ({ ...current, subcategory: event.target.value }))}
                  disabled={saving || uploadingImage}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Marca</label>
                <Input
                  placeholder="Ej. NovaTech"
                  value={draft.brand}
                  onChange={(event) => setDraft((current) => ({ ...current, brand: event.target.value }))}
                  disabled={saving || uploadingImage}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <select
                  className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                  value={draft.status}
                  onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
                  disabled={saving || uploadingImage}
                >
                  <option value="active">Activo</option>
                  <option value="archived">Archivado</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.94))] shadow-[0_20px_50px_rgba(3,8,16,0.22)]">
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-surface/70 text-brandBright">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <CardTitle className="text-xl">Descripcion</CardTitle>
                  <CardDescription>Cuenta que es tu producto, que incluye y como se presenta para el equipo comercial.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <label className="text-sm font-medium">Descripcion comercial</label>
              <Textarea
                className="min-h-[180px]"
                rows={7}
                placeholder="Describe beneficios, contexto y detalles operativos del producto."
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                disabled={saving || uploadingImage}
              />
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.94))] shadow-[0_20px_50px_rgba(3,8,16,0.22)]">
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-surface/70 text-brandBright">
                  <Wallet className="h-4 w-4" />
                </span>
                <div>
                  <CardTitle className="text-xl">Precio e inventario</CardTitle>
                  <CardDescription>Define precio base, descuento, stock y configuracion fiscal sin salir del catalogo.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 pt-0 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Precio base</label>
                <Input type="number" step="0.01" min="0" placeholder="0" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} disabled={saving || uploadingImage} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Moneda</label>
                <Input placeholder="ARS" maxLength={3} value={draft.currency} onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} disabled={saving || uploadingImage} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">IVA %</label>
                <Input type="number" step="0.01" min="0" placeholder="0" value={draft.vatRate} onChange={(event) => setDraft((current) => ({ ...current, vatRate: event.target.value }))} disabled={saving || uploadingImage} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Stock disponible</label>
                <Input type="number" step="1" min="0" placeholder="0" value={draft.stock} onChange={(event) => setDraft((current) => ({ ...current, stock: event.target.value }))} disabled={saving || uploadingImage} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Descuento %</label>
                <Input type="number" step="0.01" min="0" max="100" placeholder="0" value={draft.discountPercentage} onChange={(event) => setDraft((current) => ({ ...current, discountPercentage: event.target.value }))} disabled={saving || uploadingImage} />
              </div>
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Precio final visible</p>
                <p className="mt-3 text-lg font-semibold">{finalPrice}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.94))] shadow-[0_20px_50px_rgba(3,8,16,0.22)]">
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-surface/70 text-brandBright">
                  <CalendarClock className="h-4 w-4" />
                </span>
                <div>
                  <CardTitle className="text-xl">Vencimiento</CardTitle>
                  <CardDescription>Usalo cuando el producto tenga control por fecha o descuentos estacionales.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha de vencimiento</label>
                <Input type="date" value={draft.expirationDate} onChange={(event) => setDraft((current) => ({ ...current, expirationDate: event.target.value }))} disabled={saving || uploadingImage} />
              </div>
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 text-sm text-muted">
                {draft.expirationDate
                  ? "El producto muestra una fecha cargada y puede seguir el circuito de control vigente."
                  : "Todavia no hay una fecha de vencimiento definida para este producto."}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] shadow-[0_22px_52px_rgba(3,8,16,0.24)]">
            <CardHeader action={<Badge variant={draft.status === "active" ? "success" : "muted"}>{draft.status === "active" ? "Activo" : "Archivado"}</Badge>}>
              <div>
                <CardTitle className="text-xl">Vista previa del producto</CardTitle>
                <CardDescription>Asi se ve el producto con la informacion actual que estas editando.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(176,80,0,0.32),transparent_38%),linear-gradient(135deg,rgba(34,19,8,0.92),rgba(13,21,33,0.98))]">
                <CatalogProductImagePreview image={image} name={draft.name} />
              </div>
              <div className="space-y-3 rounded-[24px] border border-white/8 bg-surface/55 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  {draft.categoryId ? <Badge variant="warning">{categories.find((category) => category.id === draft.categoryId)?.name || "Categoria"}</Badge> : null}
                  {draft.subcategory ? <Badge variant="muted">{draft.subcategory}</Badge> : null}
                  {draft.brand ? <Badge variant="outline">{draft.brand}</Badge> : null}
                </div>
                <div>
                  <p className="text-2xl font-semibold leading-tight">{draft.name || "Nombre del producto"}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{draft.description.trim() || "Sin descripcion comercial cargada todavia."}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <PreviewStat label="Precio final" value={finalPrice} />
                  <PreviewStat label="Stock actual" value={`${Number(draft.stock || 0)} unidades`} />
                  <PreviewStat label="SKU" value={draft.sku || "Sin codigo"} />
                  <PreviewStat label="IVA" value={`${Number(draft.vatRate || 0)}%`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] shadow-[0_22px_52px_rgba(3,8,16,0.24)]">
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-surface/70 text-brandBright">
                  <ImageIcon className="h-4 w-4" />
                </span>
                <div>
                  <CardTitle className="text-xl">Imagen del producto</CardTitle>
                  <CardDescription>Subi o reemplaza la imagen principal sin salir del editor.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="overflow-hidden rounded-[24px] border border-white/8 bg-surface/45">
                <CatalogProductImagePreview image={image} name={draft.name} />
              </div>
              <div className="rounded-[22px] border border-dashed border-white/12 bg-surface/45 p-4">
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void handleImageUpload(event)} />
                <Button type="button" variant="secondary" className="w-full rounded-2xl" onClick={() => fileInputRef.current?.click()} disabled={saving || uploadingImage}>
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadingImage ? "Subiendo imagen..." : "Subir nueva imagen"}
                </Button>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {draft.imageSource === "uploaded" ? "La imagen actual ya esta guardada en Opturon." : "Acepta JPG, PNG o WebP y se usa como imagen principal del producto."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] shadow-[0_22px_52px_rgba(3,8,16,0.24)]">
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-surface/70 text-brandBright">
                  <Layers3 className="h-4 w-4" />
                </span>
                <div>
                  <CardTitle className="text-xl">Atributos configurables</CardTitle>
                  <CardDescription>Define variantes u opciones comerciales usando el mismo formato ya soportado por el producto.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <label className="text-sm font-medium">Atributos</label>
              <Textarea
                className="min-h-[160px]"
                rows={6}
                placeholder={"Atributos configurables (uno por linea)\nTalle: M, L, XL\nColor: Negro, Blanco"}
                value={draft.attributesText}
                onChange={(event) => setDraft((current) => ({ ...current, attributesText: event.target.value }))}
                disabled={saving || uploadingImage}
              />
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] shadow-[0_22px_52px_rgba(3,8,16,0.24)]">
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-surface/70 text-brandBright">
                  <Package2 className="h-4 w-4" />
                </span>
                <div>
                  <CardTitle className="text-xl">Informacion adicional</CardTitle>
                  <CardDescription>Campos complementarios para mejorar la lectura interna y la presentacion del producto.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-2">
                <label className="text-sm font-medium">Texto alternativo de la imagen</label>
                <Input placeholder="Ej. Banner Plan Empresa" value={draft.imageAlt} onChange={(event) => setDraft((current) => ({ ...current, imageAlt: event.target.value }))} disabled={saving || uploadingImage} />
              </div>
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 text-sm text-muted">
                Este editor mantiene intactos precio, stock, imagen, categoria, descuento y atributos usando los mismos handlers del catalogo actual.
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-brand/20 bg-[linear-gradient(180deg,rgba(33,22,14,0.92),rgba(12,17,26,0.98))] shadow-[0_24px_60px_rgba(176,80,0,0.12)]">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Guardar cambios</CardTitle>
                <CardDescription>Cuando termines, el producto vuelve a su detalle con la informacion actualizada.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <Button type="submit" className="w-full rounded-2xl" disabled={saving || uploadingImage}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Guardar producto"}
              </Button>
              <Button type="button" variant="secondary" className="w-full rounded-2xl" onClick={() => router.push(`/app/catalog/${product.id}`)} disabled={saving || uploadingImage}>
                Volver al detalle
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-bg/45 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
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

function buildCatalogImagePayload(imageUrl: string, imageAlt: string, imageSource: "external_url" | "uploaded") {
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
      source: imageSource === "uploaded" ? "uploaded" : "external_url"
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
