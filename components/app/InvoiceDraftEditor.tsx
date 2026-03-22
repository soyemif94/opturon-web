"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MinusCircle, Plus, ReceiptText, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import type { PortalContactDetail, PortalInvoice } from "@/lib/api";
import {
  BILLING_CURRENCY_OPTIONS,
  BILLING_DOCUMENT_SELECTOR_OPTIONS,
  calculateInvoiceLineAmounts,
  formatMoney,
  getInvoiceDocumentKindLabel,
  normalizePaymentMethodValue,
  normalizeCurrencyCode,
  parseLocalizedMoneyInput,
  PAYMENT_METHOD_OPTIONS,
  quantizeMoney
} from "@/lib/billing";

type DraftItem = {
  id: string;
  descriptionSnapshot: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
};

type DraftState = {
  contactId: string;
  currency: string;
  type: "invoice" | "credit_note";
  documentKind: string;
  parentInvoiceId: string;
  initialPaymentStatus: "unpaid" | "partial" | "paid";
  initialPaymentAmount: string;
  initialPaymentMethod: string;
  items: DraftItem[];
};

const EMPTY_ITEM: DraftItem = {
  id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  descriptionSnapshot: "",
  quantity: "1",
  unitPrice: "",
  taxRate: "0"
};

function parseDraftDecimal(value: string | number | null | undefined) {
  const numeric = parseLocalizedMoneyInput(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function buildInitialState(invoice?: PortalInvoice | null, parentInvoice?: PortalInvoice | null): DraftState {
  const inferredType = (invoice?.type || (parentInvoice ? "credit_note" : "invoice")) as "invoice" | "credit_note";
  const initialPaymentPlan =
    invoice?.metadata && typeof invoice.metadata === "object" && !Array.isArray(invoice.metadata)
      ? (invoice.metadata.initialPaymentPlan as Record<string, unknown> | undefined)
      : undefined;
  const initialPaymentStatus =
    typeof initialPaymentPlan?.status === "string" &&
    ["unpaid", "partial", "paid"].includes(initialPaymentPlan.status)
      ? (initialPaymentPlan.status as "unpaid" | "partial" | "paid")
      : "unpaid";
  const seedItems =
    invoice?.items?.length
      ? invoice.items.map((item) => ({
          id: item.id,
          descriptionSnapshot: item.descriptionSnapshot,
          quantity: String(item.quantity),
          unitPrice: inferredType === "credit_note" ? String(Math.abs(Number(item.unitPrice || 0))) : String(item.unitPrice),
          taxRate: String(item.taxRate)
        }))
      : parentInvoice?.items?.length
        ? parentInvoice.items.map((item) => ({
            id: `seed_${item.id}`,
            descriptionSnapshot: item.descriptionSnapshot,
            quantity: String(item.quantity),
            unitPrice: String(Math.abs(Number(item.unitPrice || 0))),
            taxRate: String(item.taxRate)
          }))
        : [{ ...EMPTY_ITEM }];

  return {
    contactId: invoice?.contactId || parentInvoice?.contactId || "",
    currency: normalizeCurrencyCode(invoice?.currency || parentInvoice?.currency || "ARS"),
    type: inferredType,
    documentKind:
      typeof invoice?.metadata?.documentKind === "string"
        ? invoice.metadata.documentKind
        : typeof parentInvoice?.metadata?.documentKind === "string"
          ? parentInvoice.metadata.documentKind
          : "internal_invoice",
    parentInvoiceId: invoice?.parentInvoiceId || parentInvoice?.id || "",
    initialPaymentStatus: inferredType === "credit_note" ? "unpaid" : initialPaymentStatus,
    initialPaymentAmount:
      inferredType === "credit_note" || initialPaymentStatus !== "partial"
        ? ""
        : typeof initialPaymentPlan?.amount === "number"
          ? String(initialPaymentPlan.amount)
          : "",
    initialPaymentMethod:
      inferredType === "credit_note"
        ? "bank_transfer"
        : normalizePaymentMethodValue(typeof initialPaymentPlan?.method === "string" ? initialPaymentPlan.method : "bank_transfer") || "bank_transfer",
    items: seedItems
  };
}

export function InvoiceDraftEditor({
  contacts,
  invoice = null,
  parentInvoice: initialParentInvoice = null,
  availableParentInvoices = []
}: {
  contacts: PortalContactDetail[];
  invoice?: PortalInvoice | null;
  parentInvoice?: PortalInvoice | null;
  availableParentInvoices?: PortalInvoice[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftState>(buildInitialState(invoice, initialParentInvoice));
  const [saving, setSaving] = useState(false);
  const [selectedParentInvoice, setSelectedParentInvoice] = useState<PortalInvoice | null>(initialParentInvoice);
  const isCreditNote = draft.type === "credit_note";
  const documentSelectorValue = isCreditNote ? "credit_note" : draft.documentKind;
  const parentInvoice = selectedParentInvoice ?? initialParentInvoice;

  const computed = useMemo(() => {
    const items = draft.items.map((item) => {
      const quantity = parseDraftDecimal(item.quantity);
      const enteredUnitPrice = parseDraftDecimal(item.unitPrice);
      const unitPrice = isCreditNote ? -Math.abs(enteredUnitPrice) : enteredUnitPrice;
      const taxRate = parseDraftDecimal(item.taxRate);
      const amounts = calculateInvoiceLineAmounts({ quantity, unitPrice, taxRate });

      return {
        ...item,
        quantityNumber: quantity,
        enteredUnitPriceNumber: enteredUnitPrice,
        unitPriceNumber: unitPrice,
        taxRateNumber: taxRate,
        subtotalAmount: amounts.subtotalAmount,
        totalAmount: amounts.totalAmount
      };
    });

    const subtotalAmount = quantizeMoney(items.reduce((sum, item) => sum + item.subtotalAmount, 0));
    const totalAmount = quantizeMoney(items.reduce((sum, item) => sum + item.totalAmount, 0));
    const taxAmount = quantizeMoney(totalAmount - subtotalAmount);

    return {
      items,
      subtotalAmount,
      taxAmount,
      totalAmount
    };
  }, [draft, isCreditNote]);

  useEffect(() => {
    setSelectedParentInvoice(initialParentInvoice);
  }, [initialParentInvoice]);

  useEffect(() => {
    if (!isCreditNote || !draft.parentInvoiceId || selectedParentInvoice?.id === draft.parentInvoiceId) {
      return;
    }

    let cancelled = false;
    async function loadParentInvoice() {
      try {
        const response = await fetch(`/api/app/invoices/${draft.parentInvoiceId}`, { cache: "no-store" });
        const json = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(String(json?.error || "No se pudo cargar la factura origen."));
        }

        const nextParentInvoice = json?.invoice as PortalInvoice | undefined;
        if (!cancelled && nextParentInvoice?.id) {
          setSelectedParentInvoice(nextParentInvoice);
          setDraft((current) => ({
            ...current,
            contactId: nextParentInvoice.contactId || current.contactId,
            currency: normalizeCurrencyCode(nextParentInvoice.currency || current.currency),
            items: Array.isArray(nextParentInvoice.items) && nextParentInvoice.items.length
              ? nextParentInvoice.items.map((item) => ({
                  id: `seed_${item.id}`,
                  descriptionSnapshot: item.descriptionSnapshot,
                  quantity: String(item.quantity),
                  unitPrice: String(Math.abs(Number(item.unitPrice || 0))),
                  taxRate: String(item.taxRate)
                }))
              : current.items
          }));
        }
      } catch (error) {
        if (!cancelled) {
          toast.error("No se pudo cargar la factura origen", error instanceof Error ? error.message : "unknown_error");
        }
      }
    }

    void loadParentInvoice();
    return () => {
      cancelled = true;
    };
  }, [draft.parentInvoiceId, isCreditNote, selectedParentInvoice]);

  function updateItem(itemId: string, patch: Partial<DraftItem>) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
    }));
  }

  function addItem() {
    setDraft((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          ...EMPTY_ITEM,
          id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        }
      ]
    }));
  }

  function removeItem(itemId: string) {
    setDraft((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== itemId).length
        ? current.items.filter((item) => item.id !== itemId)
        : [{ ...EMPTY_ITEM, id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }]
    }));
  }

  async function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validItems = computed.items.filter((item) => item.descriptionSnapshot.trim());
    if (!draft.contactId) {
      toast.error("Contacto requerido", "Selecciona un contacto antes de guardar el comprobante.");
      return;
    }
    if (!validItems.length) {
      toast.error("Items requeridos", "Agrega al menos un item con descripcion.");
      return;
    }
    if (validItems.some((item) => !Number.isFinite(item.quantityNumber) || item.quantityNumber <= 0)) {
      toast.error("Cantidad invalida", "Cada item debe tener una cantidad mayor a cero.");
      return;
    }
    if (validItems.some((item) => !Number.isFinite(item.enteredUnitPriceNumber) || item.enteredUnitPriceNumber < 0)) {
      toast.error("Precio invalido", "Cada item necesita un precio valido.");
      return;
    }
    if (isCreditNote && !draft.parentInvoiceId) {
      toast.error("Comprobante origen requerido", "Selecciona el comprobante emitido sobre el que vas a crear la nota de credito.");
      return;
    }
    const absoluteTotal = Math.abs(Number(computed.totalAmount || 0));
    const initialPaymentAmount = parseLocalizedMoneyInput(draft.initialPaymentAmount);
    if (!isCreditNote && draft.initialPaymentStatus === "partial") {
      if (!Number.isFinite(initialPaymentAmount) || initialPaymentAmount <= 0) {
        toast.error("Cobro inicial invalido", "Ingresa un monto inicial mayor a cero.");
        return;
      }
      if (initialPaymentAmount > absoluteTotal) {
        toast.error("Cobro inicial invalido", "El cobro inicial no puede superar el total de la factura.");
        return;
      }
    }
    if (!isCreditNote && draft.initialPaymentStatus === "paid" && absoluteTotal <= 0) {
      toast.error("Total invalido", "El comprobante necesita un total mayor a cero para marcarlo como cobrado al emitir.");
      return;
    }

    setSaving(true);
    try {
      const baseMetadata = invoice?.metadata && typeof invoice.metadata === "object" && !Array.isArray(invoice.metadata) ? invoice.metadata : {};
      const initialPaymentPlan =
        isCreditNote || draft.initialPaymentStatus === "unpaid"
          ? null
          : {
              status: draft.initialPaymentStatus,
              amount: draft.initialPaymentStatus === "paid" ? quantizeMoney(absoluteTotal) : quantizeMoney(initialPaymentAmount),
              method: draft.initialPaymentMethod
            };
      const payload = {
        contactId: draft.contactId,
        type: draft.type,
        parentInvoiceId: draft.parentInvoiceId || null,
        documentMode: "internal_only",
        currency: draft.currency,
        metadata: {
          ...baseMetadata,
          documentKind: draft.documentKind,
          initialPaymentPlan
        },
        items: validItems.map((item) => ({
          descriptionSnapshot: item.descriptionSnapshot.trim(),
          quantity: quantizeMoney(item.quantityNumber),
          unitPrice: quantizeMoney(isCreditNote ? -Math.abs(item.unitPriceNumber) : item.unitPriceNumber),
          taxRate: quantizeMoney(item.taxRateNumber)
        }))
      };

      const response = await fetch(invoice ? `/api/app/invoices/${invoice.id}` : "/api/app/invoices", {
        method: invoice ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || "No se pudo guardar el borrador."));
      }

      const nextInvoice = json?.invoice;
      if (!nextInvoice?.id) {
        throw new Error("invoice_response_missing_id");
      }
      toast.success(invoice ? "Borrador actualizado" : "Borrador creado");
      router.push(`/app/invoices/${nextInvoice.id}`);
      router.refresh();
    } catch (error) {
      toast.error("No se pudo guardar el comprobante", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={submitDraft}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant={isCreditNote ? "outline" : "warning"}>{isCreditNote ? "Nota de crédito en borrador" : "Borrador editable"}</Badge>}>
            <div>
              <CardTitle className="text-xl">
                {invoice ? (isCreditNote ? "Editar nota de crédito en borrador" : "Editar comprobante en borrador") : isCreditNote ? "Crear nota de crédito en borrador" : "Crear comprobante en borrador"}
              </CardTitle>
              <CardDescription>
                {isCreditNote
                  ? "Nota de crédito simple asociada a una factura origen, con items negativos y lista para emitir despues."
                  : "Editor minimo de billing para preparar items y emitir despues desde el portal."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
              <select
                className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                value={draft.contactId}
                onChange={(event) => setDraft((current) => ({ ...current, contactId: event.target.value }))}
                disabled={saving}
              >
                <option value="">Selecciona un contacto</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name} {contact.companyName ? `- ${contact.companyName}` : ""}
                  </option>
                ))}
              </select>
              <select
                className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                value={draft.currency}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    currency: normalizeCurrencyCode(event.target.value, current.currency || "ARS")
                  }))
                }
                disabled={saving}
              >
                {BILLING_CURRENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface/40 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Tipo de comprobante</p>
                <p className="mt-2 text-sm text-muted">
                  Desde aqui puedes crear factura o pasar a nota de credito vinculada sin perder trazabilidad.
                </p>
              </div>
              <select
                className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                value={documentSelectorValue}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    type: event.target.value === "credit_note" ? "credit_note" : "invoice",
                    documentKind: event.target.value === "credit_note" ? current.documentKind || "invoice_c" : event.target.value,
                    initialPaymentStatus: event.target.value === "credit_note" ? "unpaid" : current.initialPaymentStatus,
                    initialPaymentAmount: event.target.value === "credit_note" ? "" : current.initialPaymentAmount,
                    initialPaymentMethod: event.target.value === "credit_note" ? "bank_transfer" : current.initialPaymentMethod,
                    parentInvoiceId: event.target.value === "credit_note" ? current.parentInvoiceId : "",
                    items:
                      event.target.value === "credit_note" && current.parentInvoiceId
                        ? current.items
                        : event.target.value === "credit_note"
                          ? [{ ...EMPTY_ITEM, id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }]
                          : current.items.map((item) => ({
                              ...item,
                              unitPrice: String(Math.abs(Number(item.unitPrice || 0)))
                            }))
                  }))
                }
                disabled={saving}
              >
                {BILLING_DOCUMENT_SELECTOR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {isCreditNote ? (
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="rounded-2xl border border-[color:var(--border)] bg-surface/40 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">Factura origen emitida</p>
                  <p className="mt-2 text-sm text-muted">
                    La nota de credito no se guarda suelta. Debe quedar vinculada a una factura emitida.
                  </p>
                </div>
                <select
                  className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                  value={draft.parentInvoiceId}
                  onChange={(event) => setDraft((current) => ({ ...current, parentInvoiceId: event.target.value }))}
                  disabled={saving}
                >
                  <option value="">Selecciona una factura emitida</option>
                  {availableParentInvoices.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {(candidate.invoiceNumber || candidate.id.slice(0, 8))} - {candidate.contact?.name || "Sin contacto"}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {!isCreditNote ? (
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]">
                <div className="rounded-2xl border border-[color:var(--border)] bg-surface/40 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">Estado de pago inicial</p>
                  <p className="mt-2 text-sm text-muted">
                    Si defines un cobro inicial, el sistema lo registrara automaticamente al emitir la factura.
                  </p>
                </div>
                <select
                  className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                  value={draft.initialPaymentStatus}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      initialPaymentStatus: event.target.value as DraftState["initialPaymentStatus"],
                      initialPaymentAmount: event.target.value === "partial" ? current.initialPaymentAmount : ""
                    }))
                  }
                  disabled={saving}
                >
                  <option value="unpaid">Pendiente</option>
                  <option value="partial">Pago parcial al emitir</option>
                  <option value="paid">Pago total al emitir</option>
                </select>
                {draft.initialPaymentStatus !== "unpaid" ? (
                  <>
                    {draft.initialPaymentStatus === "partial" ? (
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted">$</span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          className="pl-8"
                          placeholder="25.000,50"
                          value={draft.initialPaymentAmount}
                          onChange={(event) => setDraft((current) => ({ ...current, initialPaymentAmount: event.target.value }))}
                          disabled={saving}
                        />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-[color:var(--border)] bg-bg/60 px-3 py-3 text-sm text-muted">
                        Se registrara {formatMoney(Math.abs(computed.totalAmount), draft.currency)} al emitir.
                      </div>
                    )}
                    <select
                      className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                      value={draft.initialPaymentMethod}
                      onChange={(event) => setDraft((current) => ({ ...current, initialPaymentMethod: event.target.value }))}
                      disabled={saving}
                    >
                      {PAYMENT_METHOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
              </div>
            ) : null}

            {isCreditNote && parentInvoice ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 text-sm text-muted">
                <p className="font-medium text-text">Factura origen</p>
                <p className="mt-1">
                  {parentInvoice.invoiceNumber || parentInvoice.id.slice(0, 8)} · {parentInvoice.contact?.name || "Sin contacto"} · {formatMoney(parentInvoice.totalAmount, parentInvoice.currency)}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted">
                  Puedes dejarla total o ajustar cantidades/importes para una devolucion parcial.
                </p>
              </div>
            ) : null}

            <div className="space-y-4">
              {draft.items.map((item, index) => {
                const computedItem = computed.items.find((row) => row.id === item.id);
                return (
                  <div key={item.id} className="rounded-2xl border border-[color:var(--border)] bg-surface/50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Item {index + 1}</p>
                      <Button type="button" variant="ghost" size="sm" className="rounded-2xl" onClick={() => removeItem(item.id)} disabled={saving}>
                        <MinusCircle className="mr-2 h-4 w-4" />
                        Quitar
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <Input
                        placeholder="Descripcion"
                        value={item.descriptionSnapshot}
                        onChange={(event) => updateItem(item.id, { descriptionSnapshot: event.target.value })}
                        disabled={saving}
                      />
                      <div className="grid gap-3 md:grid-cols-3">
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="Cantidad"
                          value={item.quantity ?? ""}
                          onChange={(event) => updateItem(item.id, { quantity: event.target.value })}
                          disabled={saving}
                        />
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="Precio unitario"
                          value={item.unitPrice ?? ""}
                          onChange={(event) => updateItem(item.id, { unitPrice: event.target.value })}
                          disabled={saving}
                        />
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="IVA %"
                          value={item.taxRate ?? ""}
                          onChange={(event) => updateItem(item.id, { taxRate: event.target.value })}
                          disabled={saving}
                        />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <MiniMetric label="Subtotal" value={formatMoney(computedItem?.subtotalAmount || 0, draft.currency)} />
                        <MiniMetric label="Total" value={formatMoney(computedItem?.totalAmount || 0, draft.currency)} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button type="button" variant="secondary" className="rounded-2xl" onClick={addItem} disabled={saving}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar item
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/6 bg-card/90">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Resumen</CardTitle>
                <CardDescription>Totales recalculados en pantalla para preparar el guardado del borrador.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <SummaryRow label="Comprobante" value={getInvoiceDocumentKindLabel({ documentKind: draft.documentKind })} />
              {!isCreditNote ? (
                <SummaryRow
                  label="Cobro inicial"
                  value={
                    draft.initialPaymentStatus === "unpaid"
                      ? "Pendiente"
                      : draft.initialPaymentStatus === "paid"
                        ? `Total al emitir · ${formatMoney(Math.abs(computed.totalAmount), draft.currency)}`
                        : `Parcial al emitir · ${formatMoney(parseLocalizedMoneyInput(draft.initialPaymentAmount) || 0, draft.currency)}`
                  }
                />
              ) : null}
              <SummaryRow label="Subtotal" value={formatMoney(computed.subtotalAmount, draft.currency)} />
              <SummaryRow label="IVA" value={formatMoney(computed.taxAmount, draft.currency)} />
              <SummaryRow label={isCreditNote ? "Impacto" : "Total"} value={formatMoney(computed.totalAmount, draft.currency)} highlight />
            </CardContent>
          </Card>

          <Card className="border-white/6 bg-card/90">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Siguiente paso</CardTitle>
                <CardDescription>Despues de guardar, el borrador queda listo para emitirse desde el detalle.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-sm text-muted">
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted">
                  <ReceiptText className="h-4 w-4" />
                  <span>Workflow</span>
                </div>
                <p>{isCreditNote ? "Guardar borrador - revisar origen e impacto - emitir cuando la nota de credito ya este lista." : "Guardar borrador - revisar detalle - emitir cuando el documento ya este listo."}</p>
              </div>
              <Button type="submit" className="w-full rounded-2xl" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : invoice ? "Guardar cambios" : isCreditNote ? "Crear nota de crédito en borrador" : "Crear borrador"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-bg/60 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  highlight = false
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-[color:var(--border)] p-4 ${highlight ? "bg-brand/8" : "bg-surface/55"}`}>
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
