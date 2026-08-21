"use client";

import { memo, useCallback, useRef, useState, type DragEvent, type FormEvent } from "react";
import { Check, ImageIcon, Loader2, Search, Upload, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  applyPersistedProductImage,
  buildCatalogImagesQuery,
  CATALOG_IMAGE_ACCEPTED_TYPES,
  formatCatalogImageError,
  isCatalogImageWorkspaceData,
  resolveCatalogImagesPageCorrection,
  validateCatalogImageFile
} from "@/lib/catalog-images";
import type { PortalCatalogImageFilter, PortalCatalogImageWorkspaceData, PortalProduct } from "@/lib/api";
import { cn } from "@/lib/ui/cn";

type UploadPhase = "idle" | "uploading" | "success" | "error";

const FILTERS: Array<{ value: PortalCatalogImageFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "with_image", label: "Con imagen" },
  { value: "without_image", label: "Sin imagen" }
];

export function CatalogImagesWorkspace({
  initialData,
  readOnly,
  initialSearch = ""
}: {
  initialData: PortalCatalogImageWorkspaceData;
  readOnly: boolean;
  initialSearch?: string;
}) {
  const [data, setData] = useState(initialData);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [appliedSearch, setAppliedSearch] = useState(initialSearch);
  const [imageFilter, setImageFilter] = useState<PortalCatalogImageFilter>("all");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const loadProducts = useCallback(async (
    page: number,
    search: string,
    filter: PortalCatalogImageFilter,
    allowCorrection = true
  ) => {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setLoading(true);
    setLoadError(null);
    try {
      const query = buildCatalogImagesQuery({ search, imageFilter: filter, page });
      const response = await fetch(`/api/app/catalog/images?${query}`, { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (!response.ok || !isCatalogImageWorkspaceData(json)) {
        throw new Error(String(json?.error || "catalog_images_invalid_response"));
      }
      if (sequence !== requestSequence.current) return;
      const correctionPage = resolveCatalogImagesPageCorrection(page, json.pagination.totalPages);
      if (allowCorrection && correctionPage !== null) {
        await loadProducts(correctionPage, search, filter, false);
        return;
      }
      setData(json);
    } catch {
      if (sequence === requestSequence.current) {
        setLoadError("No pudimos cargar las imágenes del catálogo. Reintentá en unos segundos.");
      }
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, []);

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    setAppliedSearch(nextSearch);
    void loadProducts(1, nextSearch, imageFilter);
  };

  const changeFilter = (filter: PortalCatalogImageFilter) => {
    if (filter === imageFilter) return;
    setImageFilter(filter);
    void loadProducts(1, appliedSearch, filter);
  };

  const handlePersisted = useCallback((productId: string, image: NonNullable<PortalProduct["image"]>) => {
    setData((current) => applyPersistedProductImage(current, productId, image));
  }, []);

  const pageStart = data.pagination.totalItems === 0
    ? 0
    : (data.pagination.page - 1) * data.pagination.pageSize + 1;
  const pageEnd = data.pagination.totalItems === 0
    ? 0
    : Math.min(data.pagination.totalItems, pageStart + data.products.length - 1);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-3">
        <CatalogImageMetric label="Total" value={data.summary.totalProducts} icon={ImageIcon} />
        <CatalogImageMetric label="Con imagen" value={data.summary.withImage} icon={Check} tone="success" />
        <CatalogImageMetric label="Sin imagen" value={data.summary.withoutImage} icon={XCircle} tone="warning" />
      </section>

      <Card className="border-white/8 bg-card/90">
        <CardHeader>
          <div>
            <CardTitle className="text-xl">Buscar y priorizar</CardTitle>
            <CardDescription>Encontrá por nombre o SKU y trabajá una imagen por vez sin abandonar la página.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={applySearch}>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                className="h-11 pl-10"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar por nombre, SKU o código interno"
                aria-label="Buscar productos por nombre o SKU"
              />
            </div>
            <Button type="submit" disabled={loading}>Buscar</Button>
            {appliedSearch ? (
              <Button
                type="button"
                variant="ghost"
                disabled={loading}
                onClick={() => {
                  setSearchInput("");
                  setAppliedSearch("");
                  void loadProducts(1, "", imageFilter);
                }}
              >
                Limpiar
              </Button>
            ) : null}
          </form>
          <div className="flex flex-wrap gap-2" aria-label="Filtrar por estado de imagen">
            {FILTERS.map((filter) => (
              <Button
                key={filter.value}
                type="button"
                size="sm"
                variant={imageFilter === filter.value ? "primary" : "ghost"}
                disabled={loading}
                onClick={() => changeFilter(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {readOnly ? (
        <div className="rounded-2xl border border-yellow-400/25 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-100">
          Tu rol puede revisar imágenes, pero no cargarlas ni reemplazarlas.
        </div>
      ) : null}
      {loadError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <span>{loadError}</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => void loadProducts(data.pagination.page, appliedSearch, imageFilter)}>
            Reintentar
          </Button>
        </div>
      ) : null}

      <div className="relative min-h-48">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-start justify-center rounded-[26px] bg-background/70 pt-16 backdrop-blur-sm" role="status">
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-card px-4 py-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando productos...
            </span>
          </div>
        ) : null}
        {data.products.length === 0 ? (
          <div className="rounded-[26px] border border-dashed border-white/10 bg-card/70 p-10 text-center">
            <ImageIcon className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-3 font-medium">No hay productos para este criterio</p>
            <p className="mt-1 text-sm text-muted">Probá otra búsqueda o cambiá el filtro de imágenes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,190px),1fr))] gap-4">
            {data.products.map((product) => (
              <CatalogImageCard
                key={product.id}
                product={product}
                readOnly={readOnly}
                imageFilter={imageFilter}
                onPersisted={handlePersisted}
              />
            ))}
          </div>
        )}
      </div>

      <CatalogImagesPagination
        page={data.pagination.page}
        totalPages={data.pagination.totalPages}
        pageStart={pageStart}
        pageEnd={pageEnd}
        totalItems={data.pagination.totalItems}
        disabled={loading}
        onPage={(page) => void loadProducts(page, appliedSearch, imageFilter)}
      />
    </div>
  );
}

const CatalogImageCard = memo(function CatalogImageCard({
  product,
  readOnly,
  imageFilter,
  onPersisted
}: {
  product: PortalProduct;
  readOnly: boolean;
  imageFilter: PortalCatalogImageFilter;
  onPersisted: (productId: string, image: NonNullable<PortalProduct["image"]>) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const busyRef = useRef(false);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const uploadFile = async (file?: File | null) => {
    if (!file || readOnly || busyRef.current) return;
    const validationError = validateCatalogImageFile(file);
    if (validationError) {
      setPhase("error");
      setMessage(formatCatalogImageError(validationError));
      return;
    }

    busyRef.current = true;
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setPhase("uploading");
    setMessage("Subiendo y guardando...");
    try {
      await decodeCatalogImage(file, localPreview);
      const formData = new FormData();
      formData.set("file", file, file.name || "product-image");
      const uploadResponse = await fetch("/api/app/catalog/image-upload", { method: "POST", body: formData });
      const uploadJson = await uploadResponse.json().catch(() => null);
      if (!uploadResponse.ok || !uploadJson?.image?.url) {
        throw new Error(String(uploadJson?.error || "upload_failed"));
      }

      const image = {
        url: String(uploadJson.image.url),
        alt: product.image?.alt || product.name,
        source: "uploaded"
      };
      const saveResponse = await fetch(`/api/app/catalog/${encodeURIComponent(product.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image })
      });
      const saveJson = await saveResponse.json().catch(() => null);
      if (!saveResponse.ok || !saveJson?.product?.image?.url) {
        throw new Error(String(saveJson?.error || "save_failed"));
      }

      onPersisted(product.id, saveJson.product.image);
      setPreviewUrl(null);
      setPhase("success");
      setMessage(imageFilter === "without_image"
        ? "Guardado. La tarjeta queda fija hasta cambiar de página o filtro."
        : "Imagen guardada.");
    } catch (error) {
      setPreviewUrl(null);
      setPhase("error");
      setMessage(formatCatalogImageError(error instanceof Error ? error.message : error));
    } finally {
      URL.revokeObjectURL(localPreview);
      busyRef.current = false;
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (event.dataTransfer.files.length !== 1) {
      setPhase("error");
      setMessage("Elegí una sola imagen por producto.");
      return;
    }
    void uploadFile(event.dataTransfer.files[0]);
  };

  return (
    <article className="overflow-hidden rounded-[24px] border border-white/8 bg-card/90 shadow-[var(--card-shadow)]">
      <div
        className={cn(
          "relative aspect-square overflow-hidden border-b border-white/8 bg-[linear-gradient(145deg,rgba(255,255,255,0.045),rgba(255,122,0,0.045))] p-3 transition-colors",
          dragActive && "bg-brand/15 ring-2 ring-inset ring-brand"
        )}
        onDragEnter={(event) => { event.preventDefault(); if (!readOnly && phase !== "uploading") setDragActive(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false);
        }}
        onDrop={handleDrop}
      >
        <CatalogImageVisual imageUrl={previewUrl || product.image?.url || null} alt={product.image?.alt || product.name} />
        {phase === "uploading" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70" role="status">
            <span className="flex items-center gap-2 rounded-full bg-card px-3 py-2 text-xs font-medium">
              <Loader2 className="h-4 w-4 animate-spin" /> Subiendo...
            </span>
          </div>
        ) : null}
        {dragActive ? (
          <div className="absolute inset-3 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand bg-background/80 text-center text-sm font-medium">
            Soltá una imagen para {product.name}
          </div>
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        <div className="min-h-14">
          <p className="truncate text-xs font-medium uppercase tracking-[0.12em] text-muted">{product.internalCode || product.sku || "Sin código"}</p>
          <h2 className="mt-1 line-clamp-2 text-sm font-semibold leading-5">{product.name}</h2>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Badge variant={product.image?.url ? "success" : "muted"}>{product.image?.url ? "Con imagen" : "Sin imagen"}</Badge>
          {phase === "success" ? <Check className="h-4 w-4 text-emerald-400" aria-label="Guardado" /> : null}
          {phase === "error" ? <XCircle className="h-4 w-4 text-red-400" aria-label="Error" /> : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={CATALOG_IMAGE_ACCEPTED_TYPES.join(",")}
          className="hidden"
          disabled={readOnly || phase === "uploading"}
          onChange={(event) => void uploadFile(event.target.files?.[0])}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full"
          disabled={readOnly || phase === "uploading"}
          onClick={() => inputRef.current?.click()}
          aria-label={`${product.image?.url ? "Cambiar" : "Cargar"} imagen de ${product.name}`}
        >
          <Upload className="mr-2 h-4 w-4" />
          {phase === "uploading" ? "Subiendo..." : product.image?.url ? "Cambiar imagen" : "Cargar imagen"}
        </Button>
        <p
          className={cn(
            "min-h-9 text-xs leading-4 text-muted",
            phase === "success" && "text-emerald-300",
            phase === "error" && "text-red-300"
          )}
          aria-live="polite"
        >
          {message || "JPG, PNG o WebP · máximo 4 MB"}
        </p>
      </div>
    </article>
  );
});

function CatalogImageVisual({ imageUrl, alt }: { imageUrl: string | null; alt: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!imageUrl || failedUrl === imageUrl) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-background/25 text-muted">
        <ImageIcon className="h-7 w-7" />
        <span className="mt-2 text-xs font-medium">Sin imagen</span>
      </div>
    );
  }
  return (
    <img
      src={imageUrl}
      alt={alt}
      className="h-full w-full rounded-2xl object-contain"
      loading="lazy"
      onError={() => setFailedUrl(imageUrl)}
    />
  );
}

function CatalogImageMetric({
  label,
  value,
  icon: Icon,
  tone = "neutral"
}: {
  label: string;
  value: number;
  icon: typeof ImageIcon;
  tone?: "neutral" | "success" | "warning";
}) {
  return (
    <div className="flex items-center justify-between rounded-[22px] border border-white/8 bg-card/90 px-4 py-4">
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </div>
      <Icon className={cn("h-5 w-5 text-muted", tone === "success" && "text-emerald-400", tone === "warning" && "text-amber-400")} />
    </div>
  );
}

function CatalogImagesPagination({
  page,
  totalPages,
  pageStart,
  pageEnd,
  totalItems,
  disabled,
  onPage
}: {
  page: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  totalItems: number;
  disabled: boolean;
  onPage: (page: number) => void;
}) {
  return (
    <div className="grid gap-3 rounded-[22px] border border-white/8 bg-card/90 px-4 py-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      <p className="text-sm text-muted">Mostrando {pageStart}-{pageEnd} de {totalItems}</p>
      <p className="text-center text-sm font-medium">Página {Math.max(page, 1)} de {Math.max(totalPages, 1)}</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)} aria-label="Página anterior">
          ←
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={disabled || totalPages === 0 || page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Página siguiente">
          →
        </Button>
      </div>
    </div>
  );
}

async function decodeCatalogImage(file: File, previewUrl: string) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
    } catch {
      throw new Error("corrupt_image");
    }
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("corrupt_image"));
    image.src = previewUrl;
  });
}
