import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { canEditWorkspace } from "@/lib/app-permissions";
import { getPortalContactDetail, isBackendConfigured } from "@/lib/api";
import Link from "next/link";
import { formatDateLabel, formatDateTimeLabel, formatMoney, titleCaseLabel, badgeToneByStatus } from "@/lib/billing";
import { requireAppPage } from "@/lib/saas/access";
import { SimpleAvatar } from "@/components/app/simple-avatar";

export default async function AppContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAppPage();
  const { id } = await params;
  const readOnly = !ctx.tenantId || !canEditWorkspace(ctx);
  let contact = null;

  if (ctx.tenantId && isBackendConfigured()) {
    try {
      const result = await getPortalContactDetail(ctx.tenantId, id);
      contact = result.data;
    } catch {
      contact = null;
    }
  }

  return (
    <ClientPageShell
      title={contact?.name || "Detalle de contacto"}
      description="Lectura simple del registro CRM para validar identidad, datos fiscales basicos y contexto operativo."
      badge="Contacto"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader
            action={
              <div className="flex items-center gap-2">
                <Badge variant={contact?.status === "archived" ? "danger" : "success"}>{titleCaseLabel(contact?.status || "active")}</Badge>
                {!readOnly && contact ? (
                  <Button asChild variant="secondary" size="sm" className="rounded-2xl">
                    <Link href={`/app/contacts/${contact.id}/edit`}>Editar contacto</Link>
                  </Button>
                ) : null}
              </div>
            }
          >
            <div>
              <div className="flex items-center gap-4">
                <SimpleAvatar
                  src={contact?.profileImageUrl}
                  name={contact?.name || "Contacto"}
                  className="h-16 w-16 rounded-[22px] border border-[color:var(--border)] bg-brand/10 text-lg text-brandBright"
                  fallbackClassName="bg-brand/10 text-brandBright"
                />
                <div className="min-w-0">
                  <CardTitle className="text-xl">{contact?.name || "Contacto no disponible"}</CardTitle>
                  <CardDescription>{contact?.companyName || contact?.email || contact?.phone || "Sin contexto adicional"}</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 pt-0 md:grid-cols-2 xl:grid-cols-3">
            <DetailTile label="Email" value={contact?.email || "-"} />
            <DetailTile label="Telefono" value={contact?.phone || "-"} />
            <DetailTile label="WhatsApp" value={contact?.whatsappPhone || contact?.waId || "-"} />
            <DetailTile label="Empresa" value={contact?.companyName || "-"} />
            <DetailTile label="Documento fiscal" value={contact?.taxId || "-"} />
            <DetailTile label="Condicion fiscal" value={contact?.taxCondition || "-"} />
            <DetailTile label="Creado" value={formatDateTimeLabel(contact?.createdAt)} />
            <DetailTile label="Actualizado" value={formatDateTimeLabel(contact?.updatedAt)} />
            <DetailTile label="Notas" value={contact?.notes || "Sin notas"} className="md:col-span-2 xl:col-span-3" />
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader>
            <div>
              <CardTitle className="text-xl">Estado financiero</CardTitle>
              <CardDescription>Snapshot operativo derivado de documentos y cobranzas del contacto.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <FinancialTile label="Facturado" value={formatMoney(contact?.financialSnapshot?.totalInvoiced || 0)} />
            <FinancialTile label="Acreditado" value={formatMoney(contact?.financialSnapshot?.totalCredited || 0)} />
            <FinancialTile label="Cobrado" value={formatMoney(contact?.financialSnapshot?.totalPaid || 0)} />
            <FinancialTile label="Pendiente" value={formatMoney(contact?.financialSnapshot?.outstandingAmount || 0)} highlight />
            <FinancialTile label="Pagos sin asignar" value={formatMoney(contact?.financialSnapshot?.unallocatedPayments || 0)} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/6 bg-card/90">
        <CardHeader>
          <div>
            <CardTitle className="text-xl">Documentos relacionados</CardTitle>
            <CardDescription>Facturas y notas de credito del contacto para conectar el snapshot con documentos reales.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {contact?.relatedDocuments?.length ? (
            contact.relatedDocuments.map((document) => (
              <Link
                key={document.id}
                href={`/app/invoices/${document.id}`}
                className="block rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 transition-colors hover:bg-surface/75"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={badgeToneByStatus(document.type)}>{titleCaseLabel(document.type)}</Badge>
                      <Badge variant={badgeToneByStatus(document.status)}>{titleCaseLabel(document.status)}</Badge>
                    </div>
                    <p className="mt-3 font-medium">{document.invoiceNumber || document.id.slice(0, 8)}</p>
                    <p className="mt-1 text-sm text-muted">{formatDateLabel(document.issuedAt || document.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatMoney(document.totalAmount, document.currency)}</p>
                    <p className="mt-1 text-sm text-muted">
                      {document.type === "invoice" ? `Pendiente ${formatMoney(document.outstandingAmount, document.currency)}` : "Ajuste aplicado"}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-6 text-sm text-muted">
              Este contacto todavia no tiene facturas ni notas de credito visibles.
            </div>
          )}
        </CardContent>
      </Card>

      {contact?.relatedPayments?.length ? (
        <Card className="border-white/6 bg-card/90">
          <CardHeader>
            <div>
              <CardTitle className="text-xl">Cobros relacionados</CardTitle>
              <CardDescription>Resumen corto de cobranzas del contacto para complementar la lectura operativa.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {contact.relatedPayments.slice(0, 5).map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={badgeToneByStatus(payment.status)}>{titleCaseLabel(payment.status)}</Badge>
                      <Badge variant="muted">{titleCaseLabel(payment.method)}</Badge>
                    </div>
                    <p className="mt-3 font-medium">{payment.id.slice(0, 8)}</p>
                    <p className="mt-1 text-sm text-muted">{formatDateLabel(payment.paidAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatMoney(payment.amount, payment.currency)}</p>
                    <p className="mt-1 text-sm text-muted">Libre {formatMoney(payment.unallocatedAmount, payment.currency)}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </ClientPageShell>
  );
}

function DetailTile({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 ${className}`}>
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-3 text-sm text-muted">{value}</p>
    </div>
  );
}

function FinancialTile({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border border-[color:var(--border)] p-4 ${highlight ? "bg-brand/8" : "bg-surface/55"}`}>
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-3 text-lg font-semibold">{value}</p>
    </div>
  );
}
