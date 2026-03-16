"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MinusCircle, Plus, ReceiptText, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import type { PortalContactDetail, PortalInvoice } from "@/lib/api";
import {
  calculateInvoiceLineAmounts,
  formatMoney,
  getInvoiceDocumentKindLabel,
  INVOICE_DOCUMENT_KIND_OPTIONS,
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
  items: DraftItem[];
};

const EMPTY_ITEM: DraftItem = {
  id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  descriptionSnapshot: "",
  quantity: "1",
  unitPrice: "",
  taxRate: "0"
};

function buildInitialState(invoice?: PortalInvoice | null, parentInvoice?: PortalInvoice | null): DraftState {
  const inferredType = (invoice?.type || (parentInvoice ? "credit_note" : "invoice")) as "invoice" | "credit_note";
  const seedItems =
    invoice?.items?.length
      ? invoice.items.map((item) => ({
          id: item.id,
          descriptionSnapshot: item.descriptionSnapshot,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          taxRate: String(item.taxRate)
        }))
      : parentInvoice?.items?.length
        ? parentInvoice.items.map((item) => ({
            id: `seed_${item.id}`,
            descriptionSnapshot: item.descriptionSnapshot,
            quantity: String(item.quantity),
            unitPrice: String(-Math.abs(Number(item.unitPrice || 0))),
            taxRate: String(item.taxRate)
          }))
        : [{ ...EMPTY_ITEM }];

  return {
    contactId: invoice?.contactId || parentInvoice?.contactId || "",
    currency: invoice?.currency || parentInvoice?.currency || "ARS",
    type: inferredType,
    documentKind:
      typeof invoice?.metadata?.documentKind === "string"
        ? invoice.metadata.documentKind
        : typeof parentInvoice?.metadata?.documentKind === "string"
          ? parentInvoice.metadata.documentKind
          : "invoice_c",
    parentInvoiceId: invoice?.parentInvoiceId || parentInvoice?.id || "",
    items: seedItems
  };
}

export function InvoiceDraftEditor({
  contacts,
  invoice = null,
  parentInvoice = null
}: {
  contacts: PortalContactDetail[];
  invoice?: PortalInvoice | null;
  parentInvoice?: PortalInvoice | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftState>(buildInitialState(invoice, parentInvoice));
  const [saving, setSaving] = useState(false);
  const isCreditNote = draft.type === "credit_note";

  const computed = useMemo(() => {
    const items = draft.items.map((item) => {
      const quantity = Number(item.quantity || 0);
      const enteredUnitPrice = Number(item.unitPrice || 0);
      const unitPrice = isCreditNote ? -Math.abs(enteredUnitPrice) : enteredUnitPrice;
      const taxRate = Number(item.taxRate || 0);
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
      toast.error("Contacto requerido", "Selecciona un contacto antes de guardar la invoice.");
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

    setSaving(true);
    try {
      const payload = {
        contactId: draft.contactId,
        type: draft.type,
        parentInvoiceId: draft.parentInvoiceId || null,
        documentMode: "internal_only",
        currency: draft.currency,
        metadata: {
          ...(invoice?.metadata || parentInvoice?.metadata || {}),
          documentKind: draft.documentKind
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
        throw new Error(String(json?.error || "No se pudo guardar la invoice draft."));
      }

      const nextInvoice = json?.invoice;
      if (!nextInvoice?.id) {
        throw new Error("invoice_response_missing_id");
      }
      toast.success(invoice ? "Draft actualizada" : "Draft creada");
      router.push(`/app/invoices/${nextInvoice.id}`);
      router.refresh();
    } catch (error) {
      toast.error("No se pudo guardar la invoice", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={submitDraft}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant={isCreditNote ? "outline" : "warning"}>{isCreditNote ? "Nota de credito draft" : "Draft editable"}</Badge>}>
            <div>
              <CardTitle className="text-xl">
                {invoice ? (isCreditNote ? "Editar nota de credito draft" : "Editar factura draft") : isCreditNote ? "Crear nota de credito draft" : "Crear factura draft"}
              </CardTitle>
              <CardDescription>
                {isCreditNote
                  ? "Nota de credito simple asociada a una factura origen, con items negativos y lista para emitir despues."
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
              <Input value={draft.currency} onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} disabled={saving} />
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface/40 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Tipo de comprobante</p>
                <p className="mt-2 text-sm text-muted">
                  Lo usamos como identificacion comercial visible sin tocar el lifecycle interno del documento.
                </p>
              </div>
              <select
                className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                value={draft.documentKind}
                onChange={(event) => setDraft((current) => ({ ...current, documentKind: event.target.value }))}
                disabled={saving}
              >
                {INVOICE_DOCUMENT_KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

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
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Cantidad"
                          value={item.quantity}
                          onChange={(event) => updateItem(item.id, { quantity: event.target.value })}
                          disabled={saving}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          min={isCreditNote ? undefined : "0"}
                          placeholder="Precio unitario"
                          value={item.unitPrice}
                          onChange={(event) => updateItem(item.id, { unitPrice: event.target.value })}
                          disabled={saving}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="IVA %"
                          value={item.taxRate}
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
                <CardDescription>Totales recalculados en frontend para preparar el guardado del draft.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <SummaryRow label="Comprobante" value={getInvoiceDocumentKindLabel({ documentKind: draft.documentKind })} />
              <SummaryRow label="Subtotal" value={formatMoney(computed.subtotalAmount, draft.currency)} />
              <SummaryRow label="IVA" value={formatMoney(computed.taxAmount, draft.currency)} />
              <SummaryRow label={isCreditNote ? "Impacto" : "Total"} value={formatMoney(computed.totalAmount, draft.currency)} highlight />
            </CardContent>
          </Card>

          <Card className="border-white/6 bg-card/90">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Siguiente paso</CardTitle>
                <CardDescription>Despues de guardar, la draft queda lista para emitirse desde el detail.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-sm text-muted">
              <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted">
                  <ReceiptText className="h-4 w-4" />
                  <span>Workflow</span>
                </div>
                <p>{isCreditNote ? "Guardar draft - revisar origen e impacto - emitir cuando la nota de credito ya este lista." : "Guardar draft - revisar detalle - emitir cuando el documento ya este listo."}</p>
              </div>
              <Button type="submit" className="w-full rounded-2xl" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : invoice ? "Guardar cambios" : isCreditNote ? "Crear nota de credito draft" : "Crear draft"}
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
