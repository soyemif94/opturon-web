import { ContactsWorkspace } from "@/components/app/ContactsWorkspace";
import { Badge } from "@/components/ui/badge";
import { canEditWorkspace } from "@/lib/app-permissions";
import { getPortalContacts, isBackendConfigured, type PortalContactDetail } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";
import { listInboxConversations, readSaasData } from "@/lib/saas/store";

export default async function AppContactsPage() {
  const ctx = await requireAppPage();
  const backendReady = Boolean(ctx.tenantId) && isBackendConfigured();
  const readOnly = !canEditWorkspace(ctx);
  const useLocalDemoData = !ctx.tenantId;
  let contacts: PortalContactDetail[] = [];

  if (ctx.tenantId && backendReady) {
    try {
      const result = await getPortalContacts(ctx.tenantId);
      contacts = Array.isArray(result.data?.contacts) ? (result.data.contacts as PortalContactDetail[]) : [];
    } catch {
      contacts = [];
    }
  } else if (useLocalDemoData) {
    const data = readSaasData();
    const tenantId = data.tenants[0]?.id || "";
    const conversations = listInboxConversations(tenantId);
    contacts = data.contacts
      .filter((item) => item.tenantId === tenantId)
      .map((item) => ({
        id: item.id,
        clinicId: tenantId,
        waId: item.phone || null,
        phone: item.phone || null,
        whatsappPhone: item.phone || null,
        name: item.name,
        optedOut: false,
        lastInteractionAt: conversations.find((row) => row.contact?.id === item.id)?.lastMessageAt || null,
        conversationCount: conversations.filter((row) => row.contact?.id === item.id).length,
        email: item.email || null,
        companyName: null,
        status: "active",
        notes: null,
        createdAt: null,
        updatedAt: null
      }));
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[26px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-5 py-4 shadow-[var(--card-shadow)] xl:px-6">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">CRM comercial</Badge>
            <Badge variant="muted">Base activa</Badge>
          </div>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-tight">Contactos</h1>
          <p className="mt-1.5 text-sm leading-6 text-muted">
            Ordena actividad, prioridad y contexto comercial en una sola vista para operar rapido.
          </p>
        </div>
      </section>

      <ContactsWorkspace initialContacts={contacts} readOnly={!ctx.tenantId || readOnly} />
    </div>
  );
}
