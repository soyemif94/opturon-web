"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Box, Plus, Search, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { PortalContact, PortalOrder, PortalPaymentDestination } from "@/lib/api";
import { getStockState } from "@/lib/stock-state";

type CatalogProduct = {
  id: string;
  name: string;
  sku?: string | null;
  price: number;
  currency?: string;
  stock?: number;
  stockQty?: number;
  status?: string;
  active?: boolean;
  image?: {
    url?: string | null;
  } | null;
};

type AssignableSeller = {
  id: string;
  name: string;
  role: string | null;
};

type OrderFormState = {
  customerType: "registered_contact" | "final_consumer";
  contactId: string;
  sellerUserId: string;
  paymentDestinationId: string;
  notes: string;
  productId: string;
  quantity: string;
};

const initialForm: OrderFormState = {
  customerType: "registered_contact",
  contactId: "",
  sellerUserId: "",
  paymentDestinationId: "",
  notes: "",
  productId: "",
  quantity: "1"
};

export function OrderCreateEditor() {
  const router = useRouter();
  const [form, setForm] = useState<OrderFormState>(initialForm);
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [contacts, setContacts] = useState<PortalContact[]>([]);
  const [sellers, setSellers] = useState<AssignableSeller[]>([]);
  const [paymentDestinations, setPaymentDestinations] = useState<PortalPaymentDestination[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedProduct = useMemo(() => products.find((product) => product.id === form.productId) || null, [form.productId, products]);
  const selectedContact = useMemo(() => contacts.find((contact) => contact.id === form.contactId) || null, [contacts, form.contactId]);
  const selectedSeller = useMemo(() => sellers.find((seller) => seller.id === form.sellerUserId) || null, [form.sellerUserId, sellers]);
  const selectedDestination = useMemo(
    () => paymentDestinations.find((destination) => destination.id === form.paymentDestinationId) || null,
    [form.paymentDestinationId, paymentDestinations]
  );
  const visibleProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    const filtered = query
      ? products.filter((product) => {
          const haystack = [product.name, product.sku, String(product.price)].filter(Boolean).join(" ").toLowerCase();
          return haystack.includes(query);
        })
      : products;

    return filtered.slice().sort((left, right) => Number(resolveProductStock(right) > resolveProductStock(left))).slice(0, 5);
  }, [productSearch, products]);

  const requestedQuantity = Number.parseInt(form.quantity, 10);
  const selectedProductIsActive = selectedProduct ? resolveProductStatus(selectedProduct) === "active" : false;
  const selectedProductStock = selectedProduct ? resolveProductStock(selectedProduct) : 0;
  const selectedProductPrice = selectedProduct ? resolveProductPrice(selectedProduct) : 0;
  const selectedStockState = getStockState(selectedProductStock);
  const visibleTotal = selectedProduct && Number.isInteger(requestedQuantity) && requestedQuantity > 0 ? Number((selectedProductPrice * requestedQuantity).toFixed(2)) : 0;

  const hasInvalidQuantity = !Number.isInteger(requestedQuantity) || requestedQuantity <= 0;
  const hasInactiveProduct = Boolean(selectedProduct) && !selectedProductIsActive;
  const hasNoPrice = Boolean(selectedProduct) && selectedProductPrice <= 0;
  const hasNoStock = Boolean(selectedProduct) && selectedProductStock <= 0;
  const hasInsufficientStock = Boolean(selectedProduct) && Number.isInteger(requestedQuantity) && requestedQuantity > selectedProductStock;
  const createBlockedByStock = hasInactiveProduct || hasNoPrice || hasNoStock || hasInsufficientStock;

  useEffect(() => {
    let cancelled = false;

    async function loadDependencies() {
      try {
        const [catalogResponse, contactsResponse, metaResponse] = await Promise.all([
          fetch("/api/app/catalog", { cache: "no-store" }),
          fetch("/api/app/contacts", { cache: "no-store" }),
          fetch("/api/app/orders/meta", { cache: "no-store" })
        ]);

        const [catalogJson, contactsJson, metaJson] = await Promise.all([
          catalogResponse.json().catch(() => null),
          contactsResponse.json().catch(() => null),
          metaResponse.json().catch(() => null)
        ]);

        if (!catalogResponse.ok) throw new Error(catalogJson?.details || catalogJson?.error || "No se pudo cargar el catalogo.");
        if (!contactsResponse.ok) throw new Error(contactsJson?.details || contactsJson?.error || "No se pudo cargar la lista de clientes.");
        if (!metaResponse.ok) throw new Error(metaJson?.details || metaJson?.error || "No se pudo cargar el equipo de ventas.");

        if (cancelled) return;

        const nextProducts = Array.isArray(catalogJson?.products) ? (catalogJson.products as CatalogProduct[]) : [];
        const nextContacts = Array.isArray(contactsJson?.contacts) ? (contactsJson.contacts as PortalContact[]) : [];
        const nextSellers = Array.isArray(metaJson?.sellers) ? (metaJson.sellers as AssignableSeller[]) : [];
        const nextPaymentDestinations = Array.isArray(metaJson?.paymentDestinations)
          ? (metaJson.paymentDestinations as PortalPaymentDestination[])
          : [];
        const currentUserId = typeof metaJson?.currentUserId === "string" ? metaJson.currentUserId : "";

        const defaultProduct = nextProducts.find((product) => resolveProductStatus(product) === "active") || nextProducts[0] || null;
        const defaultSeller =
          (currentUserId && nextSellers.find((seller) => seller.id === currentUserId)) || nextSellers[0] || null;

        setProducts(nextProducts);
        setContacts(nextContacts);
        setSellers(nextSellers);
        setPaymentDestinations(nextPaymentDestinations);
        setForm((current) => ({
          ...current,
          productId: current.productId || defaultProduct?.id || "",
          contactId: current.contactId || nextContacts[0]?.id || "",
          sellerUserId: current.sellerUserId || defaultSeller?.id || ""
        }));
      } catch (error) {
        toast.error("No se pudo preparar el alta", error instanceof Error ? error.message : "unknown_error");
      } finally {
        if (!cancelled) {
          setProductsLoading(false);
          setContactsLoading(false);
          setMetaLoading(false);
        }
      }
    }

    void loadDependencies();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.customerType === "registered_contact" && !form.contactId.trim()) {
      toast.error("Cliente requerido", "Selecciona un cliente existente para registrar el pedido.");
      return;
    }
    if (!form.sellerUserId.trim()) {
      toast.error("Vendedor requerido", "Selecciona el vendedor responsable del pedido.");
      return;
    }
    if (!form.productId || !selectedProduct) {
      toast.error("Producto requerido", "Selecciona un producto del catalogo.");
      return;
    }
    if (!selectedProductIsActive) {
      toast.error("Producto inactivo", "Activa el producto en catalogo para usarlo en pedidos.");
      return;
    }
    if (selectedProductPrice <= 0) {
      toast.error("Precio invalido", `El producto ${selectedProduct.name} no tiene un precio valido cargado.`);
      return;
    }
    if (hasInvalidQuantity) {
      toast.error("Cantidad invalida", "La cantidad del producto debe ser mayor a cero.");
      return;
    }
    if (selectedProductStock <= 0) {
      toast.error("Sin stock", "El producto seleccionado no tiene stock disponible.");
      return;
    }
    if (requestedQuantity > selectedProductStock) {
      toast.error("Stock insuficiente", `No hay stock suficiente para ${selectedProduct.name}. Disponible: ${selectedProductStock}.`);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/app/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerType: form.customerType,
          contactId: form.customerType === "registered_contact" ? form.contactId : null,
          sellerUserId: form.sellerUserId,
          paymentDestinationId: form.paymentDestinationId || null,
          source: "manual",
          notes: form.notes.trim(),
          items: [{ productId: form.productId, quantity: requestedQuantity }]
        })
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(humanizeOrderError(json) || "No se pudo crear el pedido.");
      }

      const createdOrder = (json?.order as PortalOrder | null) || null;
      toast.success("Pedido creado", "El pedido ya quedo registrado con datos reales.");
      router.push(createdOrder?.id ? `/app/orders?orderId=${encodeURIComponent(createdOrder.id)}` : "/app/orders");
      router.refresh();
    } catch (error) {
      toast.error("No se pudo crear el pedido", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setSaving(false);
    }
  }

  function resetDraft() {
    setForm((current) => ({
      ...initialForm,
      customerType: current.customerType,
      contactId: current.customerType === "registered_contact" ? current.contactId : "",
      sellerUserId: current.sellerUserId,
      paymentDestinationId: current.paymentDestinationId
    }));
    setProductSearch("");
  }

  return (
    <form id="order-create-form" className="space-y-6" onSubmit={submitOrder}>
      <section className="rounded-[30px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(11,18,29,0.96),rgba(8,14,23,0.94))] p-5 shadow-[var(--card-shadow)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>Pedidos</span>
            <span>›</span>
            <span className="text-text">Nuevo pedido</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" className="rounded-2xl" onClick={resetDraft} disabled={saving}>
              Descartar
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <SummaryChip icon={UserRound} accent="text-sky-300" label="Cliente seleccionado" value={form.customerType === "final_consumer" ? "Consumidor final" : selectedContact?.name || "Pendiente"} helper={selectedContact?.phone || "Sin telefono"} />
        <SummaryChip icon={UserRound} accent="text-orange-300" label="Vendedor responsable" value={selectedSeller?.name || "Pendiente"} helper={selectedSeller?.role || "Sin rol visible"} />
        <SummaryChip icon={Banknote} accent="text-emerald-300" label="Destino de cobro" value={selectedDestination?.name || "Sin definir"} helper={selectedDestination?.type ? labelForPaymentDestinationType(selectedDestination.type) : "Sin tipo"} />
        <SummaryChip icon={Box} accent="text-fuchsia-300" label="Items agregados" value={selectedProduct ? "1 producto" : "0 productos"} helper={selectedProduct ? `${requestedQuantity > 0 ? requestedQuantity : 0} unidad(es)` : "Sin items"} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <SectionCard title="Cliente y responsable" description="Define quien compra, quien responde y donde queda trazado el cobro." badge="Base comercial">
            <div className="grid gap-4">
              <FieldBlock label="Tipo de cliente">
                <select
                  className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                  value={form.customerType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      customerType: event.target.value as OrderFormState["customerType"],
                      contactId: event.target.value === "registered_contact" ? current.contactId : ""
                    }))
                  }
                  disabled={saving}
                >
                  <option value="registered_contact">Cliente existente</option>
                  <option value="final_consumer">Consumidor final</option>
                </select>
              </FieldBlock>

              {form.customerType === "registered_contact" ? (
                <FieldBlock label="Cliente">
                  <select
                    className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                    value={form.contactId}
                    onChange={(event) => setForm((current) => ({ ...current, contactId: event.target.value }))}
                    disabled={contactsLoading || saving}
                  >
                    <option value="">{contactsLoading ? "Cargando clientes..." : "Selecciona un cliente"}</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name}{contact.phone ? ` · ${contact.phone}` : ""}
                      </option>
                    ))}
                  </select>
                </FieldBlock>
              ) : (
                <div className="rounded-[20px] border border-dashed border-[color:var(--border)] bg-surface/45 p-4 text-sm text-muted">
                  El pedido se registrara como <span className="font-medium text-text">Consumidor final</span> sin exigir nombre ni telefono.
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <FieldBlock label="Vendedor responsable">
                  <select
                    className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                    value={form.sellerUserId}
                    onChange={(event) => setForm((current) => ({ ...current, sellerUserId: event.target.value }))}
                    disabled={metaLoading || saving}
                  >
                    <option value="">{metaLoading ? "Cargando vendedores..." : "Selecciona un vendedor"}</option>
                    {sellers.map((seller) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.name}
                      </option>
                    ))}
                  </select>
                </FieldBlock>

                <FieldBlock label="Destino de cobro">
                  <select
                    className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                    value={form.paymentDestinationId}
                    onChange={(event) => setForm((current) => ({ ...current, paymentDestinationId: event.target.value }))}
                    disabled={metaLoading || saving}
                  >
                    <option value="">Sin definir por ahora</option>
                    {paymentDestinations.map((destination) => (
                      <option key={destination.id} value={destination.id}>
                        {destination.name}
                      </option>
                    ))}
                  </select>
                </FieldBlock>
              </div>

              <FieldBlock label="Notas">
                <Textarea
                  className="min-h-[140px]"
                  placeholder="Instrucciones de preparacion, retiro, entrega o acuerdos comerciales..."
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  disabled={saving}
                />
              </FieldBlock>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Agregar productos" description="Busca dentro del catalogo actual y usa stock y precio reales." badge="Centro operativo">
            <div className="grid gap-4">
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input
                    className="pl-10"
                    placeholder="Buscar producto por nombre, SKU o codigo..."
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <select
                    className="h-10 min-w-[220px] rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                    value={form.productId}
                    onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}
                    disabled={productsLoading || saving}
                  >
                    <option value="">{productsLoading ? "Cargando catalogo..." : "Selecciona un producto"}</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}{product.sku ? ` · ${product.sku}` : ""}{resolveProductStatus(product) === "active" ? "" : " · Inactivo"}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-2xl"
                    disabled={!selectedProduct}
                    onClick={() => {
                      if (!selectedProduct) return;
                      setProductSearch(selectedProduct.name);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {visibleProducts.map((product) => {
                  const stock = resolveProductStock(product);
                  const stockState = getStockState(stock);
                  const isSelected = form.productId === product.id;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, productId: product.id }))}
                      className={`w-full rounded-[22px] border p-4 text-left transition-colors ${
                        isSelected
                          ? "border-brand/30 bg-[linear-gradient(180deg,rgba(255,128,0,0.08),rgba(10,17,30,0.35))]"
                          : "border-[color:var(--border)] bg-surface/45 hover:bg-surface/65"
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                          <ProductThumb name={product.name} imageUrl={product.image?.url || null} />
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-text">{product.name}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                              <Badge variant={stockState.variant}>{stockState.label}</Badge>
                              <span>Stock: {stock}</span>
                              {product.sku ? <span>{product.sku}</span> : null}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-base font-semibold text-text">{formatCurrency(resolveProductPrice(product), product.currency || "ARS")}</p>
                          <Button type="button" size="sm" className="rounded-2xl" variant={isSelected ? "secondary" : "primary"} onClick={() => setForm((current) => ({ ...current, productId: product.id }))}>
                            {isSelected ? "Agregado" : "Agregar"}
                          </Button>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </SectionCard>

          <SectionCard title={`Productos agregados (${selectedProduct ? 1 : 0})`} description="Mesa comercial compacta con el item actualmente preparado para enviar." badge="Resumen comercial">
            {!selectedProduct ? (
              <div className="rounded-[22px] border border-dashed border-[color:var(--border)] bg-surface/45 p-6 text-sm text-muted">
                Selecciona un producto del catalogo para preparar el pedido.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-[minmax(0,1.3fr)_160px_140px_180px] gap-3 rounded-[18px] border border-[color:var(--border)] bg-white/[0.03] px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-muted">
                  <span>Producto</span>
                  <span>Precio unitario</span>
                  <span>Cantidad</span>
                  <span>Subtotal</span>
                </div>
                <div className="grid grid-cols-[minmax(0,1.3fr)_160px_140px_180px] gap-3 rounded-[22px] border border-[color:var(--border)] bg-surface/50 px-4 py-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <ProductThumb name={selectedProduct.name} imageUrl={selectedProduct.image?.url || null} />
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-text">{selectedProduct.name}</p>
                      <p className="mt-1 text-sm text-muted">{selectedProduct.sku || "Sin codigo"}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-sm font-medium text-text">{formatCurrency(selectedProductPrice, selectedProduct.currency || "ARS")}</div>
                  <div className="flex items-center">
                    <div className="flex h-11 items-center rounded-2xl border border-[color:var(--border)] bg-bg/55 px-2">
                      <button
                        type="button"
                        className="h-8 w-8 rounded-xl text-lg text-text transition hover:bg-white/5"
                        onClick={() => setForm((current) => ({ ...current, quantity: String(Math.max(Number.parseInt(current.quantity || "1", 10) - 1, 1)) }))}
                      >
                        -
                      </button>
                      <Input
                        className="h-8 w-14 border-0 bg-transparent px-0 text-center"
                        value={form.quantity}
                        onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                        inputMode="numeric"
                      />
                      <button
                        type="button"
                        className="h-8 w-8 rounded-xl text-lg text-text transition hover:bg-white/5"
                        onClick={() => setForm((current) => ({ ...current, quantity: String(Math.max(Number.parseInt(current.quantity || "0", 10) + 1, 1)) }))}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center text-base font-semibold text-text">{formatCurrency(visibleTotal, selectedProduct.currency || "ARS")}</div>
                </div>

                <div className="rounded-[22px] border border-dashed border-[color:var(--border)] bg-surface/35 p-5 text-sm text-muted">
                  {selectedProduct && createBlockedByStock
                    ? hasInactiveProduct
                      ? "Este producto esta inactivo en catalogo."
                      : hasNoPrice
                        ? "Este producto no tiene un precio valido cargado."
                        : hasNoStock
                          ? "Este producto no tiene stock disponible."
                          : `La cantidad solicitada supera el stock disponible (${selectedProductStock}).`
                    : "Todos los datos utilizados son reales y provienen del sistema actual."}
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <Card className="border-white/6 bg-[linear-gradient(180deg,rgba(16,24,35,0.92),rgba(18,18,18,0.9))] shadow-[var(--card-shadow)]">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Resumen del pedido</CardTitle>
                <CardDescription>Lectura ejecutiva antes de confirmar el alta.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="space-y-3 rounded-[20px] border border-[color:var(--border)] bg-surface/55 p-4">
                <SummaryRow label="Subtotal" value={selectedProduct ? formatCurrency(visibleTotal, selectedProduct.currency || "ARS") : "$ 0,00"} />
                <SummaryRow label="Descuentos" value="$ 0,00" />
                <SummaryRow label="Impuestos" value="$ 0,00" />
                <div className="border-t border-[color:var(--border)] pt-3">
                  <SummaryRow label="TOTAL" value={selectedProduct ? formatCurrency(visibleTotal, selectedProduct.currency || "ARS") : "$ 0,00"} emphasis />
                </div>
              </div>
              <MiniStat label="Cliente" value={form.customerType === "final_consumer" ? "Consumidor final" : selectedContact?.name || "Pendiente"} />
              <MiniStat label="Responsable" value={selectedSeller?.name || "Pendiente"} />
              <MiniStat label="Cobro" value={selectedDestination?.name || "Sin definir"} />
              <MiniStat label="Estado inicial" value="Pendiente" />
              <div className="rounded-[20px] border border-[color:var(--border)] bg-surface/55 p-4 text-sm text-muted">
                El alta sigue usando exactamente el endpoint actual de pedidos, con stock, cliente, vendedor y destino de cobro reales.
              </div>
              <Button
                type="submit"
                className="w-full rounded-2xl"
                disabled={
                  saving ||
                  !selectedProduct ||
                  hasInvalidQuantity ||
                  createBlockedByStock ||
                  !form.sellerUserId ||
                  (form.customerType === "registered_contact" && !form.contactId)
                }
              >
                {saving ? "Creando..." : "Crear pedido"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

function resolveProductStatus(product: CatalogProduct) {
  if (product.status) return product.status;
  return product.active === false ? "inactive" : "active";
}

function resolveProductPrice(product: CatalogProduct) {
  return Number(product.price || 0);
}

function resolveProductStock(product: CatalogProduct) {
  return Number((product.stock ?? product.stockQty) || 0);
}

function formatCurrency(value: number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);
}

function humanizeOrderError(payload: any) {
  if (!payload || typeof payload !== "object") return null;
  if (typeof payload.details === "string" && payload.details.trim()) return payload.details;

  switch (payload.error) {
    case "missing_contact_id":
      return "Selecciona un cliente existente para registrar el pedido.";
    case "missing_seller_user_id":
      return "Selecciona el vendedor responsable del pedido.";
    case "seller_user_not_found":
      return "El vendedor seleccionado ya no esta disponible.";
    case "payment_destination_not_found":
      return "El destino de cobro seleccionado ya no existe.";
    case "payment_destination_inactive":
      return "El destino de cobro seleccionado esta inactivo.";
    case "order_item_insufficient_stock":
      return "No hay stock suficiente para el producto seleccionado.";
    case "order_item_product_inactive":
    case "order_item_product_archived":
      return "El producto seleccionado esta inactivo.";
    case "order_item_product_not_found":
      return "El producto seleccionado ya no existe.";
    default:
      return typeof payload.error === "string" ? payload.error : null;
  }
}

function SectionCard({
  title,
  description,
  badge,
  children
}: {
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.94))] shadow-[0_20px_50px_rgba(3,8,16,0.22)]">
      <CardHeader action={badge ? <Badge variant="warning">{badge}</Badge> : null}>
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function FieldBlock({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[color:var(--border)] bg-bg/45 p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-medium text-text">{value}</p>
    </div>
  );
}

function SummaryChip({
  icon: Icon,
  accent,
  label,
  value,
  helper
}: {
  icon: typeof UserRound;
  accent: string;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card className="border-white/6 bg-card/90">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-surface/70 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
          <p className="mt-2 truncate text-base font-semibold text-text">{value}</p>
          <p className="mt-1 truncate text-sm text-muted">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductThumb({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  if (imageUrl) {
    return <img src={imageUrl} alt={name} className="h-14 w-14 rounded-[16px] border border-[color:var(--border)] object-cover" />;
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-[16px] border border-[color:var(--border)] bg-brand/10 text-sm font-semibold text-brandBright">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function SummaryRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-sm ${emphasis ? "font-semibold text-text" : "text-muted"}`}>{label}</span>
      <span className={emphasis ? "text-[1.9rem] font-semibold text-brandBright" : "text-sm font-medium text-text"}>{value}</span>
    </div>
  );
}

function labelForPaymentDestinationType(type: string | null | undefined) {
  switch (type) {
    case "bank":
      return "Banco";
    case "wallet":
      return "Billetera";
    case "cash_box":
      return "Caja";
    case "other":
      return "Otro";
    default:
      return "Sin tipo";
  }
}
