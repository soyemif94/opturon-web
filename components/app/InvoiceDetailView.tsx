"use client";

import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, Download, FileText, Loader2, ReceiptText, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { PortalInvoice, PortalPayment } from "@/lib/api";
import {
  badgeToneByStatus,
  formatDateLabel,
  formatDateTimeLabel,
  formatMoney,
  getInvoiceDocumentKindLabel,
  parseLocalizedMoneyInput,
  PAYMENT_METHOD_OPTIONS,
  titleCaseLabel
} from "@/lib/billing";

type PaymentDraft = {
  amount: string;
  method: string;
  paidAt: string;
  notes: string;
};

const EMPTY_PAYMENT_DRAFT: PaymentDraft = {
  amount: "",
  method: "bank_transfer",
  paidAt: new Date().toISOString().slice(0, 16),
  notes: ""
};

const NO_FISCAL_LEGEND = "Documento interno no valido como factura fiscal";

type AccountantDraft = {
  documentKind: string;
  fiscalStatus: string;
  customerLegalName: string;
  customerTaxId: string;
  customerTaxIdType: string;
  customerVatCondition: string;
  issuerLegalName: string;
  issuerTaxId: string;
  issuerVatCondition: string;
  suggestedFiscalVoucherType: string;
  accountantNotes: string;
  accountantReferenceNumber: string;
};

export function InvoiceDetailView({
  invoice: initialInvoice,
  payments: initialPayments,
  readOnly = false
}: {
  invoice: PortalInvoice;
  payments: PortalPayment[];
  readOnly?: boolean;
}) {
  const [invoice, setInvoice] = useState(initialInvoice);
  const [payments, setPayments] = useState(Array.isArray(initialPayments) ? initialPayments : []);
  const [accountantDraft, setAccountantDraft] = useState<AccountantDraft>({
    documentKind: initialInvoice.documentKind || "internal_invoice",
    fiscalStatus: initialInvoice.fiscalStatus || "draft",
    customerLegalName: initialInvoice.customerLegalName || "",
    customerTaxId: initialInvoice.customerTaxId || "",
    customerTaxIdType: initialInvoice.customerTaxIdType || "NONE",
    customerVatCondition: initialInvoice.customerVatCondition || "",
    issuerLegalName: initialInvoice.issuerLegalName || "",
    issuerTaxId: initialInvoice.issuerTaxId || "",
    issuerVatCondition: initialInvoice.issuerVatCondition || "",
    suggestedFiscalVoucherType: initialInvoice.suggestedFiscalVoucherType || "NONE",
    accountantNotes: initialInvoice.accountantNotes || "",
    accountantReferenceNumber: initialInvoice.accountantReferenceNumber || ""
  });
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>({
    ...EMPTY_PAYMENT_DRAFT,
    amount: initialInvoice.outstandingAmount > 0 ? String(initialInvoice.outstandingAmount) : ""
  });
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const [allocationAmount, setAllocationAmount] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const canRegisterPayment =
    !readOnly &&
    invoice.status === "issued" &&
    invoice.type === "invoice" &&
    Number(invoice.outstandingAmount || 0) > 0;

  const allocatablePayments = useMemo(
    () =>
      payments.filter((payment) => {
        const unallocatedAmount = Number(payment.unallocatedAmount || 0);
        if (payment.status !== "recorded" || unallocatedAmount <= 0) return false;
        if (payment.currency !== invoice.currency) return false;
        if (payment.contactId && invoice.contactId && payment.contactId !== invoice.contactId) return false;
        return true;
      }),
    [payments, invoice]
  );

  const relatedCreditNotes = useMemo(
    () => (Array.isArray(invoice.relatedCreditNotes) ? invoice.relatedCreditNotes : []),
    [invoice.relatedCreditNotes]
  );
  const initialPaymentPlan = useMemo(() => {
    const candidate = invoice.metadata && typeof invoice.metadata === "object" ? invoice.metadata.initialPaymentPlan : null;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const rawPlan = candidate as Record<string, unknown>;
    const status = typeof rawPlan.status === "string" ? rawPlan.status : "unpaid";
    const amount = Number(rawPlan.amount || 0);
    const method = typeof rawPlan.method === "string" ? rawPlan.method : "bank_transfer";
    return { status, amount, method };
  }, [invoice.metadata]);
  const creditedTotal = useMemo(
    () =>
      relatedCreditNotes.reduce((sum, creditNote) => {
        const amount = Number(creditNote.balanceImpact?.amount ?? creditNote.totalAmount ?? 0);
        return sum + Math.abs(amount);
      }, 0),
    [relatedCreditNotes]
  );
  const netCommerceRevenue = useMemo(
    () => Number(invoice.totalAmount || 0) - creditedTotal,
    [creditedTotal, invoice.totalAmount]
  );

  async function refreshInvoiceAndPayments() {
    const [invoiceResponse, paymentsResponse] = await Promise.all([
      fetch(`/api/app/invoices/${invoice.id}`, { cache: "no-store" }),
      fetch("/api/app/payments", { cache: "no-store" })
    ]);

    const invoiceJson = await invoiceResponse.json().catch(() => null);
    const paymentsJson = await paymentsResponse.json().catch(() => null);

    if (!invoiceResponse.ok) {
      throw new Error(String(invoiceJson?.error || "No se pudo refrescar la invoice."));
    }
    if (!paymentsResponse.ok) {
      throw new Error(String(paymentsJson?.error || "No se pudieron refrescar los payments."));
    }

    setInvoice(invoiceJson?.invoice || initialInvoice);
    setAccountantDraft({
      documentKind: invoiceJson?.invoice?.documentKind || "internal_invoice",
      fiscalStatus: invoiceJson?.invoice?.fiscalStatus || "draft",
      customerLegalName: invoiceJson?.invoice?.customerLegalName || "",
      customerTaxId: invoiceJson?.invoice?.customerTaxId || "",
      customerTaxIdType: invoiceJson?.invoice?.customerTaxIdType || "NONE",
      customerVatCondition: invoiceJson?.invoice?.customerVatCondition || "",
      issuerLegalName: invoiceJson?.invoice?.issuerLegalName || "",
      issuerTaxId: invoiceJson?.invoice?.issuerTaxId || "",
      issuerVatCondition: invoiceJson?.invoice?.issuerVatCondition || "",
      suggestedFiscalVoucherType: invoiceJson?.invoice?.suggestedFiscalVoucherType || "NONE",
      accountantNotes: invoiceJson?.invoice?.accountantNotes || "",
      accountantReferenceNumber: invoiceJson?.invoice?.accountantReferenceNumber || ""
    });
    setPayments(Array.isArray(paymentsJson?.payments) ? paymentsJson.payments : []);
  }

  async function runInvoiceAction(action: "issue" | "void") {
    setBusyAction(action);
    try {
      const response = await fetch(`/api/app/invoices/${invoice.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || `No se pudo ejecutar ${action}.`));
      }

      await refreshInvoiceAndPayments();
      toast.success(action === "issue" ? "Invoice emitida" : "Invoice anulada");
    } catch (error) {
      toast.error(
        action === "issue" ? "No se pudo emitir la invoice" : "No se pudo anular la invoice",
        error instanceof Error ? error.message : "unknown_error"
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function createPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canRegisterPayment) return;

    const amount = parseLocalizedMoneyInput(paymentDraft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Monto invalido", "Ingresa un importe mayor a cero.");
      return;
    }

    setBusyAction("create_payment");
    try {
      const response = await fetch("/api/app/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          method: paymentDraft.method,
          paidAt: paymentDraft.paidAt ? new Date(paymentDraft.paidAt).toISOString() : undefined,
          invoiceId: invoice.id,
          contactId: invoice.contactId,
          notes: paymentDraft.notes.trim() || null,
          currency: invoice.currency
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || "No se pudo registrar el pago."));
      }

      await refreshInvoiceAndPayments();
      setPaymentDraft({
        ...EMPTY_PAYMENT_DRAFT,
        amount: ""
      });
      toast.success("Payment registrado", "La cobranza ya impacta en el saldo de la invoice.");
    } catch (error) {
      toast.error("No se pudo registrar el payment", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setBusyAction(null);
    }
  }

  async function createAllocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPaymentId) {
      toast.error("Selecciona un payment");
      return;
    }

    const amount = Number(allocationAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Monto invalido", "Ingresa un importe valido para la allocation.");
      return;
    }

    setBusyAction("create_allocation");
    try {
      const response = await fetch(`/api/app/payments/${selectedPaymentId}/allocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || "No se pudo crear la allocation."));
      }

      await refreshInvoiceAndPayments();
      setSelectedPaymentId("");
      setAllocationAmount("");
      toast.success("Allocation creada", "El payment ya quedo asignado a esta invoice.");
    } catch (error) {
      toast.error("No se pudo crear la allocation", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setBusyAction(null);
    }
  }

  async function saveAccounting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("save_accounting");
    try {
      const response = await fetch(`/api/app/invoices/${invoice.id}/accounting`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountantDraft)
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || "No se pudo guardar la preparacion contable."));
      }
      setInvoice(json?.invoice || invoice);
      await refreshInvoiceAndPayments();
      toast.success("Preparacion contable guardada", "El comprobante ya quedo actualizado para contador.");
    } catch (error) {
      toast.error("No se pudo guardar la preparacion contable", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="secondary" size="sm" className="rounded-2xl">
          <Link href="/app/invoices">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a comprobantes
          </Link>
        </Button>
        <Badge variant={badgeToneByStatus(invoice.type)}>{titleCaseLabel(invoice.type)}</Badge>
        <Badge variant={badgeToneByStatus(invoice.status)}>{titleCaseLabel(invoice.status)}</Badge>
        <Badge variant={badgeToneByStatus(invoice.fiscalStatus)}>{titleCaseLabel(invoice.fiscalStatus)}</Badge>
        <Badge variant={badgeToneByStatus(invoice.receivableStatus)}>{titleCaseLabel(invoice.receivableStatus)}</Badge>
        <Button asChild variant="secondary" size="sm" className="rounded-2xl">
          <a href={`/api/app/invoices/${invoice.id}/document`}>
            <Download className="mr-2 h-4 w-4" />
            Descargar documento
          </a>
        </Button>
        {!readOnly && invoice.lifecycle?.canIssue ? (
          <Button size="sm" className="rounded-2xl" onClick={() => void runInvoiceAction("issue")} disabled={busyAction !== null}>
            {busyAction === "issue" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {invoice.type === "invoice" && initialPaymentPlan && initialPaymentPlan.status !== "unpaid" ? "Emitir y registrar cobro" : "Emitir documento"}
          </Button>
        ) : null}
        {!readOnly && invoice.lifecycle?.canEdit ? (
          <Button asChild variant="secondary" size="sm" className="rounded-2xl">
            <Link href={`/app/invoices/${invoice.id}/edit`}>Editar borrador</Link>
          </Button>
        ) : null}
        {!readOnly && invoice.type === "invoice" && invoice.status === "issued" ? (
          <Button asChild variant="secondary" size="sm" className="rounded-2xl">
            <Link href={`/app/invoices/new?type=credit_note&parentInvoiceId=${invoice.id}`}>Crear nota de crédito</Link>
          </Button>
        ) : null}
        {!readOnly && invoice.lifecycle?.canVoid ? (
          <Button variant="destructive" size="sm" className="rounded-2xl" onClick={() => void runInvoiceAction("void")} disabled={busyAction !== null}>
            {busyAction === "void" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Anular
          </Button>
        ) : null}
      </div>

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        {invoice.noFiscalLegend || NO_FISCAL_LEGEND}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader>
            <div>
              <CardTitle className="text-xl">
                {invoice.type === "credit_note" ? "Nota de crédito" : "Documento"} {invoice.invoiceNumber || invoice.id.slice(0, 8)}
              </CardTitle>
              <CardDescription>
                {invoice.type === "credit_note"
                    ? "Impacto negativo, referencia a la invoice origen y lifecycle visible desde el mismo modulo."
                  : "Items, importes y trazabilidad principal del comprobante interno."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            {invoice.type === "credit_note" ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                Esta nota de credito reduce impacto documental y no se cobra como una invoice normal.
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-4">
              <MetricTile label="Total" value={formatMoney(invoice.totalAmount, invoice.currency)} />
              <MetricTile label="Impacto" value={formatMoney(invoice.balanceImpact?.amount, invoice.currency)} helper={titleCaseLabel(invoice.balanceImpact?.sign)} />
              <MetricTile label="Cobrado" value={formatMoney(invoice.paidAmount, invoice.currency)} />
              <MetricTile label="Pendiente" value={formatMoney(invoice.outstandingAmount, invoice.currency)} />
            </div>

            <div className="overflow-hidden rounded-2xl border border-[color:var(--border)]">
              <div className="grid grid-cols-[minmax(0,1.1fr)_110px_140px_120px_140px] gap-4 border-b border-[color:var(--border)] bg-surface/70 px-4 py-3 text-xs uppercase tracking-[0.16em] text-muted">
                <span>Item</span>
                <span>Cantidad</span>
                <span>Precio unit.</span>
                <span>IVA</span>
                <span>Total</span>
              </div>
              {(invoice.items || []).map((item) => (
                <div key={item.id} className="grid grid-cols-[minmax(0,1.1fr)_110px_140px_120px_140px] gap-4 border-b border-[color:var(--border)] px-4 py-4 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.descriptionSnapshot}</p>
                    <p className="mt-1 text-sm text-muted">{item.productId ? `Producto ${item.productId.slice(0, 8)}` : "Item manual"}</p>
                  </div>
                  <div className="text-sm text-muted">{item.quantity}</div>
                  <div className="text-sm text-muted">{formatMoney(item.unitPrice, invoice.currency)}</div>
                  <div className="text-sm text-muted">{item.taxRate}%</div>
                  <div className="text-sm font-medium">{formatMoney(item.totalAmount, invoice.currency)}</div>
                </div>
              ))}
            </div>

            {!invoice.items?.length ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-6 text-sm text-muted">
                No encontramos items en esta invoice.
              </div>
            ) : null}

            {invoice.type === "invoice" ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">Ingreso neto real</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <MetricTile label="Total factura" value={formatMoney(invoice.totalAmount, invoice.currency)} />
                  <MetricTile label="Total acreditado" value={formatMoney(creditedTotal, invoice.currency)} helper="Notas de credito emitidas" />
                  <MetricTile label="Ingreso neto real" value={formatMoney(netCommerceRevenue, invoice.currency)} helper="Total menos creditos" />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/6 bg-card/90">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Lifecycle</CardTitle>
                <CardDescription>Estado interno y modo documental del comprobante.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-sm text-muted">
              <InfoRow icon={<FileText className="h-4 w-4" />} label="Estado interno" value={titleCaseLabel(invoice.lifecycle?.internalStatus || invoice.status)} />
              <InfoRow icon={<ReceiptText className="h-4 w-4" />} label="Comprobante" value={getInvoiceDocumentKindLabel(invoice.metadata)} />
              <InfoRow icon={<ReceiptText className="h-4 w-4" />} label="Modo" value={titleCaseLabel(invoice.lifecycle?.documentMode || invoice.documentMode)} />
              <InfoRow icon={<ReceiptText className="h-4 w-4" />} label="Estado del proveedor" value={titleCaseLabel(invoice.lifecycle?.providerStatus || invoice.providerStatus)} />
              <InfoRow icon={<ReceiptText className="h-4 w-4" />} label="Emitida" value={formatDateTimeLabel(invoice.issuedAt)} />
              <InfoRow icon={<ReceiptText className="h-4 w-4" />} label="Creada" value={formatDateTimeLabel(invoice.createdAt)} />
              {invoice.type === "invoice" && invoice.status === "draft" ? (
                <div className="rounded-2xl border border-brand/25 bg-brand/8 p-4 text-sm">
                  {initialPaymentPlan && initialPaymentPlan.status !== "unpaid" ? (
                    <p>
                      Al emitir se registrara un cobro{" "}
                      <strong>{initialPaymentPlan.status === "paid" ? "total" : "parcial"}</strong>{" "}
                      por {formatMoney(initialPaymentPlan.status === "paid" ? invoice.totalAmount : initialPaymentPlan.amount, invoice.currency)} via{" "}
                      {titleCaseLabel(initialPaymentPlan.method)}.
                    </p>
                  ) : (
                    <p>Esta factura quedara pendiente al emitirse, sin generar un cobro inicial automatico.</p>
                  )}
                </div>
              ) : null}
              {invoice.lifecycle?.canEdit ? (
                <div className="rounded-2xl border border-brand/25 bg-brand/8 p-4 text-sm">
                  {invoice.type === "credit_note"
                    ? "Esta nota de crédito sigue en draft. Puedes ajustar items y luego emitirla desde este mismo detail cuando quede lista."
                    : "Esta invoice sigue en draft. Puedes editar items y luego emitirla desde este mismo detail cuando quede lista."}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-white/6 bg-card/90">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Contacto y referencia</CardTitle>
                <CardDescription>Contexto comercial basico de la invoice.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-sm text-muted">
              <InfoRow icon={<UserRound className="h-4 w-4" />} label="Contacto" value={invoice.contact?.name || "Sin contacto"} />
              <InfoRow icon={<UserRound className="h-4 w-4" />} label="Telefono" value={invoice.contact?.phone || "-"} />
              <InfoRow icon={<ReceiptText className="h-4 w-4" />} label="Order" value={invoice.orderId || "-"} />
              <InfoRow
                icon={<ReceiptText className="h-4 w-4" />}
                label={invoice.type === "credit_note" ? "Factura origen" : "Documento padre"}
                value={invoice.parentInvoice?.invoiceNumber || invoice.parentInvoiceId || "-"}
              />
              <InfoRow icon={<ReceiptText className="h-4 w-4" />} label="Vencimiento" value={formatDateLabel(invoice.dueAt)} />
              {invoice.type === "credit_note" && invoice.parentInvoice?.id ? (
                <Button asChild variant="secondary" size="sm" className="w-full rounded-2xl">
                  <Link href={`/app/invoices/${invoice.parentInvoice.id}`}>Ver invoice origen</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          {invoice.type === "invoice" ? (
            <Card className="border-white/6 bg-card/90">
              <CardHeader
                action={
                  !readOnly && invoice.status === "issued" ? (
                    <Button asChild variant="secondary" size="sm" className="rounded-2xl">
                      <Link href={`/app/invoices/new?type=credit_note&parentInvoiceId=${invoice.id}`}>Crear nota de crédito</Link>
                    </Button>
                  ) : undefined
                }
              >
                <div>
                  <CardTitle className="text-xl">Notas de crédito relacionadas</CardTitle>
                  <CardDescription>Visibilidad operativa de ajustes posteriores sobre esta invoice.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="grid gap-3 md:grid-cols-2">
                  <MetricTile label="Cantidad" value={String(relatedCreditNotes.length)} helper="Credit notes asociadas" />
                  <MetricTile label="Total acreditado" value={formatMoney(creditedTotal, invoice.currency)} helper="Acumulado visible" />
                </div>

                {relatedCreditNotes.length ? (
                  relatedCreditNotes.map((creditNote) => (
                    <Link
                      key={creditNote.id}
                      href={`/app/invoices/${creditNote.id}`}
                      className="block rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 transition-colors hover:bg-surface/75"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={badgeToneByStatus(creditNote.type)}>{titleCaseLabel(creditNote.type)}</Badge>
                            <Badge variant={badgeToneByStatus(creditNote.status)}>{titleCaseLabel(creditNote.status)}</Badge>
                          </div>
                          <p className="mt-3 font-medium">{creditNote.invoiceNumber || creditNote.id.slice(0, 8)}</p>
                          <p className="mt-1 text-sm text-muted">{formatDateLabel(creditNote.issuedAt || creditNote.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-amber-300">{formatMoney(creditNote.totalAmount, creditNote.currency || invoice.currency)}</p>
                          <p className="mt-1 text-sm text-muted">
                            Impacto {formatMoney(Math.abs(Number(creditNote.balanceImpact?.amount || creditNote.totalAmount || 0)), creditNote.currency || invoice.currency)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-6 text-sm text-muted">
                    Esta invoice todavia no tiene notas de crédito relacionadas.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-white/6 bg-card/90">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Preparacion contable</CardTitle>
                <CardDescription>Completa los datos minimos para contador sin mezclar esta operacion con facturacion fiscal real.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <form className="space-y-3" onSubmit={saveAccounting}>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input value={invoice.internalDocumentNumber || "-"} disabled />
                  <select
                    className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                    value={accountantDraft.fiscalStatus}
                    onChange={(event) => setAccountantDraft((current) => ({ ...current, fiscalStatus: event.target.value }))}
                    disabled={busyAction !== null || readOnly}
                  >
                    <option value="draft">Borrador</option>
                    <option value="ready_for_accountant">Listo para contador</option>
                    <option value="delivered_to_accountant">Entregado al contador</option>
                    <option value="invoiced_by_accountant">Facturado por contador</option>
                  </select>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                    value={accountantDraft.documentKind}
                    onChange={(event) => setAccountantDraft((current) => ({ ...current, documentKind: event.target.value }))}
                    disabled={busyAction !== null || readOnly}
                  >
                    <option value="internal_invoice">Comprobante interno</option>
                    <option value="proforma">Proforma</option>
                    <option value="order_summary">Resumen de pedido</option>
                  </select>
                  <select
                    className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                    value={accountantDraft.suggestedFiscalVoucherType}
                    onChange={(event) => setAccountantDraft((current) => ({ ...current, suggestedFiscalVoucherType: event.target.value }))}
                    disabled={busyAction !== null || readOnly}
                  >
                    <option value="NONE">Comprobante sugerido: NONE</option>
                    <option value="A">Comprobante sugerido: A</option>
                    <option value="B">Comprobante sugerido: B</option>
                    <option value="C">Comprobante sugerido: C</option>
                  </select>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    placeholder="Razon social del cliente"
                    value={accountantDraft.customerLegalName}
                    onChange={(event) => setAccountantDraft((current) => ({ ...current, customerLegalName: event.target.value }))}
                    disabled={busyAction !== null || readOnly}
                  />
                  <Input
                    placeholder="CUIT / DNI del cliente"
                    value={accountantDraft.customerTaxId}
                    onChange={(event) => setAccountantDraft((current) => ({ ...current, customerTaxId: event.target.value }))}
                    disabled={busyAction !== null || readOnly}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                    value={accountantDraft.customerTaxIdType}
                    onChange={(event) => setAccountantDraft((current) => ({ ...current, customerTaxIdType: event.target.value }))}
                    disabled={busyAction !== null || readOnly}
                  >
                    <option value="NONE">Tipo ID cliente: NONE</option>
                    <option value="DNI">Tipo ID cliente: DNI</option>
                    <option value="CUIT">Tipo ID cliente: CUIT</option>
                    <option value="CUIL">Tipo ID cliente: CUIL</option>
                  </select>
                  <Input
                    placeholder="Condicion IVA del cliente"
                    value={accountantDraft.customerVatCondition}
                    onChange={(event) => setAccountantDraft((current) => ({ ...current, customerVatCondition: event.target.value }))}
                    disabled={busyAction !== null || readOnly}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    placeholder="Razon social del emisor"
                    value={accountantDraft.issuerLegalName}
                    onChange={(event) => setAccountantDraft((current) => ({ ...current, issuerLegalName: event.target.value }))}
                    disabled={busyAction !== null || readOnly}
                  />
                  <Input
                    placeholder="CUIT del emisor"
                    value={accountantDraft.issuerTaxId}
                    onChange={(event) => setAccountantDraft((current) => ({ ...current, issuerTaxId: event.target.value }))}
                    disabled={busyAction !== null || readOnly}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    placeholder="Condicion IVA del emisor"
                    value={accountantDraft.issuerVatCondition}
                    onChange={(event) => setAccountantDraft((current) => ({ ...current, issuerVatCondition: event.target.value }))}
                    disabled={busyAction !== null || readOnly}
                  />
                  <Input
                    placeholder="Referencia del contador"
                    value={accountantDraft.accountantReferenceNumber}
                    onChange={(event) => setAccountantDraft((current) => ({ ...current, accountantReferenceNumber: event.target.value }))}
                    disabled={busyAction !== null || readOnly}
                  />
                </div>
                <Textarea
                  rows={4}
                  placeholder="Observaciones para contador"
                  value={accountantDraft.accountantNotes}
                  onChange={(event) => setAccountantDraft((current) => ({ ...current, accountantNotes: event.target.value }))}
                  disabled={busyAction !== null || readOnly}
                />
                {!readOnly ? (
                  <Button type="submit" className="w-full rounded-2xl" disabled={busyAction !== null}>
                    {busyAction === "save_accounting" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Guardar preparacion contable
                  </Button>
                ) : null}
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/6 bg-card/90">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Registrar payment</CardTitle>
                <CardDescription>Alta minima de cobranza sobre esta invoice.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {canRegisterPayment ? (
                <form className="space-y-3" onSubmit={createPayment}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted">$</span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="pl-8"
                        placeholder="25.000,50"
                        value={paymentDraft.amount}
                        onChange={(event) => setPaymentDraft((current) => ({ ...current, amount: event.target.value }))}
                        disabled={busyAction !== null}
                      />
                    </div>
                    <select
                      className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                      value={paymentDraft.method}
                      onChange={(event) => setPaymentDraft((current) => ({ ...current, method: event.target.value }))}
                      disabled={busyAction !== null}
                    >
                      {PAYMENT_METHOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    type="datetime-local"
                    value={paymentDraft.paidAt}
                    onChange={(event) => setPaymentDraft((current) => ({ ...current, paidAt: event.target.value }))}
                    disabled={busyAction !== null}
                  />
                  <Textarea
                    rows={3}
                    placeholder="Notas internas del cobro"
                    value={paymentDraft.notes}
                    onChange={(event) => setPaymentDraft((current) => ({ ...current, notes: event.target.value }))}
                    disabled={busyAction !== null}
                  />
                  <Button type="submit" className="w-full rounded-2xl" disabled={busyAction !== null}>
                    {busyAction === "create_payment" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                    Registrar payment
                  </Button>
                </form>
              ) : (
                <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-6 text-sm text-muted">
                  Los payments solo se registran sobre invoices emitidas, no anuladas y con saldo pendiente.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/6 bg-card/90">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Allocations</CardTitle>
                <CardDescription>Asignaciones de cobro y camino simple para aplicar pagos existentes.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {invoice.allocations?.length ? (
                invoice.allocations.map((allocation) => (
                  <div key={allocation.id} className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{formatMoney(allocation.amount, invoice.currency)}</p>
                        <p className="mt-1 text-xs text-muted">
                          Pago {allocation.payment?.id.slice(0, 8) || allocation.paymentId.slice(0, 8)} - {titleCaseLabel(allocation.payment?.status)}
                        </p>
                      </div>
                      <Badge variant={badgeToneByStatus(allocation.payment?.status)}>{titleCaseLabel(allocation.payment?.status)}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-6 text-sm text-muted">
                  Esta invoice todavia no muestra allocations registradas.
                </div>
              )}

              {!readOnly && invoice.status === "issued" && invoice.type === "invoice" && Number(invoice.outstandingAmount || 0) > 0 ? (
                <form className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-surface/45 p-4" onSubmit={createAllocation}>
                  <p className="text-sm font-medium">Asignar payment existente</p>
                  <select
                    className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                    value={selectedPaymentId}
                    onChange={(event) => setSelectedPaymentId(event.target.value)}
                    disabled={busyAction !== null}
                  >
                    <option value="">Selecciona un pago con saldo libre</option>
                    {allocatablePayments.map((payment) => (
                      <option key={payment.id} value={payment.id}>
                        {payment.id.slice(0, 8)} - {formatMoney(payment.unallocatedAmount, payment.currency)}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Monto a asignar"
                    value={allocationAmount}
                    onChange={(event) => setAllocationAmount(event.target.value)}
                    disabled={busyAction !== null}
                  />
                  <Button type="submit" variant="secondary" className="w-full rounded-2xl" disabled={busyAction !== null || !allocatablePayments.length}>
                    {busyAction === "create_allocation" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Crear asignacion
                  </Button>
                </form>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  helper
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-3 text-xl font-semibold">{value}</p>
      {helper ? <p className="mt-1 text-xs text-muted">{helper}</p> : null}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted">
        {icon}
        <span>{label}</span>
      </div>
      <p>{value}</p>
    </div>
  );
}
