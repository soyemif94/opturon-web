import { ContactEditor } from "@/components/app/ContactEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canEditWorkspace } from "@/lib/app-permissions";
import { getPortalContactDetail, isBackendConfigured } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";
import Link from "next/link";

export default async function AppContactEditPage({ params }: { params: Promise<{ id: string }> }) {
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
    <div className="space-y-4">
      <section className="rounded-[26px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(19,26,39,0.9),rgba(14,14,14,0.92))] px-5 py-4 shadow-[var(--card-shadow)] xl:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="secondary" size="sm" className="rounded-2xl">
                <Link href="/app/contacts">Volver a contactos</Link>
              </Button>
              <Badge variant="warning">Edicion de contacto</Badge>
            </div>
            <h1 className="mt-3 text-[2rem] font-semibold tracking-tight">{contact?.name ? `Editar ${contact.name}` : "Editar contacto"}</h1>
            <p className="mt-1.5 text-sm leading-6 text-muted">
              Ajusta identidad, canal y datos fiscales sin salir del CRM.
            </p>
          </div>

          <div className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-4 py-3 lg:min-w-[260px]">
            <p className="text-sm font-medium text-text">Estado del contacto</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={contact?.status === "archived" ? "danger" : "success"}>{contact?.status === "archived" ? "Archivado" : "Activo"}</Badge>
              <span className="text-sm text-muted">{readOnly ? "Solo lectura" : "Editable"}</span>
            </div>
          </div>
        </div>
      </section>

      {!contact ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-sm text-muted">
          No pudimos cargar el contacto solicitado.
        </div>
      ) : readOnly ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-8 text-sm text-muted">
          Este espacio esta en modo solo lectura y no puede editar contactos.
        </div>
      ) : (
        <ContactEditor contact={contact} />
      )}
    </div>
  );
}
