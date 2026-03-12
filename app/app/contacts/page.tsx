import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { requireAppPage } from "@/lib/saas/access";
import { listInboxConversations, readSaasData } from "@/lib/saas/store";

export default async function AppContactsPage() {
  const ctx = await requireAppPage();
  const data = readSaasData();
  const tenantId = ctx.tenantId || data.tenants[0]?.id || "";
  const contacts = data.contacts.filter((item) => item.tenantId === tenantId);
  const conversations = listInboxConversations(tenantId);

  return (
    <ClientPageShell
      title="Contactos"
      description="Vista CRM simple para revisar nombres, telefonos, etiquetas y ultima interaccion sin salir del portal."
      badge="CRM"
    >
      <Card className="border-white/6 bg-card/90">
        <CardHeader action={<Badge variant="muted">{contacts.length} contactos</Badge>}>
          <div>
            <CardTitle className="text-xl">Base de contactos</CardTitle>
            <CardDescription>Listado inicial listo para crecer con filtros, segmentos y pipelines.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-hidden rounded-2xl border border-[color:var(--border)]">
            <div className="grid grid-cols-[minmax(0,1.1fr)_180px_180px_160px] gap-4 border-b border-[color:var(--border)] bg-surface/70 px-4 py-3 text-xs uppercase tracking-[0.16em] text-muted">
              <span>Nombre</span>
              <span>Telefono</span>
              <span>Etiqueta</span>
              <span>Ultima interaccion</span>
            </div>
            {contacts.map((contact) => {
              const conversation = conversations.find((item) => item.contact?.id === contact.id);
              return (
                <div key={contact.id} className="grid grid-cols-[minmax(0,1.1fr)_180px_180px_160px] gap-4 border-b border-[color:var(--border)] px-4 py-4 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{contact.name}</p>
                    <p className="mt-1 truncate text-sm text-muted">{contact.email || contact.industry || "Sin email"}</p>
                  </div>
                  <div className="flex items-center text-sm text-muted">{contact.phone || "-"}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(contact.tags.length ? contact.tags : ["prospecto"]).slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="muted">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center text-sm text-muted">
                    {conversation ? relativeLabel(conversation.lastMessageAt) : "Sin interaccion"}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </ClientPageShell>
  );
}

function relativeLabel(dateString: string) {
  const value = new Date(dateString).getTime();
  if (Number.isNaN(value)) return "Sin fecha";
  const diffMs = Date.now() - value;
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} d`;
}
