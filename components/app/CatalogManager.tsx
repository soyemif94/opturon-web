"use client";

import Link from "next/link";
import { type ChangeEvent, type ComponentType, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Boxes,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Download,
  FolderCog,
  Package,
  PencilLine,
  Plus,
  ScanLine,
  Search,
  Trash2,
  Upload,
  Warehouse
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CatalogImportWizard } from "@/components/app/CatalogImportWizard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatExpirationDate, getExpirationBadgePresentation, getProductExpirationStatus } from "@/lib/product-expiration";
import { getDiscountedPrice, normalizeDiscountPercentage } from "@/lib/product-pricing";
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
  brand?: string | null;
  manufacturer?: string | null;
  barcode?: string | null;
  unitOfMeasure?: string | null;
  cost?: number | null;
  defaultSupplier?: string | null;
  weight?: number | null;
  weightUnit?: string | null;
  presentation?: string | null;
  subcategory?: string | null;
  attributes?: Record<string, string | number | boolean>;
  image?: {
    url: string;
    alt?: string | null;
    source?: string | null;
  } | null;
  expirationDate?: string | null;
  discountPercentage?: number | null;
  riskDiscountSuggestion?: {
    key: "catalog_risk_discount";
    status: "critical" | "expiring_soon";
    suggestedDiscountPercentage: number;
    currentDiscountPercentage: number | null;
    deltaPercentage: number;
    hasManualDiscount: boolean;
    canApply: boolean;
    label: string;
    helper: string;
  } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ProductCategory = {
  id: string;
  name: string;
  isActive: boolean;
};

type ExpirationFilter = "all" | "expiring_soon" | "critical" | "expired";

type Draft = {
  name: string;
  description: string;
  sku: string;
  price: string;
  stock: string;
  currency: string;
  categoryId: string;
  brand: string;
  manufacturer: string;
  barcode: string;
  unitOfMeasure: string;
  cost: string;
  defaultSupplier: string;
  weight: string;
  weightUnit: string;
  presentation: string;
  subcategory: string;
  imageUrl: string;
  imageAlt: string;
  imageSource: "external_url" | "uploaded";
  expirationDate: string;
  attributesText: string;
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

const PRODUCTS_PER_PAGE = 5;

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
  categoryId: "",
  brand: "",
  manufacturer: "",
  barcode: "",
  unitOfMeasure: "",
  cost: "",
  defaultSupplier: "",
  weight: "",
  weightUnit: "",
  presentation: "",
  subcategory: "",
  imageUrl: "",
  imageAlt: "",
  imageSource: "external_url",
  expirationDate: "",
  attributesText: ""
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | "warning"; text: string } | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [expirationFilter, setExpirationFilter] = useState<ExpirationFilter>("all");
  const [sortByUrgency, setSortByUrgency] = useState(true);
  const [listExpanded, setListExpanded] = useState(true);
  const [discountEditorId, setDiscountEditorId] = useState<string | null>(null);
  const [discountDraft, setDiscountDraft] = useState("");
  const [discountSavingId, setDiscountSavingId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [categoryUpdatingId, setCategoryUpdatingId] = useState<string | null>(null);
  const [categoryDeletingId, setCategoryDeletingId] = useState<string | null>(null);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

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
  const sortedCategories = useMemo(
    () => [...categories].sort((left, right) => left.name.localeCompare(right.name)),
    [categories]
  );
  const filteredCategoryRail = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return sortedCategories;
    return sortedCategories.filter((category) => category.name.toLowerCase().includes(query));
  }, [categorySearch, sortedCategories]);
  const visibleCategoryRail = categoriesExpanded ? filteredCategoryRail : filteredCategoryRail.slice(0, 5);
  const hiddenCategoryRailCount = Math.max(filteredCategoryRail.length - visibleCategoryRail.length, 0);
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
  const riskCount = useMemo(
    () =>
      filteredProducts.filter((product) => {
        const status = getProductExpirationStatus(product.expirationDate);
        return status?.state === "critical" || status?.state === "expiring_soon";
      }).length,
    [filteredProducts]
  );
  const visibleProducts = useMemo(() => {
    const expirationFiltered = filteredProducts.filter((product) => {
      if (expirationFilter === "all") return true;
      const status = getProductExpirationStatus(product.expirationDate);
      if (expirationFilter === "critical") return status?.state === "critical";
      if (expirationFilter === "expired") return status?.state === "expired";
      if (expirationFilter === "expiring_soon") return status?.state === "expiring_soon";
      return true;
    });

    if (!sortByUrgency) return expirationFiltered;

    return [...expirationFiltered].sort((left, right) => {
      const priorityLeft = getExpirationPriority(left);
      const priorityRight = getExpirationPriority(right);
      if (priorityLeft !== priorityRight) return priorityLeft - priorityRight;

      const updatedLeft = new Date(left.updatedAt || left.createdAt || 0).getTime();
      const updatedRight = new Date(right.updatedAt || right.createdAt || 0).getTime();
      return updatedRight - updatedLeft;
    });
  }, [expirationFilter, filteredProducts, sortByUrgency]);
  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / PRODUCTS_PER_PAGE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPageSafe - 1) * PRODUCTS_PER_PAGE;
    return visibleProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [currentPageSafe, visibleProducts]);
  const pageStart = visibleProducts.length === 0 ? 0 : (currentPageSafe - 1) * PRODUCTS_PER_PAGE + 1;
  const pageEnd = visibleProducts.length === 0 ? 0 : Math.min(currentPageSafe * PRODUCTS_PER_PAGE, visibleProducts.length);
  const paginationItems = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

    const items: Array<number | "ellipsis"> = [1];
    const windowStart = Math.max(2, currentPageSafe - 1);
    const windowEnd = Math.min(totalPages - 1, currentPageSafe + 1);

    if (windowStart > 2) items.push("ellipsis");
    for (let page = windowStart; page <= windowEnd; page += 1) {
      items.push(page);
    }
    if (windowEnd < totalPages - 1) items.push("ellipsis");

    items.push(totalPages);
    return items;
  }, [currentPageSafe, totalPages]);

  const validBulkRows = useMemo(() => bulkPreview.filter((row) => row.valid), [bulkPreview]);
  const allVisibleSelected = paginatedProducts.length > 0 && paginatedProducts.every((product) => selectedIds.includes(product.id));
  const selectedVisibleCount = paginatedProducts.filter((product) => selectedIds.includes(product.id)).length;
  const hasActiveSearch = search.trim().length > 0;
  const isFilteredCategoryEmpty = Boolean(activeCategory && activeCategoryProductCount === 0);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, expirationFilter, sortByUrgency]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function hydrateDraft(product?: Product | null): Draft {
    return {
      name: product?.name || "",
      description: product?.description || "",
      sku: product?.sku || "",
      price: product ? String(resolvePrice(product)) : "",
      stock: product ? String(resolveStock(product)) : "0",
      currency: product?.currency || "ARS",
      categoryId: product?.categoryId || "",
      brand: product?.brand || "",
      manufacturer: product?.manufacturer || "",
      barcode: product?.barcode || "",
      unitOfMeasure: product?.unitOfMeasure || "",
      cost: product?.cost == null ? "" : String(product.cost),
      defaultSupplier: product?.defaultSupplier || "",
      weight: product?.weight == null ? "" : String(product.weight),
      weightUnit: product?.weightUnit || "",
      presentation: product?.presentation || "",
      subcategory: product?.subcategory || "",
      imageUrl: product?.image?.url || "",
      imageAlt: product?.image?.alt || "",
      imageSource: product?.image?.source === "uploaded" ? "uploaded" : "external_url",
      expirationDate: product?.expirationDate || "",
      attributesText: formatAttributesText(product?.attributes)
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

  function scrollToSection(sectionId: string) {
    if (typeof document === "undefined") return;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openBulkImport() {
    setMode("bulk");
    scrollToSection("catalog-load-section");
  }

  function exportVisibleProducts() {
    const rows = (visibleProducts.length > 0 ? visibleProducts : filteredProducts).map((product) => {
      const pricing = getProductPricing(product);
      return [
        escapeCsvValue(product.name),
        escapeCsvValue(product.sku || ""),
        escapeCsvValue(product.categoryName || ""),
        escapeCsvValue(product.brand || ""),
        escapeCsvValue(product.manufacturer || ""),
        escapeCsvValue(product.barcode || ""),
        escapeCsvValue(product.unitOfMeasure || ""),
        escapeCsvValue(product.cost == null ? "" : String(product.cost)),
        escapeCsvValue(product.defaultSupplier || ""),
        escapeCsvValue(product.weight == null ? "" : String(product.weight)),
        escapeCsvValue(product.weightUnit || ""),
        escapeCsvValue(product.presentation || ""),
        escapeCsvValue(product.subcategory || ""),
        escapeCsvValue(formatAttributesText(product.attributes)),
        escapeCsvValue(resolveStatus(product) === "active" ? "Activo" : "Archivado"),
        escapeCsvValue(String(resolveStock(product))),
        escapeCsvValue(String(pricing.finalPrice)),
        escapeCsvValue(formatExpirationDate(product.expirationDate))
      ].join(";");
    });

    const csv = [
      "Nombre;SKU;Categoria;Marca;Fabricante;Codigo de barras;Unidad;Costo;Proveedor;Peso;Unidad de peso;Presentacion;Subcategoria;Atributos;Estado;Stock;Precio;Vencimiento",
      ...rows
    ].join("\n");

    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `catalogo-opturon-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Catalogo exportado");
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
      setSelectedIds((current) => current.filter((id) => !paginatedProducts.some((product) => product.id === id)));
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);
      paginatedProducts.forEach((product) => next.add(product.id));
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
    const cost = draft.cost.trim() ? Number(draft.cost) : null;
    const weight = draft.weight.trim() ? Number(draft.weight) : null;
    const attributes = parseAttributesText(draft.attributesText);
    const image = buildCatalogImagePayload(draft.imageUrl, draft.imageAlt, draft.imageSource);

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
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
      setFeedback({ tone: "warning", text: "El costo debe ser un numero valido mayor o igual a cero." });
      return;
    }
    if (weight !== null && (!Number.isFinite(weight) || weight < 0)) {
      setFeedback({ tone: "warning", text: "El peso debe ser un numero valido mayor o igual a cero." });
      return;
    }
    if (draft.imageUrl.trim() && !image) {
      setFeedback({ tone: "warning", text: "La imagen principal debe ser una URL valida con http o https." });
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
          categoryId: draft.categoryId || null,
          brand: draft.brand.trim() || null,
          manufacturer: draft.manufacturer.trim() || null,
          barcode: draft.barcode.trim() || null,
          unitOfMeasure: draft.unitOfMeasure.trim() || null,
          cost,
          defaultSupplier: draft.defaultSupplier.trim() || null,
          weight,
          weightUnit: draft.weightUnit.trim() || null,
          presentation: draft.presentation.trim() || null,
          subcategory: draft.subcategory.trim() || null,
          image,
          expirationDate: draft.expirationDate || null,
          attributes
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
      toast.success("Imagen subida");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo subir la imagen.";
      setFeedback({ tone: "error", text: message });
      toast.error("Error al subir imagen", message);
    } finally {
      setUploadingImage(false);
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

  function openDiscountEditor(product: Product) {
    setDiscountEditorId(product.id);
    setDiscountDraft(
      product.discountPercentage != null
        ? String(product.discountPercentage)
        : product.riskDiscountSuggestion
          ? String(product.riskDiscountSuggestion.suggestedDiscountPercentage)
          : ""
    );
  }

  function closeDiscountEditor() {
    setDiscountEditorId(null);
    setDiscountDraft("");
  }

  async function saveDiscount(
    product: Product,
    rawValue = discountDraft,
    options?: {
      automationAttribution?: {
        templateKey: "catalog_risk_discount";
        action: "apply_suggestion";
        suggestedDiscountPercentage: number;
        source?: string;
      };
    }
  ) {
    if (readOnly) return;
    const normalized = normalizeDiscountPercentage(rawValue);
    if (String(rawValue || "").trim() && normalized == null) {
      setFeedback({ tone: "warning", text: "Ingresa un porcentaje valido mayor a cero." });
      return;
    }

    setDiscountSavingId(product.id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/app/catalog/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountPercentage: normalized,
          automationAttribution: options?.automationAttribution || null
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(json?.error || "No se pudo actualizar el descuento."));

      setProducts((current) => current.map((item) => (item.id === product.id ? json.product : item)));
      if (selectedId === product.id) {
        setSelectedId(json.product.id);
      }
      closeDiscountEditor();
      toast.success(normalized == null ? "Promocion removida" : "Descuento aplicado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar el descuento.";
      setFeedback({ tone: "error", text: message });
      toast.error("Error al actualizar descuento", message);
    } finally {
      setDiscountSavingId(null);
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

  const renderCatalogWorkspacePremium = () => (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.96))] shadow-[0_22px_48px_rgba(3,8,16,0.28)]">
          <CardHeader
            action={
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <Badge variant="muted">{visibleProducts.length} visibles</Badge>
                {riskCount > 0 ? <Badge variant="warning">{riskCount} en riesgo</Badge> : null}
                {categoryFilter ? <Badge variant="outline">Categoria filtrada</Badge> : null}
              </div>
            }
          >
            <div>
              <CardTitle className="text-xl">Buscar y filtrar productos</CardTitle>
              <CardDescription>Ordena el catalogo con foco comercial: producto, precio, stock y estado en una sola vista.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  className="h-12 rounded-2xl border-white/8 bg-[linear-gradient(135deg,rgba(12,20,32,0.92),rgba(9,15,24,0.92))] pl-10 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                  placeholder="Buscar por nombre, SKU o codigo de barras..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant={expirationFilter === "all" ? "primary" : "ghost"} size="sm" onClick={() => setExpirationFilter("all")}>
                Todos
              </Button>
              <Button type="button" variant={expirationFilter === "expiring_soon" ? "primary" : "ghost"} size="sm" onClick={() => setExpirationFilter("expiring_soon")}>
                Proximos a vencer
              </Button>
              <Button type="button" variant={expirationFilter === "critical" ? "primary" : "ghost"} size="sm" onClick={() => setExpirationFilter("critical")}>
                Criticos
              </Button>
              <Button type="button" variant={expirationFilter === "expired" ? "primary" : "ghost"} size="sm" onClick={() => setExpirationFilter("expired")}>
                Vencidos
              </Button>
              <Button type="button" variant={sortByUrgency ? "secondary" : "ghost"} size="sm" onClick={() => setSortByUrgency((current) => !current)}>
                {sortByUrgency ? "Urgencia primero" : "Orden original"}
              </Button>
            </div>

            {activeCategory ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-[linear-gradient(135deg,rgba(16,24,36,0.86),rgba(9,15,24,0.92))] px-4 py-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Categoria activa</Badge>
                    <span className="text-sm font-medium">{activeCategory.name}</span>
                    <Badge variant={activeCategory.isActive ? "success" : "muted"}>{activeCategory.isActive ? "Activa" : "Inactiva"}</Badge>
                  </div>
                  <p className="text-sm text-muted">
                    {visibleProducts.length} visibles de {activeCategoryProductCount} producto{activeCategoryProductCount === 1 ? "" : "s"} en esta categoria.
                  </p>
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  <Button type="button" variant="ghost" size="sm" className="w-full sm:w-auto" onClick={() => setCategoryFilter("")}>
                    Quitar filtro
                  </Button>
                  {!readOnly ? (
                    <Button type="button" variant="secondary" size="sm" className="w-full sm:w-auto" onClick={() => openQuickCreate(activeCategory.id)}>
                      Agregar producto
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-[linear-gradient(135deg,rgba(16,24,36,0.86),rgba(9,15,24,0.92))] px-4 py-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="muted">Vista general</Badge>
                    <span className="text-sm font-medium">Todas las categorias</span>
                  </div>
                  <p className="text-sm text-muted">
                    {visibleProducts.length} visibles de {products.length} producto{products.length === 1 ? "" : "s"} en el catalogo actual.
                  </p>
                </div>
              </div>
            )}

            {products.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-[linear-gradient(135deg,rgba(16,24,36,0.92),rgba(9,15,24,0.96))] px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <CheckSquare className="h-4 w-4 text-brandBright" />
                  <span>{selectedIds.length} seleccionados</span>
                  {selectedVisibleCount > 0 ? <span>· {selectedVisibleCount} visibles</span> : null}
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                  <Button type="button" variant="secondary" size="sm" className="w-full sm:w-auto" onClick={toggleSelectAllVisible}>
                    {allVisibleSelected ? "Limpiar visibles" : "Seleccionar todo"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="w-full sm:w-auto" onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0}>
                    Limpiar seleccion
                  </Button>
                  <Button type="button" variant="destructive" size="sm" className="w-full sm:w-auto" disabled={readOnly || selectedIds.length === 0 || bulkDeleting} onClick={() => void deleteSelectedProducts()}>
                    <Trash2 className="mr-1 h-4 w-4" />
                    {bulkDeleting ? "Eliminando..." : "Eliminar seleccionados"}
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.96))] shadow-[0_22px_48px_rgba(3,8,16,0.28)]">
          <CardHeader
            action={
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <Badge variant="muted">{visibleProducts.length} visibles</Badge>
                <Button type="button" variant="ghost" size="sm" className="w-full sm:w-auto" onClick={() => setListExpanded((current) => !current)}>
                  {listExpanded ? "Colapsar" : "Expandir"}
                  {listExpanded ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
                </Button>
              </div>
            }
          >
            <div>
              <CardTitle className="text-xl">Todos los productos</CardTitle>
              <CardDescription>Listado comercial del catalogo con foco en producto, precio, stock y acciones rapidas.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {!listExpanded && products.length > 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/45 p-5 text-sm leading-7 text-muted">
                Listado colapsado para ahorrar espacio operativo. Expande cuando necesites revisar productos.
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/45 p-5 text-sm leading-7 text-muted">
                Todavia no hay productos. Crea el primero desde el rail derecho o usa la carga masiva.
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/45 p-5 text-sm leading-7 text-muted">
                {activeCategory && !hasActiveSearch && isFilteredCategoryEmpty
                  ? `La categoria ${activeCategory.name} todavia no tiene productos. Agrega uno nuevo en esta categoria para empezar a organizar el catalogo.`
                  : activeCategory && hasActiveSearch
                    ? `No encontramos coincidencias para "${search.trim()}" dentro de ${activeCategory.name}. Ajusta la busqueda o revisa otra categoria.`
                    : !activeCategory && hasActiveSearch
                      ? `No encontramos productos para "${search.trim()}". Prueba con otro nombre o SKU.`
                      : expirationFilter !== "all"
                        ? "No hay productos para este filtro de vencimiento."
                        : "No encontramos productos para el criterio actual."}
              </div>
            ) : (
              <>
                {paginatedProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`overflow-hidden rounded-[26px] border transition-all ${
                      selectedId === product.id
                        ? "border-brand/35 bg-[linear-gradient(135deg,rgba(255,122,0,0.10),rgba(8,16,28,0.94))] shadow-[0_22px_48px_rgba(255,122,0,0.10)]"
                        : "border-white/8 bg-[linear-gradient(135deg,rgba(15,24,38,0.96),rgba(7,13,22,0.94))] hover:border-white/14 hover:bg-[linear-gradient(135deg,rgba(18,28,44,0.98),rgba(9,16,28,0.96))]"
                    }`}
                  >
                    <div className="flex flex-col gap-4 p-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(product.id)}
                            onChange={() => toggleSelection(product.id)}
                            className="mt-2 h-4 w-4 rounded border border-[color:var(--border)] bg-transparent"
                            aria-label={`Seleccionar ${product.name}`}
                          />
                          <CatalogProductImage product={product} />
                        </div>
                        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedId(product.id)}>
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-lg font-semibold text-foreground">{product.name}</p>
                                  <Badge variant={resolveStatus(product) === "active" ? "success" : "muted"}>
                                    {resolveStatus(product) === "active" ? "Activo" : "Archivado"}
                                  </Badge>
                                  {getProductPricing(product).hasDiscount ? <Badge variant="warning">Promocion</Badge> : null}
                                </div>
                                <p className="text-sm text-muted">{product.sku || "Sin SKU"}</p>
                                <div className="flex flex-wrap gap-2">
                                  {product.categoryName ? <Badge variant="muted">{product.categoryName}</Badge> : null}
                                  {product.brand ? <Badge variant="warning">{product.brand}</Badge> : null}
                                  {product.subcategory ? <Badge variant="outline">{product.subcategory}</Badge> : null}
                                  <Badge variant={getStockState(resolveStock(product)).variant}>{resolveStock(product)} en stock</Badge>
                                  <Badge variant={getExpirationBadgePresentation(product.expirationDate).variant}>
                                    {getExpirationBadgePresentation(product.expirationDate).label}
                                  </Badge>
                                </div>
                              </div>
                              <div className="shrink-0 lg:text-right">
                                {getProductPricing(product).hasDiscount ? (
                                  <>
                                    <p className="text-xs text-muted line-through">
                                      {formatCurrency(getProductPricing(product).originalPrice, product.currency || "ARS")}
                                    </p>
                                    <p className="mt-1 text-2xl font-semibold text-foreground">
                                      {formatCurrency(getProductPricing(product).finalPrice, product.currency || "ARS")}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-2xl font-semibold text-foreground">
                                    {formatCurrency(resolvePrice(product), product.currency || "ARS")}
                                  </p>
                                )}
                                <p className="mt-1 text-xs text-muted">Precio de venta</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                              <span>{product.sku || "Sin SKU"}</span>
                              <span>Stock {resolveStock(product)} unidades</span>
                              {product.brand ? <span>Marca {product.brand}</span> : null}
                              {product.manufacturer ? <span>Fabricante {product.manufacturer}</span> : null}
                              {product.barcode ? <span>Codigo {product.barcode}</span> : null}
                              {product.presentation ? <span>{product.presentation}</span> : null}
                              <span>Vence {formatExpirationDate(product.expirationDate)}</span>
                              <span>{getExpirationBadgePresentation(product.expirationDate).helper}</span>
                              {formatAttributesText(product.attributes) ? <span>{formatAttributesText(product.attributes)}</span> : null}
                            </div>
                            {product.riskDiscountSuggestion ? (
                              <p className="rounded-2xl border border-amber-400/15 bg-amber-500/8 px-3 py-2 text-xs text-amber-200">
                                {product.riskDiscountSuggestion.helper}
                                {product.riskDiscountSuggestion.currentDiscountPercentage != null
                                  ? ` Actual ${product.riskDiscountSuggestion.currentDiscountPercentage}%.`
                                  : ` Sugerido ${product.riskDiscountSuggestion.suggestedDiscountPercentage}%.`}
                              </p>
                            ) : null}
                            <p className="line-clamp-2 text-sm text-muted">{product.description || "Sin descripcion cargada."}</p>
                          </div>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 xl:max-w-[320px] xl:justify-end">
                        <Button asChild variant="secondary" size="sm">
                          <Link href={`/app/catalog/${product.id}`}>
                            Ver detalle
                            <ArrowRight className="ml-1 h-4 w-4" />
                          </Link>
                        </Button>
                        <Button asChild variant="secondary" size="sm">
                          <Link href={`/app/catalog/${product.id}/edit`}>
                            <PencilLine className="mr-1 h-4 w-4" />
                            Editar
                          </Link>
                        </Button>
                        {canApplyDirectDiscount(product) ? (
                          <Button
                            type="button"
                            variant={getProductPricing(product).hasDiscount ? "secondary" : "primary"}
                            size="sm"
                            disabled={readOnly}
                            onClick={() => openDiscountEditor(product)}
                          >
                            {product.riskDiscountSuggestion && !getProductPricing(product).hasDiscount ? "Aplicar sugerencia" : getProductPricing(product).hasDiscount ? "Editar descuento" : "Aplicar descuento"}
                          </Button>
                        ) : null}
                        <Button type="button" variant="secondary" size="sm" disabled={readOnly || statusUpdatingId === product.id} onClick={() => void toggleStatus(product)}>
                          {statusUpdatingId === product.id ? "Actualizando..." : resolveStatus(product) === "active" ? "Archivar" : "Activar"}
                        </Button>
                        <Button type="button" variant="destructive" size="sm" disabled={readOnly || deletingId === product.id || bulkDeleting} onClick={() => void deleteProduct(product)}>
                          <Trash2 className="mr-1 h-4 w-4" />
                          {deletingId === product.id ? "Eliminando..." : "Eliminar"}
                        </Button>
                      </div>
                    </div>
                    {discountEditorId === product.id ? (
                      <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-card/85 p-4">
                        {product.riskDiscountSuggestion ? (
                          <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3">
                            <p className="text-sm font-medium text-amber-100">{product.riskDiscountSuggestion.label}</p>
                            <p className="mt-1 text-xs text-amber-200/90">{product.riskDiscountSuggestion.helper}</p>
                            <p className="mt-2 text-xs text-amber-200/80">
                              Sugerido {product.riskDiscountSuggestion.suggestedDiscountPercentage}%
                              {product.riskDiscountSuggestion.currentDiscountPercentage != null
                                ? ` · Actual ${product.riskDiscountSuggestion.currentDiscountPercentage}%`
                                : ""}
                            </p>
                          </div>
                        ) : null}
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                          <div className="space-y-2">
                            <label htmlFor={`discount-${product.id}`} className="text-sm font-medium">
                              Descuento %
                            </label>
                            <Input
                              id={`discount-${product.id}`}
                              value={discountDraft}
                              onChange={(event) => setDiscountDraft(event.target.value)}
                              inputMode="decimal"
                              placeholder={product.riskDiscountSuggestion ? String(product.riskDiscountSuggestion.suggestedDiscountPercentage) : ""}
                              className="w-full lg:w-40"
                              disabled={discountSavingId === product.id}
                            />
                            <p className="text-xs text-muted">
                              Precio final: {formatCurrency(getDiscountedPrice(resolvePrice(product), discountDraft).finalPrice, product.currency || "ARS")}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={closeDiscountEditor} disabled={discountSavingId === product.id}>
                              Cancelar
                            </Button>
                            {product.riskDiscountSuggestion && product.riskDiscountSuggestion.canApply ? (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  const suggested = String(product.riskDiscountSuggestion?.suggestedDiscountPercentage || "");
                                  setDiscountDraft(suggested);
                                  void saveDiscount(product, suggested, {
                                    automationAttribution: {
                                      templateKey: "catalog_risk_discount",
                                      action: "apply_suggestion",
                                      suggestedDiscountPercentage: product.riskDiscountSuggestion?.suggestedDiscountPercentage || 0,
                                      source: "catalog_manager"
                                    }
                                  });
                                }}
                                disabled={discountSavingId === product.id}
                              >
                                Aplicar sugerencia
                              </Button>
                            ) : null}
                            {product.discountPercentage != null ? (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setDiscountDraft("");
                                  void saveDiscount(product, "");
                                }}
                                disabled={discountSavingId === product.id}
                              >
                                Quitar descuento
                              </Button>
                            ) : null}
                            <Button type="button" size="sm" onClick={() => void saveDiscount(product)} disabled={discountSavingId === product.id}>
                              {discountSavingId === product.id ? "Guardando..." : "Guardar descuento"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
                <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(135deg,rgba(16,24,36,0.92),rgba(9,15,24,0.96))] px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
                    <span>
                      Mostrando {pageStart}-{pageEnd} de {visibleProducts.length} producto{visibleProducts.length === 1 ? "" : "s"}
                    </span>
                    <span>{sortByUrgency ? "Ordenados por urgencia" : "Orden original"}</span>
                  </div>
                  {totalPages > 1 ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-full border border-white/8 px-4 disabled:opacity-40"
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={currentPageSafe === 1}
                      >
                        ←
                      </Button>
                      {paginationItems.map((item, index) => (
                        item === "ellipsis" ? (
                          <span key={`ellipsis-${index}`} className="px-2 text-sm text-muted">
                            ...
                          </span>
                        ) : (
                          <Button
                            key={item}
                            type="button"
                            variant={item === currentPageSafe ? "primary" : "ghost"}
                            size="sm"
                            className="min-w-10 rounded-full border border-white/8 px-4"
                            onClick={() => setCurrentPage(item)}
                          >
                            {item}
                          </Button>
                        )
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-full border border-white/8 px-4 disabled:opacity-40"
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        disabled={currentPageSafe === totalPages}
                      >
                        →
                      </Button>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        <Card id="catalog-create-section" className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.96))] shadow-[0_18px_40px_rgba(3,8,16,0.24)]">
          <CardHeader action={<Badge variant="warning">Atajos</Badge>}>
            <div>
              <CardTitle className="text-xl">Acciones rapidas</CardTitle>
              <CardDescription>Atajos para operar el catalogo sin salir de esta vista.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0 sm:grid-cols-2 xl:grid-cols-1">
            <QuickActionButton
              title="Nuevo producto"
              description="Alta rapida"
              onClick={() => {
                openQuickCreate(categoryFilter || null);
                scrollToSection("catalog-load-section");
              }}
              disabled={readOnly}
            />
            <QuickActionButton title="Importar productos" description="Carga masiva" onClick={openBulkImport} disabled={readOnly} />
            <QuickActionButton title="Exportar catalogo" description="Excel compatible" onClick={exportVisibleProducts} />
            <QuickActionButton title="Gestion de categorias" description="Orden comercial" onClick={() => scrollToSection("catalog-categories")} />
            <QuickActionButton
              title="Ver detalle"
              description={selectedProduct ? selectedProduct.name : "Selecciona un producto"}
              href={selectedProduct ? `/app/catalog/${selectedProduct.id}` : undefined}
              disabled={!selectedProduct}
            />
          </CardContent>
        </Card>

        <Card id="catalog-load-section" className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.96))] shadow-[0_18px_40px_rgba(3,8,16,0.24)]">
          <CardHeader
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="muted">{filteredCategoryRail.length} categorias</Badge>
                {filteredCategoryRail.length > 5 ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCategoriesExpanded((current) => !current)}>
                    {categoriesExpanded ? "Ver menos" : `Ver mas (${hiddenCategoryRailCount})`}
                  </Button>
                ) : null}
              </div>
            }
          >
            <div>
              <CardTitle className="text-xl">Categorias</CardTitle>
              <CardDescription>Gestiona categorias sin estirar el lateral: busca, filtra y actua desde un rail compacto.</CardDescription>
            </div>
          </CardHeader>
          <CardContent id="catalog-categories" className="space-y-4 pt-0">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                className="pl-10"
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                placeholder="Buscar categoria por nombre"
              />
            </div>
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
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
            ) : filteredCategoryRail.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/45 p-4 text-sm text-muted">
                No encontramos categorias para esa busqueda.
              </div>
            ) : (
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {visibleCategoryRail.map((category) => (
                  <div key={category.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/8 bg-[linear-gradient(135deg,rgba(16,24,36,0.92),rgba(9,15,24,0.96))] p-3">
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
                          {categoryFilter === category.id ? <Badge variant="outline">Filtrando catalogo</Badge> : null}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editingCategoryId === category.id ? null : (
                        <Button
                          type="button"
                          variant={categoryFilter === category.id ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setCategoryFilter((current) => (current === category.id ? "" : category.id))}
                        >
                          {categoryFilter === category.id ? "Quitar filtro" : "Ver productos"}
                        </Button>
                      )}
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

        <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.96))] shadow-[0_18px_40px_rgba(3,8,16,0.24)]">
          <CardHeader action={<Badge variant={mode === "bulk" ? "warning" : "muted"}>{mode === "bulk" ? "Carga masiva" : "Alta rapida"}</Badge>}>
            <div>
              <CardTitle className="text-xl">Sincronizacion y carga</CardTitle>
              <CardDescription>Alta individual o carga masiva para mantener el catalogo listo para el canal y el bot.</CardDescription>
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
              <Button type="button" variant={mode === "bulk" ? "primary" : "secondary"} size="sm" onClick={openBulkImport} disabled={readOnly}>
                Carga masiva
              </Button>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-[linear-gradient(135deg,rgba(16,24,36,0.92),rgba(9,15,24,0.96))] p-4">
              <p className="text-sm font-medium">Modo actual</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                {mode === "single"
                  ? "El formulario de alta rapida sigue disponible para crear productos sin salir del catalogo."
                  : "La carga masiva sigue disponible con previsualizacion y validacion antes de importar."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={mode === "single" ? () => scrollToSection("catalog-load-section") : openBulkImport} disabled={readOnly}>
                  {mode === "single" ? "Ir al formulario" : "Abrir importacion"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={exportVisibleProducts}>
                  Exportar visibles
                </Button>
              </div>
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subcategoria</label>
                  <Input
                    value={draft.subcategory}
                    onChange={(event) => setDraft((current) => ({ ...current, subcategory: event.target.value }))}
                    placeholder="Ej. Remeras, Celulares, Reparaciones"
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Marca</label>
                  <Input
                    value={draft.brand}
                    onChange={(event) => setDraft((current) => ({ ...current, brand: event.target.value }))}
                    placeholder="Ej. NovaTech"
                    disabled={readOnly}
                  />
                </div>
                <div className="rounded-[22px] border border-white/8 bg-surface/45 p-4">
                  <p className="text-sm font-semibold">Mas informacion comercial y operativa</p>
                  <p className="mt-1 text-sm leading-6 text-muted">Datos opcionales para compras, trazabilidad y presentacion interna.</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Fabricante</label>
                      <Input value={draft.manufacturer} onChange={(event) => setDraft((current) => ({ ...current, manufacturer: event.target.value }))} placeholder="Ej. Laboratorio Uno" disabled={readOnly} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Codigo de barras</label>
                      <Input value={draft.barcode} onChange={(event) => setDraft((current) => ({ ...current, barcode: event.target.value }))} placeholder="Ej. 7790000000012" disabled={readOnly} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Unidad de medida</label>
                      <Input value={draft.unitOfMeasure} onChange={(event) => setDraft((current) => ({ ...current, unitOfMeasure: event.target.value }))} placeholder="unidad, kg, ml" disabled={readOnly} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Costo</label>
                      <Input value={draft.cost} onChange={(event) => setDraft((current) => ({ ...current, cost: event.target.value }))} placeholder="0" inputMode="decimal" disabled={readOnly} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Proveedor habitual</label>
                      <Input value={draft.defaultSupplier} onChange={(event) => setDraft((current) => ({ ...current, defaultSupplier: event.target.value }))} placeholder="Ej. Distribuidora Norte" disabled={readOnly} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-[1fr_0.8fr]">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Peso</label>
                        <Input value={draft.weight} onChange={(event) => setDraft((current) => ({ ...current, weight: event.target.value }))} placeholder="0" inputMode="decimal" disabled={readOnly} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Unidad</label>
                        <Input value={draft.weightUnit} onChange={(event) => setDraft((current) => ({ ...current, weightUnit: event.target.value }))} placeholder="kg, g, ml" disabled={readOnly} />
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Presentacion</label>
                      <Input value={draft.presentation} onChange={(event) => setDraft((current) => ({ ...current, presentation: event.target.value }))} placeholder="Ej. Caja x 12, Botella 500ml" disabled={readOnly} />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Texto alternativo</label>
                  <Input
                    value={draft.imageAlt}
                    onChange={(event) => setDraft((current) => ({ ...current, imageAlt: event.target.value }))}
                    placeholder="Ej. Foto principal del producto"
                    disabled={readOnly || uploadingImage}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Subir imagen</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void handleImageUpload(event)} />
                    <Button type="button" variant="secondary" onClick={() => imageInputRef.current?.click()} disabled={readOnly || uploadingImage}>
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadingImage ? "Subiendo..." : "Subir imagen"}
                    </Button>
                    <p className="text-sm text-muted">
                      {draft.imageSource === "uploaded" ? "La imagen queda guardada en Opturon." : "Subi una foto para usarla como imagen principal del producto."}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
                  <p className="text-sm font-medium">Preview</p>
                  <div className="mt-3">
                    <CatalogProductImage product={{ image: buildCatalogImagePayload(draft.imageUrl, draft.imageAlt, draft.imageSource) }} size="lg" />
                  </div>
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
                  <label className="text-sm font-medium">Vencimiento opcional</label>
                  <Input
                    type="date"
                    value={draft.expirationDate}
                    onChange={(event) => setDraft((current) => ({ ...current, expirationDate: event.target.value }))}
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descripcion</label>
                  <Textarea className="min-h-[120px]" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Describe el producto de forma simple para el equipo y futuros flujos de venta." disabled={readOnly} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Atributos configurables</label>
                  <Textarea
                    className="min-h-[120px]"
                    value={draft.attributesText}
                    onChange={(event) => setDraft((current) => ({ ...current, attributesText: event.target.value }))}
                    placeholder={"Uno por linea\nTalle: M, L, XL\nColor: Negro, Blanco"}
                    disabled={readOnly}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button type="button" variant="ghost" onClick={() => startCreate(categoryFilter || null)} disabled={readOnly || uploadingImage}>
                    Limpiar
                  </Button>
                  <Button type="submit" disabled={readOnly || saving || uploadingImage}>
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

        <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.96))] shadow-[0_18px_40px_rgba(3,8,16,0.24)]">
          <CardHeader action={selectedProduct ? <Badge variant={resolveStatus(selectedProduct) === "active" ? "success" : "muted"}>{resolveStatus(selectedProduct) === "active" ? "Activo" : "Archivado"}</Badge> : null}>
            <div>
              <CardTitle className="text-xl">Vista rapida</CardTitle>
              <CardDescription>Contexto inmediato del producto seleccionado.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {!selectedProduct ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/45 p-5 text-sm text-muted">
                Selecciona un producto del listado para ver su detalle.
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-[24px] border border-[color:var(--border)] bg-surface/55">
                  <CatalogProductImage product={selectedProduct} size="detail" />
                </div>
                <DetailStat label="Producto" value={selectedProduct.name} />
                <div className="flex flex-wrap gap-2">
                  <Badge variant={resolveStatus(selectedProduct) === "active" ? "success" : "muted"}>
                    {resolveStatus(selectedProduct) === "active" ? "Activo" : "Archivado"}
                  </Badge>
                  <Badge variant={getStockState(resolveStock(selectedProduct)).variant}>{getStockState(resolveStock(selectedProduct)).label}</Badge>
                  <Badge variant={getExpirationBadgePresentation(selectedProduct.expirationDate).variant}>
                    {getExpirationBadgePresentation(selectedProduct.expirationDate).label}
                  </Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailStat label="Precio final" value={formatCurrency(getProductPricing(selectedProduct).finalPrice, selectedProduct.currency || "ARS")} />
                  <DetailStat label="Stock" value={String(resolveStock(selectedProduct))} />
                  <DetailStat label="Categoria" value={selectedProduct.categoryName || "Sin categoria"} />
                  <DetailStat label="Marca" value={selectedProduct.brand || "Sin marca"} />
                  <DetailStat label="SKU" value={selectedProduct.sku || "Sin SKU"} />
                </div>
                {!readOnly ? (
                  <Button asChild variant="secondary" size="sm" className="rounded-2xl">
                    <Link href={`/app/catalog/${selectedProduct.id}/edit`}>
                      <PencilLine className="mr-2 h-4 w-4" />
                      Editar producto
                    </Link>
                  </Button>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[image:var(--page-hero-gradient)] px-5 py-5 shadow-[var(--card-shadow)] lg:px-7 lg:py-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <Badge variant="warning">Catálogo comercial</Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Catálogo</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Gestiona productos, precios y categorías para mantener el catálogo listo para ventas, pedidos y respuestas del bot.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={exportVisibleProducts}>
              <Download className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
            <CatalogImportWizard
              disabled={readOnly}
              onImported={async () => {
                await reloadProducts(selectedId);
              }}
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => scrollToSection("catalog-categories")}>
              <FolderCog className="mr-2 h-4 w-4" />
              Configuración
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={readOnly}
              onClick={() => {
                openQuickCreate(categoryFilter || null);
                scrollToSection("catalog-load-section");
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo producto
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Boxes} label="Productos cargados" value={String(metrics.total)} helper="Base comercial disponible" accent="emerald" />
        <MetricCard
          icon={Package}
          label="Productos activos"
          value={String(metrics.active)}
          helper={`${metrics.total > 0 ? Math.round((metrics.active / metrics.total) * 100) : 0}% del total`}
          accent="blue"
        />
        <MetricCard icon={ScanLine} label="Productos archivados" value={String(metrics.archived)} helper="Pausados sin perder historial" accent="amber" />
        <MetricCard icon={Warehouse} label="Valor total inventario" value={formatCurrency(metrics.stockValue)} helper="Precio de venta estimado" accent="violet" />
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

      {renderCatalogWorkspacePremium()}
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

function getProductPricing(product: Product) {
  return getDiscountedPrice(resolvePrice(product), product.discountPercentage);
}

function resolveStock(product: Product) {
  return Number((product.stock ?? product.stockQty) || 0);
}

function resolveStatus(product: Product) {
  if (product.status) return product.status;
  return product.active === false ? "archived" : "active";
}

function getExpirationPriority(product: Product) {
  const status = getProductExpirationStatus(product.expirationDate);
  if (status?.state === "expired") return 0;
  if (status?.state === "critical") return 1;
  if (status?.state === "expiring_soon") return 2;
  if (status?.state === "normal") return 3;
  return 4;
}

function canApplyDirectDiscount(product: Product) {
  if (product.riskDiscountSuggestion) return true;
  if (product.discountPercentage != null) return true;
  const status = getProductExpirationStatus(product.expirationDate);
  return status?.state === "critical" || status?.state === "expiring_soon";
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  accent = "brand"
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper: string;
  accent?: "brand" | "emerald" | "blue" | "amber" | "violet";
}) {
  const accentClasses = {
    brand: "border-white/10 bg-surface/80 text-brandBright",
    emerald: "border-emerald-500/20 bg-emerald-500/12 text-emerald-300",
    blue: "border-blue-500/20 bg-blue-500/12 text-blue-300",
    amber: "border-amber-500/20 bg-amber-500/12 text-amber-300",
    violet: "border-violet-500/20 bg-violet-500/12 text-violet-300"
  } as const;
  return (
    <Card className="border-white/6 bg-card/90">
      <CardContent className="flex items-start gap-4 p-5">
        <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border ${accentClasses[accent]}`}>
          <Icon className="h-5 w-5" />
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

function QuickActionButton({
  title,
  description,
  onClick,
  href,
  disabled = false
}: {
  title: string;
  description: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}) {
  const classes =
      "flex min-h-[92px] flex-col items-start justify-between rounded-[22px] border border-white/8 bg-[linear-gradient(135deg,rgba(14,23,37,0.96),rgba(8,14,24,0.94))] p-4 text-left shadow-[0_14px_30px_rgba(3,8,16,0.24)] transition-colors hover:border-white/14 hover:bg-[linear-gradient(135deg,rgba(18,28,44,0.98),rgba(9,16,28,0.96))]";

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted">{description}</span>
      </Link>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick} disabled={disabled}>
      <span className="text-sm font-medium">{title}</span>
      <span className="text-xs text-muted">{description}</span>
    </button>
  );
}

function escapeCsvValue(value: string) {
  const normalized = String(value ?? "");
  if (normalized.includes(";") || normalized.includes('"') || normalized.includes("\n")) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
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

function CatalogProductImage({
  product,
  size = "sm"
}: {
  product: { name?: string; image?: Product["image"] | null };
  size?: "sm" | "lg" | "detail";
}) {
  const image = product?.image;
  const hasImage = Boolean(image?.url);
  const alt = image?.alt || product?.name || "Imagen del producto";
  const className =
    size === "detail"
      ? "aspect-[16/10] w-full object-cover"
      : size === "lg"
        ? "h-40 w-full rounded-2xl object-cover"
        : "h-24 w-24 shrink-0 rounded-[22px] object-cover";
  const fallbackClassName =
    size === "detail"
      ? "flex aspect-[16/10] w-full items-center justify-center bg-[linear-gradient(135deg,rgba(176,80,0,0.18),rgba(255,255,255,0.04))] text-sm font-medium text-muted"
      : size === "lg"
        ? "flex h-40 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(176,80,0,0.18),rgba(255,255,255,0.04))] text-sm font-medium text-muted"
        : "flex h-24 w-24 shrink-0 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,rgba(176,80,0,0.18),rgba(255,255,255,0.04))] text-xs font-medium uppercase tracking-[0.16em] text-muted";

  if (hasImage) {
    return <img src={image?.url || ""} alt={alt} className={className} loading="lazy" />;
  }

  return <div className={fallbackClassName}>{size === "sm" ? "Sin imagen" : "Preview no disponible"}</div>;
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

function parseAttributesText(value: string) {
  return value.split(/\r?\n/).reduce<Record<string, string | number | boolean>>((accumulator, line) => {
    const normalized = line.trim();
    if (!normalized) return accumulator;
    const [namePart, ...valueParts] = normalized.split(":");
    const name = String(namePart || "").trim();
    const itemValue = valueParts.join(":").trim();
    if (name && itemValue) accumulator[name] = itemValue;
    return accumulator;
  }, {});
}

function formatAttributesText(attributes?: Product["attributes"]) {
  if (!attributes) return "";
  if (Array.isArray(attributes)) {
    return attributes
      .filter((attribute) => attribute?.name && Array.isArray(attribute.options) && attribute.options.length > 0)
      .map((attribute) => `${attribute.name}: ${attribute.options.join(", ")}`)
      .join(" | ");
  }
  if (typeof attributes !== "object") return "";
  return Object.entries(attributes)
    .filter(([key, value]) => key && value !== null && value !== undefined && String(value).trim())
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" | ");
}


