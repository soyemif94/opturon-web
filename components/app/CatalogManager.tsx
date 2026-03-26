"use client";

import Link from "next/link";
import { type ComponentType, type FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, Boxes, CheckSquare, ChevronDown, ChevronUp, Package, PencilLine, ScanLine, Search, Trash2, Upload, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getInventoryAlerts, getStockState } from "@/lib/stock-state";
import { toast } from "@/components/ui/toast";

type Product = {
  id: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  price: number;
  currency?: string | null;
  stock?: number | null;
  stockQty?: number | null;
  status?: string | null;
  active?: boolean;
  categoryId?: string | null;
  categoryName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ProductCategory = {
  id: string;
  name: string;
  isActive: boolean;
};

type Draft = {
  name: string;
  description: string;
  sku: string;
  price: string;
  stock: string;
  currency: string;
  categoryId: string;
};

type BulkPreviewRow = {
  sourceRow: number;
  raw: string;
  name: string;
  sku: string;
  price: number | null;
  stock: number | null;
  description: string;
  categoryName: string;
  valid: boolean;
  error?: string;
};

type BulkApiResult = {
  row: number;
  status: "created" | "failed";
  productId?: string;
  code?: string;
};

type BulkDisplayResult = {
  sourceRow: number;
  status: "created" | "failed";
  productId?: string;
  code?: string;
};

type BulkResultSummary = {
  created: number;
  failed: number;
  results: BulkDisplayResult[];
};

type DeleteAttemptResult = {
  productId: string;
  ok: boolean;
  blocked: boolean;
  message?: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  description: "",
  sku: "",
  price: "",
  stock: "0",
  currency: "ARS",
  categoryId: ""
};

const BULK_EXAMPLE = [
  "Combo almuerzo | COMBO-01 | 12500 | 100 | Combo con hamburguesa, papas y bebida | Combos",
  "Pizza muzzarella | PIZZA-02 | 9800 | 40 | Pizza grande de 8 porciones | Pizzas",
  "Agua 500ml | AGUA-01 | 1500 | 200 | Botella individual"
].join("\n");

export function CatalogManager({ initialProducts, readOnly = false }: { initialProducts: Product[]; readOnly?: boolean }) {
  const [products, setProducts] = useState(Array.isArray(initialProducts) ? initialProducts : []);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialProducts[0]?.id || null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [bulkText, setBulkText] = useState("");
  const [bulkPreview, setBulkPreview] = useState<BulkPreviewRow[]>([]);
  const [bulkResult, setBulkResult] = useState<BulkResultSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | "warning"; text: string } | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [listExpanded, setListExpanded] = useState(true);
  const [categoryName, setCategoryName] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [categoryUpdatingId, setCategoryUpdatingId] = useState<string | null>(null);
  const [categoryDeletingId, setCategoryDeletingId] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedId) || null,
    [products, selectedId]
  );

  const metrics = useMemo(() => {
    const active = products.filter((product) => resolveStatus(product) === "active").length;
    const archived = products.length - active;
    const stockValue = products.reduce((sum, product) => sum + resolvePrice(product) * resolveStock(product), 0);
    return { total: products.length, active, archived, stockValue };
  }, [products]);
  const inventoryAlerts = useMemo(
    () =>
      getInventoryAlerts(products, {
        isActive: (product) => resolveStatus(product) === "active",
        getStock: (product) => resolveStock(product)
      }),
    [products]
  );
  const categoryProductCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      const categoryId = String(product.categoryId || "").trim();
      if (!categoryId) continue;
      counts.set(categoryId, (counts.get(categoryId) || 0) + 1);
    }
    return counts;
  }, [products]);
  const activeCategory = useMemo(
    () => categories.find((category) => category.id === categoryFilter) || null,
    [categories, categoryFilter]
  );
  const activeCategoryProductCount = activeCategory ? categoryProductCounts.get(activeCategory.id) || 0 : products.length;
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const categoryFiltered = categoryFilter
      ? products.filter((product) => String(product.categoryId || "") === categoryFilter)
      : products;
    if (!query) return categoryFiltered;
    return categoryFiltered.filter((product) => {
      const haystack = [product.name, product.sku, product.description].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }, [products, search, categoryFilter]);

  const validBulkRows = useMemo(() => bulkPreview.filter((row) => row.valid), [bulkPreview]);
  const allVisibleSelected = filteredProducts.length > 0 && filteredProducts.every((product) => selectedIds.includes(product.id));
  const selectedVisibleCount = filteredProducts.filter((product) => selectedIds.includes(product.id)).length;
  const hasActiveSearch = search.trim().length > 0;
  const isFilteredCategoryEmpty = Boolean(activeCategory && activeCategoryProductCount === 0);

  function hydrateDraft(product?: Product | null): Draft {
    return {
      name: product?.name || "",
      description: product?.description || "",
      sku: product?.sku || "",
      price: product ? String(resolvePrice(product)) : "",
      stock: product ? String(resolveStock(product)) : "0",
      currency: product?.currency || "ARS",
      categoryId: product?.categoryId || ""
    };
  }

  function openQuickCreate(prefillCategoryId?: string | null) {
    setMode("single");
    setDraft((current) => {
      const nextCategoryId = prefillCategoryId || "";
      const hasContent = Boolean(
        current.name.trim() ||
        current.description.trim() ||
        current.sku.trim() ||
        current.price.trim() ||
        (current.stock.trim() && current.stock.trim() !== "0")
      );

      if (!hasContent) {
        return {
          ...EMPTY_DRAFT,
          categoryId: nextCategoryId
        };
      }

      return {
        ...current,
        categoryId: current.categoryId || nextCategoryId
      };
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const response = await fetch("/api/app/catalog/categories?includeInactive=true", { cache: "no-store" });
        const json = await response.json().catch(() => null);
        if (!response.ok) throw new Error(String(json?.error || "No se pudieron cargar las categorias."));
        if (!cancelled) setCategories(Array.isArray(json?.categories) ? json.categories : []);
      } catch {
        if (!cancelled) setCategories([]);
      }
    }

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  async function reloadProducts(preferredId?: string | null) {
    const response = await fetch("/api/app/catalog", { cache: "no-store" });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(json?.error || "No se pudo refrescar el catalogo.");
    }

    const nextProducts = Array.isArray(json?.products) ? json.products : [];
    setProducts(nextProducts);
    setSelectedIds((current) => current.filter((id) => nextProducts.some((product: Product) => product.id === id)));

    const nextSelected =
      nextProducts.find((product: Product) => product.id === preferredId) ||
      nextProducts.find((product: Product) => product.id === selectedId) ||
      nextProducts[0] ||
      null;

    setSelectedId(nextSelected?.id || null);
    return nextSelected;
  }

  function toggleSelection(productId: string) {
    setSelectedIds((current) => (
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    ));
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !filteredProducts.some((product) => product.id === id)));
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);
      filteredProducts.forEach((product) => next.add(product.id));
      return Array.from(next);
    });
  }

  async function requestDelete(productId: string): Promise<DeleteAttemptResult> {
    const response = await fetch(`/api/app/catalog/${productId}`, {
      method: "DELETE"
    });

    if (response.ok) {
      return { productId, ok: true, blocked: false };
    }

    const json = await response.json().catch(() => null);
    return {
      productId,
      ok: false,
      blocked: json?.error === "product_delete_blocked",
      message: json?.error || "No se pudo eliminar el producto."
    };
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;
    setFeedback(null);
    setBulkResult(null);

    const price = Number(draft.price);
    const stock = Number.parseInt(draft.stock, 10);

    if (!draft.name.trim()) {
      setFeedback({ tone: "warning", text: "El producto necesita al menos un nombre." });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setFeedback({ tone: "warning", text: "El precio debe ser un numero valido." });
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      setFeedback({ tone: "warning", text: "El stock debe ser cero o mayor." });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/app/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          sku: draft.sku.trim() || null,
          price,
          vatRate: 0,
          stock,
          currency: draft.currency.trim() || "ARS",
          categoryId: draft.categoryId || null
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || "No se pudo guardar el producto.");
      }

      const nextSelected = await reloadProducts(json?.product?.id || undefined);
      setDraft(EMPTY_DRAFT);
      setFeedback({
        tone: "success",
        text: "Producto creado correctamente."
      });
      toast.success("Producto creado");
      if (nextSelected) setSelectedId(nextSelected.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el producto.";
      setFeedback({ tone: "error", text: message });
      toast.error("Error al guardar producto", message);
    } finally {
      setSaving(false);
    }
  }

  function startCreate(prefillCategoryId?: string | null) {
    setDraft({
      ...EMPTY_DRAFT,
      categoryId: prefillCategoryId || ""
    });
    setFeedback(null);
  }

  async function createCategory() {
    if (readOnly) return;
    const name = categoryName.trim();
    if (!name) {
      setFeedback({ tone: "warning", text: "La categoria necesita un nombre." });
      return;
    }

    setCategorySaving(true);
    try {
      const response = await fetch("/api/app/catalog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, isActive: true })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(json?.error || "No se pudo crear la categoria."));
      setCategories((current) => [...current, json.category].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryName("");
      setFeedback({ tone: "success", text: `Categoria creada: ${json.category.name}.` });
      toast.success("Categoria creada");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear la categoria.";
      setFeedback({ tone: "error", text: message });
      toast.error("Error al crear categoria", message);
    } finally {
      setCategorySaving(false);
    }
  }

  async function toggleCategory(category: ProductCategory) {
    if (readOnly) return;
    setCategoryUpdatingId(category.id);
    try {
      const response = await fetch(`/api/app/catalog/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: category.name, isActive: !category.isActive })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(json?.error || "No se pudo actualizar la categoria."));
      setCategories((current) => current.map((item) => (item.id === category.id ? json.category : item)));
      toast.success(category.isActive ? "Categoria desactivada" : "Categoria activada");
    } catch (error) {
      toast.error("Error al actualizar categoria", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setCategoryUpdatingId(null);
    }
  }

  function startCategoryEdit(category: ProductCategory) {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  }

  function cancelCategoryEdit() {
    setEditingCategoryId(null);
    setEditingCategoryName("");
  }

  async function saveCategoryRename(category: ProductCategory) {
    if (readOnly) return;
    const name = editingCategoryName.trim();
    if (!name) {
      setFeedback({ tone: "warning", text: "La categoria necesita un nombre." });
      return;
    }

    setCategoryUpdatingId(category.id);
    try {
      const response = await fetch(`/api/app/catalog/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, isActive: category.isActive })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(json?.error || "No se pudo renombrar la categoria."));
      setCategories((current) =>
        current
          .map((item) => (item.id === category.id ? json.category : item))
          .sort((left, right) => left.name.localeCompare(right.name))
      );
      setProducts((current) =>
        current.map((item) => (item.categoryId === category.id ? { ...item, categoryName: json.category.name } : item))
      );
      cancelCategoryEdit();
      toast.success("Categoria actualizada");
    } catch (error) {
      toast.error("Error al renombrar categoria", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setCategoryUpdatingId(null);
    }
  }

  async function deleteCategory(category: ProductCategory) {
    if (readOnly) return;

    const confirmed = window.confirm(`Se eliminara la categoria "${category.name}". Esta accion no se puede deshacer.`);
    if (!confirmed) return;

    setCategoryDeletingId(category.id);
    setFeedback(null);

    try {
      const response = await fetch(`/api/app/catalog/categories/${category.id}`, {
        method: "DELETE"
      });
      const json = await response.json().catch(() => null);

      if (!response.ok) {
        if (json?.error === "product_category_delete_blocked") {
          const count = Number(json?.details?.associatedProductsCount || 0);
          const message =
            count > 0
              ? `No se puede eliminar "${category.name}" porque todavia tiene ${count} producto${count === 1 ? "" : "s"} asociado${count === 1 ? "" : "s"}.`
              : `No se puede eliminar "${category.name}" porque todavia tiene productos asociados.`;
          throw new Error(message);
        }

        throw new Error(String(json?.error || "No se pudo eliminar la categoria."));
      }

      setCategories((current) => current.filter((item) => item.id !== category.id));
      if (categoryFilter === category.id) {
        setCategoryFilter("");
      }
      if (draft.categoryId === category.id) {
        setDraft((current) => ({ ...current, categoryId: "" }));
      }
      if (editingCategoryId === category.id) {
        cancelCategoryEdit();
      }
      setFeedback({ tone: "success", text: `Categoria eliminada: ${category.name}.` });
      toast.success("Categoria eliminada");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar la categoria.";
      setFeedback({ tone: "error", text: message });
      toast.error("Error al eliminar categoria", message);
    } finally {
      setCategoryDeletingId(null);
    }
  }

  function buildBulkPreview(text: string) {
    const rows = text
      .split(/\r?\n/)
      .map((rawLine, index) => ({ rawLine, sourceRow: index + 1 }))
      .filter(({ rawLine }) => rawLine.trim().length > 0)
      .map(({ rawLine, sourceRow }) => parseBulkRow(rawLine, sourceRow));

    setBulkPreview(rows);
    setBulkResult(null);

    if (!rows.length) {
      setFeedback({ tone: "warning", text: "Pega al menos una linea valida para previsualizar." });
      return;
    }

    const invalidCount = rows.filter((row) => !row.valid).length;
    setFeedback({
      tone: invalidCount > 0 ? "warning" : "success",
      text:
        invalidCount > 0
          ? `Preview lista: ${rows.length - invalidCount} filas validas y ${invalidCount} con error.`
          : `Preview lista: ${rows.length} filas validas para importar.`
    });
  }

  async function importBulkProducts() {
    if (readOnly) return;
    if (!validBulkRows.length) {
      setFeedback({ tone: "warning", text: "No hay filas validas para importar." });
      return;
    }

    setBulkImporting(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/app/catalog/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: validBulkRows.map((row) => ({
            name: row.name,
            sku: row.sku || null,
            price: row.price,
            stock: row.stock,
            description: row.description || null,
            categoryName: row.categoryName || null,
            currency: "ARS"
          }))
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || "No se pudieron importar los productos.");
      }

      const apiResults: BulkApiResult[] = Array.isArray(json?.results) ? json.results : [];
      const sourceRows = validBulkRows.map((row) => row.sourceRow);
      const mappedResults: BulkDisplayResult[] = apiResults.map((result) => ({
        ...result,
        sourceRow: sourceRows[result.row - 1] || result.row
      }));

      const summary: BulkResultSummary = {
        created: Number(json?.created || 0),
        failed: Number(json?.failed || 0),
        results: mappedResults
      };

      setBulkResult(summary);
      await reloadProducts();
      setFeedback({
        tone: summary.failed > 0 ? "warning" : "success",
        text:
          summary.failed > 0
            ? `Importacion parcial: ${summary.created} creados y ${summary.failed} fallidos.`
            : `Importacion completa: ${summary.created} productos creados.`
      });
      toast.success("Carga masiva procesada");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron importar los productos.";
      setFeedback({ tone: "error", text: message });
      toast.error("Error en carga masiva", message);
    } finally {
      setBulkImporting(false);
    }
  }

  async function toggleStatus(product: Product) {
    if (readOnly) return;
    const nextStatus = resolveStatus(product) === "active" ? "archived" : "active";
    setStatusUpdatingId(product.id);
    setFeedback(null);

    try {
      const response = await fetch(`/api/app/catalog/${product.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || "No se pudo actualizar el estado del producto.");
      }

      setProducts((current) => current.map((item) => (item.id === product.id ? json.product : item)));
      toast.success(nextStatus === "active" ? "Producto activado" : "Producto archivado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar el estado del producto.";
      setFeedback({ tone: "error", text: message });
      toast.error("Error al actualizar estado", message);
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function deleteProduct(product: Product) {
    if (readOnly) return;

    const confirmed = window.confirm(`Se eliminara "${product.name}". Esta accion no se puede deshacer.`);
    if (!confirmed) return;

    setDeletingId(product.id);
    setFeedback(null);

    try {
      const result = await requestDelete(product.id);
      if (!result.ok) {
        throw new Error(result.message || "No se pudo eliminar el producto.");
      }

      await reloadProducts(selectedId === product.id ? null : selectedId);
      setSelectedIds((current) => current.filter((id) => id !== product.id));
      setFeedback({ tone: "success", text: `Producto eliminado: ${product.name}.` });
      toast.success("Producto eliminado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el producto.";
      setFeedback({ tone: "error", text: message });
      toast.error("Error al eliminar producto", message);
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteSelectedProducts() {
    if (readOnly || selectedIds.length === 0) return;

    const selectionSnapshot = [...selectedIds];
    const names = products.filter((product) => selectionSnapshot.includes(product.id)).map((product) => product.name);
    const confirmed = window.confirm(
      `Se eliminaran ${selectionSnapshot.length} producto(s): ${names.slice(0, 3).join(", ")}${names.length > 3 ? "..." : ""}.`
    );
    if (!confirmed) return;

    setBulkDeleting(true);
    setFeedback(null);

    try {
      const pending = [...selectionSnapshot];
      const results: DeleteAttemptResult[] = [];
      const workerCount = Math.min(4, pending.length);

      await Promise.all(
        Array.from({ length: workerCount }).map(async () => {
          while (pending.length > 0) {
            const nextId = pending.shift();
            if (!nextId) return;
            results.push(await requestDelete(nextId));
          }
        })
      );

      const deleted = results.filter((result) => result.ok).length;
      const blocked = results.filter((result) => !result.ok && result.blocked).length;
      const failed = results.filter((result) => !result.ok && !result.blocked);

      await reloadProducts(selectedId);
      setSelectedIds((current) => current.filter((id) => !selectionSnapshot.includes(id)));

      if (deleted > 0 && blocked === 0 && failed.length === 0) {
        setFeedback({ tone: "success", text: `Se eliminaron ${deleted} productos seleccionados.` });
        toast.success("Productos eliminados");
      } else if (deleted > 0) {
        const fragments = [`Se eliminaron ${deleted} productos.`];
        if (blocked > 0) fragments.push(`${blocked} quedaron bloqueados por referencias activas.`);
        if (failed.length > 0) fragments.push(`${failed.length} fallaron y necesitan reintento.`);
        setFeedback({ tone: "warning", text: fragments.join(" ") });
        toast.success("Borrado masivo parcial");
      } else if (blocked > 0 && failed.length === 0) {
        setFeedback({ tone: "warning", text: "No se pudo eliminar ningun producto seleccionado porque tienen referencias activas." });
        toast.error("Borrado masivo bloqueado");
      } else if (failed.length > 0) {
        throw new Error(failed[0]?.message || "No se pudieron eliminar los productos seleccionados.");
      } else {
        setFeedback({ tone: "warning", text: "No se pudo eliminar ningun producto seleccionado." });
        toast.error("Borrado masivo bloqueado");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron eliminar los productos seleccionados.";
      setFeedback({ tone: "error", text: message });
      toast.error("Error al eliminar seleccionados", message);
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Boxes} label="Productos cargados" value={String(metrics.total)} helper="Base inicial del catalogo para ventas y pedidos." />
        <MetricCard icon={Package} label="Activos" value={String(metrics.active)} helper="Productos listos para vender o sumar a un pedido." />
        <MetricCard icon={ScanLine} label="Archivados" value={String(metrics.archived)} helper="Productos pausados sin borrar el historial comercial." />
        <MetricCard icon={Warehouse} label="Valor bruto" value={formatCurrency(metrics.stockValue)} helper="Referencia simple de stock valorizado a precio actual." />
      </section>

      {feedback ? (
        <div className="rounded-2xl border border-[color:var(--border)] bg-surface/70 px-4 py-3">
          <Badge variant={feedback.tone === "success" ? "success" : feedback.tone === "warning" ? "warning" : "danger"}>
            {feedback.text}
          </Badge>
        </div>
      ) : null}

      {readOnly ? (
        <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-200">
          Tu rol es de solo lectura en catalogo. Puedes consultar productos, pero no crear, editar ni eliminar.
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">Inventario</Badge>}>
            <div>
              <CardTitle className="text-xl">Resumen operativo</CardTitle>
              <CardDescription>Prioriza reposicion y seguimiento usando solo productos activos del catalogo.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0 md:grid-cols-3">
            <DetailStat label="Sin stock" value={String(inventoryAlerts.outOfStockCount)} />
            <DetailStat label="Stock bajo" value={String(inventoryAlerts.lowStockCount)} />
            <DetailStat label="Activos" value={String(inventoryAlerts.activeCount)} />
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant={inventoryAlerts.attentionProducts.length > 0 ? "warning" : "success"}>
            {inventoryAlerts.attentionProducts.length > 0 ? "Requiere atencion" : "Saludable"}
          </Badge>}>
            <div>
              <CardTitle className="text-xl">Requieren atencion</CardTitle>
              <CardDescription>Productos activos con inventario agotado o en umbral bajo.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {inventoryAlerts.attentionProducts.length === 0 ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 text-sm text-muted">
                No hay productos activos con alertas de inventario.
              </div>
            ) : (
              inventoryAlerts.attentionProducts.slice(0, 5).map(({ product, stock, state }) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {product.sku || "Sin SKU"} · Stock {stock}
                    </p>
                  </div>
                  <Badge variant={state.variant}>{state.label}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="muted">{filteredProducts.length} visibles</Badge>
                {categoryFilter ? <Badge variant="outline">Categoria filtrada</Badge> : null}
                <Button type="button" variant="ghost" size="sm" onClick={() => setListExpanded((current) => !current)}>
                  {listExpanded ? "Colapsar" : "Expandir"}
                  {listExpanded ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
                </Button>
              </div>
            }
          >
            <div>
              <CardTitle className="text-xl">Catalogo del negocio</CardTitle>
              <CardDescription>Lista operativa de productos con precio, stock y estado para revisar rapido, seleccionar en bloque y limpiar catalogo sin perder contexto.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex flex-col gap-3 lg:flex-row">
              <select
                className="h-10 min-w-[220px] rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="">Todas las categorias ({products.length})</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({categoryProductCounts.get(category.id) || 0}){category.isActive ? "" : " · Inactiva"}
                  </option>
                ))}
              </select>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  className="pl-10"
                  placeholder="Buscar por nombre o codigo SKU"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
            {activeCategory ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-surface/55 px-4 py-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Categoria activa</Badge>
                    <span className="text-sm font-medium">{activeCategory.name}</span>
                    <Badge variant={activeCategory.isActive ? "success" : "muted"}>
                      {activeCategory.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted">
                    {filteredProducts.length} visibles de {activeCategoryProductCount} producto{activeCategoryProductCount === 1 ? "" : "s"} en esta categoria.
                  </p>
                </div>
                {!readOnly ? (
                  <Button type="button" variant="secondary" size="sm" onClick={() => openQuickCreate(activeCategory.id)}>
                    Agregar producto en {activeCategory.name}
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-surface/55 px-4 py-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="muted">Vista general</Badge>
                    <span className="text-sm font-medium">Todas las categorias</span>
                  </div>
                  <p className="text-sm text-muted">
                    {filteredProducts.length} visibles de {products.length} producto{products.length === 1 ? "" : "s"} en el catalogo actual.
                  </p>
                </div>
              </div>
            )}
            {products.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-surface/55 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <CheckSquare className="h-4 w-4 text-brandBright" />
                  <span>{selectedIds.length} seleccionados</span>
                  {selectedVisibleCount > 0 ? <span>· {selectedVisibleCount} visibles</span> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={toggleSelectAllVisible}>
                    {allVisibleSelected ? "Limpiar visibles" : "Seleccionar todo"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0}>
                    Limpiar seleccion
                  </Button>
                  <Button type="button" variant="destructive" size="sm" disabled={readOnly || selectedIds.length === 0 || bulkDeleting} onClick={() => void deleteSelectedProducts()}>
                    <Trash2 className="mr-1 h-4 w-4" />
                    {bulkDeleting ? "Eliminando..." : "Eliminar seleccionados"}
                  </Button>
                </div>
              </div>
            ) : null}
            {!listExpanded && products.length > 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/45 p-5 text-sm leading-7 text-muted">
                Listado colapsado para ahorrar espacio operativo. Mantienes buscador y acciones masivas listas para expandir cuando necesites revisar productos.
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/45 p-5 text-sm leading-7 text-muted">
                Todavia no hay productos. Crea el primero desde el panel lateral o pega varias lineas en carga masiva para poblar rapido el catalogo.
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/45 p-5 text-sm leading-7 text-muted">
                {activeCategory && !hasActiveSearch && isFilteredCategoryEmpty
                  ? `La categoria ${activeCategory.name} todavia no tiene productos. Agrega uno nuevo en esta categoria para empezar a organizar el catalogo.`
                  : activeCategory && hasActiveSearch
                    ? `No encontramos coincidencias para "${search.trim()}" dentro de ${activeCategory.name}. Ajusta la busqueda o revisa otra categoria.`
                    : !activeCategory && hasActiveSearch
                      ? `No encontramos productos para "${search.trim()}". Prueba con otro nombre o SKU.`
                      : "No encontramos productos para el criterio actual."}
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={`rounded-[22px] border p-4 transition-colors ${
                    selectedId === product.id ? "border-brand/35 bg-brand/8" : "border-[color:var(--border)] bg-surface/55"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(product.id)}
                        onChange={() => toggleSelection(product.id)}
                        className="mt-1 h-4 w-4 rounded border border-[color:var(--border)] bg-transparent"
                        aria-label={`Seleccionar ${product.name}`}
                      />
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedId(product.id)}>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold">{product.name}</p>
                          <Badge variant={resolveStatus(product) === "active" ? "success" : "muted"}>
                            {resolveStatus(product) === "active" ? "Activo" : "Archivado"}
                          </Badge>
                          {product.categoryName ? <Badge variant="muted">{product.categoryName}</Badge> : null}
                          <Badge variant={getStockState(resolveStock(product)).variant}>
                            {getStockState(resolveStock(product)).label}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted">
                          {product.sku || "Sin SKU"} · Stock {resolveStock(product)}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted">{product.description || "Sin descripcion cargada."}</p>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{formatCurrency(resolvePrice(product), product.currency || "ARS")}</p>
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/app/catalog/${product.id}/edit`}>
                          <PencilLine className="mr-1 h-4 w-4" />
                          Editar
                        </Link>
                      </Button>
                      <Button type="button" variant="secondary" size="sm" disabled={readOnly || statusUpdatingId === product.id} onClick={() => void toggleStatus(product)}>
                        {statusUpdatingId === product.id ? "Actualizando..." : resolveStatus(product) === "active" ? "Archivar" : "Activar"}
                      </Button>
                      <Button type="button" variant="destructive" size="sm" disabled={readOnly || deletingId === product.id || bulkDeleting} onClick={() => void deleteProduct(product)}>
                        <Trash2 className="mr-1 h-4 w-4" />
                        {deletingId === product.id ? "Eliminando..." : "Eliminar"}
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/app/catalog/${product.id}`}>
                          Ver
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/6 bg-card/90">
            <CardHeader action={<Badge variant="muted">Categorias</Badge>}>
              <div>
                <CardTitle className="text-xl">Categorias del catalogo</CardTitle>
                <CardDescription>Organiza productos por familia para que el catalogo y el bot puedan guiarlos mejor.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="flex flex-wrap gap-2">
                <Input
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="Ej. Fundas"
                  disabled={readOnly || categorySaving}
                />
                <Button type="button" onClick={() => void createCategory()} disabled={readOnly || categorySaving}>
                  {categorySaving ? "Guardando..." : "Crear categoria"}
                </Button>
              </div>
              {categories.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/45 p-4 text-sm text-muted">
                  Todavia no hay categorias. Si no cargas ninguna, el bot mantiene el flujo general actual.
                </div>
              ) : (
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-surface/55 p-3">
                      <div className="min-w-0 flex-1">
                        {editingCategoryId === category.id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              value={editingCategoryName}
                              onChange={(event) => setEditingCategoryName(event.target.value)}
                              disabled={readOnly || categoryUpdatingId === category.id}
                              className="max-w-sm"
                            />
                            <Button
                              type="button"
                              size="sm"
                              disabled={readOnly || categoryUpdatingId === category.id}
                              onClick={() => void saveCategoryRename(category)}
                            >
                              Guardar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={readOnly || categoryUpdatingId === category.id}
                              onClick={cancelCategoryEdit}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{category.name}</span>
                            <Badge variant={category.isActive ? "success" : "muted"}>{category.isActive ? "Activa" : "Inactiva"}</Badge>
                            <Badge variant={(categoryProductCounts.get(category.id) || 0) > 0 ? "muted" : "outline"}>
                              {categoryProductCounts.get(category.id) || 0} producto{(categoryProductCounts.get(category.id) || 0) === 1 ? "" : "s"}
                            </Badge>
                            {(categoryProductCounts.get(category.id) || 0) === 0 ? (
                              <span className="text-xs text-muted">Categoria vacia</span>
                            ) : null}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {editingCategoryId === category.id ? null : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={readOnly || categoryUpdatingId === category.id || categoryDeletingId === category.id}
                            onClick={() => startCategoryEdit(category)}
                          >
                            Renombrar
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={readOnly || categoryUpdatingId === category.id || categoryDeletingId === category.id}
                          onClick={() => void toggleCategory(category)}
                        >
                          {categoryUpdatingId === category.id ? "Guardando..." : category.isActive ? "Desactivar" : "Activar"}
                        </Button>
                        {editingCategoryId === category.id ? null : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={readOnly || categoryUpdatingId === category.id || categoryDeletingId === category.id}
                            onClick={() => void deleteCategory(category)}
                          >
                            {categoryDeletingId === category.id ? "Eliminando..." : "Eliminar"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/6 bg-card/90">
            <CardHeader action={<Badge variant={mode === "bulk" ? "warning" : "muted"}>{mode === "bulk" ? "Carga masiva" : "Alta rapida"}</Badge>}>
              <div>
                <CardTitle className="text-xl">Carga de productos</CardTitle>
                <CardDescription>Elige entre alta individual o carga masiva para poblar el catalogo mas rapido sin salir del portal.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={mode === "single" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => openQuickCreate(categoryFilter || null)}
                  disabled={readOnly}
                >
                  Alta rapida
                </Button>
                <Button type="button" variant={mode === "bulk" ? "primary" : "secondary"} size="sm" onClick={() => setMode("bulk")} disabled={readOnly}>
                  Carga masiva
                </Button>
              </div>

              {mode === "single" ? (
                <form className="space-y-4" onSubmit={saveProduct}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nombre</label>
                    <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Combo mediodia" disabled={readOnly} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">SKU</label>
                      <Input value={draft.sku} onChange={(event) => setDraft((current) => ({ ...current, sku: event.target.value }))} placeholder="Ej. COMBO-MED-01" disabled={readOnly} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Moneda</label>
                      <Input value={draft.currency} onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} placeholder="ARS" maxLength={3} disabled={readOnly} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Categoria</label>
                    <select
                      className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                      value={draft.categoryId}
                      onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))}
                      disabled={readOnly}
                    >
                      <option value="">Sin categoria</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}{category.isActive ? "" : " · Inactiva"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Precio</label>
                      <Input value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} placeholder="0" inputMode="decimal" disabled={readOnly} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Stock basico</label>
                      <Input value={draft.stock} onChange={(event) => setDraft((current) => ({ ...current, stock: event.target.value }))} placeholder="0" inputMode="numeric" disabled={readOnly} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descripcion</label>
                    <Textarea className="min-h-[120px]" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Describe el producto de forma simple para el equipo y futuros flujos de venta." disabled={readOnly} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button type="button" variant="ghost" onClick={() => startCreate(categoryFilter || null)} disabled={readOnly}>
                      Limpiar
                    </Button>
                    <Button type="submit" disabled={readOnly || saving}>
                      {saving ? "Guardando..." : "Crear producto"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pega varias lineas</label>
                    <Textarea
                      className="min-h-[180px]"
                      value={bulkText}
                      onChange={(event) => setBulkText(event.target.value)}
                      placeholder="nombre | sku | precio | stock | descripcion | categoria"
                      disabled={readOnly}
                    />
                    <div className="rounded-[22px] border border-[color:var(--border)] bg-surface/55 p-4">
                      <p className="text-sm font-semibold">Formato por linea</p>
                      <p className="mt-2 font-mono text-xs leading-6 text-text">
                        nombre | sku | precio | stock | descripcion | categoria
                      </p>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-[color:var(--border)] bg-card/85 p-3">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Campos opcionales</p>
                          <div className="mt-2 space-y-1 text-sm text-muted">
                            <p>- sku</p>
                            <p>- descripcion</p>
                            <p>- categoria</p>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-[color:var(--border)] bg-card/85 p-3">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Regla de categoria</p>
                          <p className="mt-2 text-sm leading-6 text-muted">
                            Si la categoria no existe, se crea automaticamente.
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 rounded-2xl border border-dashed border-[color:var(--border)] bg-card/70 p-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Ejemplo</p>
                        <p className="mt-2 font-mono text-xs leading-6 text-text">
                          Funda silicona iPhone 11 | FUNDA-01 | 6000 | 10 | Silicona flexible | Fundas
                        </p>
                      </div>
                      <p className="mt-3 text-xs leading-6 text-muted">
                        Tambien sigue funcionando el formato viejo de 5 columnas sin categoria.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => buildBulkPreview(bulkText)} disabled={readOnly}>
                      Previsualizar
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setBulkText(BULK_EXAMPLE)} disabled={readOnly}>
                      Cargar ejemplo
                    </Button>
                    <Button type="button" disabled={readOnly || bulkImporting || validBulkRows.length === 0} onClick={() => void importBulkProducts()}>
                      <Upload className="mr-2 h-4 w-4" />
                      {bulkImporting ? "Importando..." : "Importar productos"}
                    </Button>
                  </div>

                  {bulkPreview.length > 0 ? (
                    <div className="rounded-[22px] border border-[color:var(--border)] bg-surface/55 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">Preview de importacion</p>
                        <Badge variant={validBulkRows.length === bulkPreview.length ? "success" : "warning"}>
                          {validBulkRows.length} / {bulkPreview.length} validas
                        </Badge>
                      </div>

                      <div className="mt-4 hidden grid-cols-[auto_minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1fr)] gap-3 px-3 text-[11px] uppercase tracking-[0.14em] text-muted md:grid">
                        <span>Fila</span>
                        <span>Producto</span>
                        <span>Precio / Stock</span>
                        <span>Categoria</span>
                        <span>Descripcion</span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {bulkPreview.map((row) => (
                          <div key={`${row.sourceRow}-${row.raw}`} className="rounded-2xl border border-[color:var(--border)] bg-card/85 p-3">
                            <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1fr)] md:items-start">
                              <div className="flex items-center gap-2">
                                <Badge variant={row.valid ? "success" : "danger"}>Fila {row.sourceRow}</Badge>
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium">{row.name || "Sin nombre"}</p>
                                {row.sku ? <p className="mt-1 text-xs text-muted">SKU: {row.sku}</p> : null}
                              </div>
                              <div className="text-sm text-muted">
                                <p>{formatCurrency(row.price || 0)}</p>
                                <p className="mt-1">Stock {row.stock}</p>
                              </div>
                              <div className="text-sm text-muted">
                                {row.categoryName || "Sin categoria"}
                              </div>
                              <div className="text-sm text-muted">
                                {row.description || "Sin descripcion"}
                              </div>
                            </div>
                            {row.valid ? (
                              <p className="mt-3 text-xs text-emerald-300 md:hidden">
                                Categoria: {row.categoryName || "Sin categoria"}
                              </p>
                            ) : (
                              <p className="mt-2 text-sm text-red-300">{row.error}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {bulkResult ? (
                    <div className="rounded-[22px] border border-[color:var(--border)] bg-surface/55 p-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="success">{bulkResult.created} creados</Badge>
                        <Badge variant={bulkResult.failed > 0 ? "warning" : "muted"}>{bulkResult.failed} fallidos</Badge>
                      </div>

                      <div className="mt-4 space-y-2">
                        {bulkResult.results.map((row) => (
                          <div key={`${row.sourceRow}-${row.status}-${row.productId || row.code || "result"}`} className="flex flex-wrap items-center gap-2 text-sm">
                            <Badge variant={row.status === "created" ? "success" : "danger"}>Fila {row.sourceRow}</Badge>
                            <span>{row.status === "created" ? `Creada (${row.productId})` : `Fallo: ${humanizeBulkCode(row.code)}`}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/6 bg-card/90">
            <CardHeader action={selectedProduct ? <Badge variant={resolveStatus(selectedProduct) === "active" ? "success" : "muted"}>{resolveStatus(selectedProduct) === "active" ? "Activo" : "Archivado"}</Badge> : null}>
              <div>
                <CardTitle className="text-xl">Detalle rapido</CardTitle>
                <CardDescription>Contexto rapido del producto seleccionado para validar precio, stock y disponibilidad.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {!selectedProduct ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/45 p-5 text-sm text-muted">
                  Selecciona un producto del listado para ver su detalle.
                </div>
              ) : (
                <>
                  <DetailStat label="Producto" value={selectedProduct.name} />
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={resolveStatus(selectedProduct) === "active" ? "success" : "muted"}>
                      {resolveStatus(selectedProduct) === "active" ? "Activo" : "Archivado"}
                    </Badge>
                    <Badge variant={getStockState(resolveStock(selectedProduct)).variant}>
                      {getStockState(resolveStock(selectedProduct)).label}
                    </Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <DetailStat label="Precio" value={formatCurrency(resolvePrice(selectedProduct), selectedProduct.currency || "ARS")} />
                    <DetailStat label="Stock" value={String(resolveStock(selectedProduct))} />
                    <DetailStat label="Categoria" value={selectedProduct.categoryName || "Sin categoria"} />
                    <DetailStat label="SKU" value={selectedProduct.sku || "Sin SKU"} />
                    <DetailStat label="Actualizado" value={formatDate(selectedProduct.updatedAt || selectedProduct.createdAt)} />
                  </div>
                  {!readOnly ? (
                    <Button asChild variant="secondary" size="sm" className="rounded-2xl">
                      <Link href={`/app/catalog/${selectedProduct.id}/edit`}>
                        <PencilLine className="mr-2 h-4 w-4" />
                        Editar producto
                      </Link>
                    </Button>
                  ) : null}
                  {getStockState(resolveStock(selectedProduct)).isLowStock ? (
                    <p className="text-sm text-amber-300">Quedan pocas unidades disponibles de este producto.</p>
                  ) : null}
                  {getStockState(resolveStock(selectedProduct)).isOutOfStock ? (
                    <p className="text-sm text-red-300">Este producto no tiene stock disponible en este momento.</p>
                  ) : null}
                  <div className="rounded-[22px] border border-[color:var(--border)] bg-surface/55 p-4">
                    <p className="text-sm font-semibold">Descripcion</p>
                    <p className="mt-2 text-sm leading-7 text-muted">{selectedProduct.description || "Sin descripcion cargada."}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function parseBulkRow(rawLine: string, sourceRow: number): BulkPreviewRow {
  const raw = rawLine.trim();
  const columns = rawLine.split("|").map((part) => part.trim());
  const [name = "", sku = "", priceRaw = "", stockRaw = "", description = "", categoryName = ""] = columns;

  if (columns.length < 4) {
    return {
      sourceRow,
      raw,
      name,
      sku,
      price: null,
      stock: null,
      description,
      categoryName,
      valid: false,
      error: "Faltan columnas. Usa: nombre | sku | precio | stock | descripcion | categoria"
    };
  }

  if (columns.length > 6) {
    return {
      sourceRow,
      raw,
      name,
      sku,
      price: null,
      stock: null,
      description,
      categoryName,
      valid: false,
      error: "La fila tiene mas de 6 columnas."
    };
  }

  const price = Number(priceRaw);
  const stock = Number.parseInt(stockRaw, 10);

  if (!name) {
    return {
      sourceRow,
      raw,
      name,
      sku,
      price: null,
      stock: null,
      description,
      categoryName,
      valid: false,
      error: "Nombre obligatorio."
    };
  }

  if (!Number.isFinite(price) || price < 0) {
    return {
      sourceRow,
      raw,
      name,
      sku,
      price: null,
      stock: null,
      description,
      categoryName,
      valid: false,
      error: "Precio invalido."
    };
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return {
      sourceRow,
      raw,
      name,
      sku,
      price,
      stock: null,
      description,
      categoryName,
      valid: false,
      error: "Stock invalido."
    };
  }

  return {
    sourceRow,
    raw,
    name,
    sku,
    price,
    stock,
    description,
    categoryName,
    valid: true
  };
}

function humanizeBulkCode(code?: string) {
  switch (code) {
    case "missing_product_name":
      return "nombre obligatorio";
    case "invalid_product_price":
      return "precio invalido";
    case "invalid_product_stock":
      return "stock invalido";
    case "duplicate_product_sku":
      return "SKU duplicado";
    default:
      return code || "error_desconocido";
  }
}

function resolvePrice(product: Product) {
  return Number(product.price || 0);
}

function resolveStock(product: Product) {
  return Number((product.stock ?? product.stockQty) || 0);
}

function resolveStatus(product: Product) {
  if (product.status) return product.status;
  return product.active === false ? "archived" : "active";
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card className="border-white/6 bg-card/90">
      <CardContent className="flex items-start gap-4 p-5">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-surface/80">
          <Icon className="h-5 w-5 text-brandBright" />
        </span>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function formatCurrency(value: number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}


