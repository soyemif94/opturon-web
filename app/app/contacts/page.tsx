import { ClientPageShell } from "@/components/app/client-page-shell";
import { ContactsWorkspace } from "@/components/app/ContactsWorkspace";
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
    <ClientPageShell
      title="Contactos"
      description="Primera vista visible de CRM para listar registros, revisar contexto comercial y cargar nuevos contactos sin salir del portal."
      badge="CRM / Facturacion"
    >
      <ContactsWorkspace initialContacts={contacts} readOnly={!ctx.tenantId || readOnly} />
    </ClientPageShell>
  );
}
