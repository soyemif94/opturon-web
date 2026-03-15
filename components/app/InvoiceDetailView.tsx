"use client";

import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, FileText, Loader2, ReceiptText, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { PortalInvoice, PortalPayment } from "@/lib/api";
import { badgeToneByStatus, formatDateLabel, formatDateTimeLabel, formatMoney, titleCaseLabel } from "@/lib/billing";

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
  const creditedTotal = useMemo(
    () =>
      relatedCreditNotes.reduce((sum, creditNote) => {
        const amount = Number(creditNote.balanceImpact?.amount ?? creditNote.totalAmount ?? 0);
        return sum + Math.abs(amount);
      }, 0),
    [relatedCreditNotes]
  );

  async function refreshInvoiceAndPayments() {
    const [invoiceResponse, paymentsResponse] = await Promise.all([
      fetch(`/api/app/invoices/${invoice.id}`, { cache: "no-store" }),
      fetch("/api/app/payments", { cache: "no-store" })
    ]);

    const invoiceJson = await invoiceResponse.json().catch(() => null);
    const paymentsJson = await paymentsResponse.json().catch(() => null);

    if (!invoiceResponse.ok) {
      throw new Error(String(invoiceJson?.error || "No se pudo refrescar la factura."));
    }
    if (!paymentsResponse.ok) {
      throw new Error(String(paymentsJson?.error || "No se pudieron refrescar los cobros."));
    }

    setInvoice(invoiceJson?.invoice || initialInvoice);
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
      toast.success(action === "issue" ? "Factura emitida" : "Factura anulada");
    } catch (error) {
      toast.error(
        action === "issue" ? "No se pudo emitir la factura" : "No se pudo anular la factura",
        error instanceof Error ? error.message : "unknown_error"
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function createPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canRegisterPayment) return;

    const amount = Number(paymentDraft.amount || 0);
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
        throw new Error(String(json?.error || "No se pudo registrar el cobro."));
      }

      await refreshInvoiceAndPayments();
      setPaymentDraft({
        ...EMPTY_PAYMENT_DRAFT,
        amount: ""
      });
      toast.success("Cobro registrado", "La cobranza ya impacta en el saldo de la factura.");
    } catch (error) {
      toast.error("No se pudo registrar el cobro", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setBusyAction(null);
    }
  }

  async function createAllocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPaymentId) {
      toast.error("Selecciona un cobro");
      return;
    }

    const amount = Number(allocationAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Monto invalido", "Ingresa un importe valido para la asignacion.");
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
        throw new Error(String(json?.error || "No se pudo crear la asignacion."));
      }

      await refreshInvoiceAndPayments();
      setSelectedPaymentId("");
      setAllocationAmount("");
      toast.success("Asignacion creada", "El cobro ya quedo asignado a esta factura.");
    } catch (error) {
      toast.error("No se pudo crear la asignacion", error instanceof Error ? error.message : "unknown_error");
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
            Volver a facturas
          </Link>
        </Button>
        <Badge variant={badgeToneByStatus(invoice.type)}>{titleCaseLabel(invoice.type)}</Badge>
        <Badge variant={badgeToneByStatus(invoice.status)}>{titleCaseLabel(invoice.status)}</Badge>
        <Badge variant={badgeToneByStatus(invoice.receivableStatus)}>{titleCaseLabel(invoice.receivableStatus)}</Badge>
        {!readOnly && invoice.lifecycle?.canIssue ? (
          <Button size="sm" className="rounded-2xl" onClick={() => void runInvoiceAction("issue")} disabled={busyAction !== null}>
            {busyAction === "issue" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Emitir
          </Button>
        ) : null}
        {!readOnly && invoice.lifecycle?.canEdit ? (
          <Button asChild variant="secondary" size="sm" className="rounded-2xl">
            <Link href={`/app/invoices/${invoice.id}/edit`}>Editar borrador</Link>
          </Button>
        ) : null}
        {!readOnly && invoice.type === "invoice" && invoice.status === "issued" ? (
          <Button asChild variant="secondary" size="sm" className="rounded-2xl">
            <Link href={`/app/invoices/new?type=credit_note&parentInvoiceId=${invoice.id}`}>Crear nota de credito</Link>
          </Button>
        ) : null}
        {!readOnly && invoice.lifecycle?.canVoid ? (
          <Button variant="destructive" size="sm" className="rounded-2xl" onClick={() => void runInvoiceAction("void")} disabled={busyAction !== null}>
            {busyAction === "void" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Anular
          </Button>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader>
            <div>
              <CardTitle className="text-xl">
                {invoice.type === "credit_note" ? "Nota de credito" : "Factura"} {invoice.invoiceNumber || invoice.id.slice(0, 8)}
              </CardTitle>
              <CardDescription>
                {invoice.type === "credit_note"
                  ? "Impacto negativo, referencia a la factura origen y ciclo visible desde el mismo modulo."
                  : "Items, importes y trazabilidad principal del comprobante interno."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            {invoice.type === "credit_note" ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                Esta nota de credito reduce impacto documental y no se cobra como una factura normal.
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
                No encontramos items en esta factura.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/6 bg-card/90">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Ciclo documental</CardTitle>
                <CardDescription>Estado interno y modo documental del comprobante.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-sm text-muted">
              <InfoRow icon={<FileText className="h-4 w-4" />} label="Estado interno" value={titleCaseLabel(invoice.lifecycle?.internalStatus || invoice.status)} />
              <InfoRow icon={<ReceiptText className="h-4 w-4" />} label="Modo" value={titleCaseLabel(invoice.lifecycle?.documentMode || invoice.documentMode)} />
              <InfoRow icon={<ReceiptText className="h-4 w-4" />} label="Estado del proveedor" value={titleCaseLabel(invoice.lifecycle?.providerStatus || invoice.providerStatus)} />
              <InfoRow icon={<ReceiptText className="h-4 w-4" />} label="Emitida" value={formatDateTimeLabel(invoice.issuedAt)} />
              <InfoRow icon={<ReceiptText className="h-4 w-4" />} label="Creada" value={formatDateTimeLabel(invoice.createdAt)} />
              {invoice.lifecycle?.canEdit ? (
                <div className="rounded-2xl border border-brand/25 bg-brand/8 p-4 text-sm">
                  {invoice.type === "credit_note"
                    ? "Esta nota de credito sigue en borrador. Puedes ajustar items y luego emitirla desde este mismo detalle cuando quede lista."
                    : "Esta factura sigue en borrador. Puedes editar items y luego emitirla desde este mismo detalle cuando quede lista."}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-white/6 bg-card/90">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Contacto y referencia</CardTitle>
                <CardDescription>Contexto comercial basico de la factura.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-sm text-muted">
              <InfoRow icon={<UserRound className="h-4 w-4" />} label="Contacto" value={invoice.contact?.name || "Sin contacto"} />
              <InfoRow icon={<UserRound className="h-4 w-4" />} label="Telefono" value={invoice.contact?.phone || "-"} />
              <InfoRow icon={<ReceiptText className="h-4 w-4" />} label="Pedido" value={invoice.orderId || "-"} />
              <InfoRow
                icon={<ReceiptText className="h-4 w-4" />}
                label={invoice.type === "credit_note" ? "Factura origen" : "Factura padre"}
                value={invoice.parentInvoice?.invoiceNumber || invoice.parentInvoiceId || "-"}
              />
              <InfoRow icon={<ReceiptText className="h-4 w-4" />} label="Vencimiento" value={formatDateLabel(invoice.dueAt)} />
              {invoice.type === "credit_note" && invoice.parentInvoice?.id ? (
                <Button asChild variant="secondary" size="sm" className="w-full rounded-2xl">
                  <Link href={`/app/invoices/${invoice.parentInvoice.id}`}>Ver factura origen</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          {invoice.type === "invoice" ? (
            <Card className="border-white/6 bg-card/90">
              <CardHeader>
                <div>
                  <CardTitle className="text-xl">Notas de credito relacionadas</CardTitle>
                  <CardDescription>Visibilidad operativa de ajustes posteriores sobre esta factura.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="grid gap-3 md:grid-cols-2">
                  <MetricTile label="Cantidad" value={String(relatedCreditNotes.length)} helper="Notas de credito asociadas" />
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
                    Esta factura todavia no tiene notas de credito relacionadas.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-white/6 bg-card/90">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Registrar cobro</CardTitle>
                <CardDescription>Alta minima de cobranza sobre esta factura.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {canRegisterPayment ? (
                <form className="space-y-3" onSubmit={createPayment}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Monto"
                      value={paymentDraft.amount}
                      onChange={(event) => setPaymentDraft((current) => ({ ...current, amount: event.target.value }))}
                      disabled={busyAction !== null}
                    />
                    <select
                      className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                      value={paymentDraft.method}
                      onChange={(event) => setPaymentDraft((current) => ({ ...current, method: event.target.value }))}
                      disabled={busyAction !== null}
                    >
                      <option value="bank_transfer">Transferencia</option>
                      <option value="cash">Efectivo</option>
                      <option value="card">Tarjeta</option>
                      <option value="other">Otro</option>
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
                    Registrar cobro
                  </Button>
                </form>
              ) : (
                <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-6 text-sm text-muted">
                  Los cobros solo se registran sobre facturas emitidas, no anuladas y con saldo pendiente.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/6 bg-card/90">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Asignaciones</CardTitle>
                <CardDescription>Asignaciones de cobro y camino simple para aplicar cobros existentes.</CardDescription>
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
                          Cobro {allocation.payment?.id.slice(0, 8) || allocation.paymentId.slice(0, 8)} - {titleCaseLabel(allocation.payment?.status)}
                        </p>
                      </div>
                      <Badge variant={badgeToneByStatus(allocation.payment?.status)}>{titleCaseLabel(allocation.payment?.status)}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-6 text-sm text-muted">
                  Esta factura todavia no muestra asignaciones registradas.
                </div>
              )}

              {!readOnly && invoice.status === "issued" && invoice.type === "invoice" && Number(invoice.outstandingAmount || 0) > 0 ? (
                <form className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-surface/45 p-4" onSubmit={createAllocation}>
                  <p className="text-sm font-medium">Asignar cobro existente</p>
                  <select
                    className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                    value={selectedPaymentId}
                    onChange={(event) => setSelectedPaymentId(event.target.value)}
                    disabled={busyAction !== null}
                  >
                    <option value="">Selecciona un cobro con saldo libre</option>
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
