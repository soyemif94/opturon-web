import { OperationalAlertsWorkspace } from "@/components/app/operational-alerts-workspace";
import {
  getPortalTenantContext,
  getPortalUsers,
  getPortalWhatsAppStatus,
  isBackendConfigured,
  requestPortalOperationalAlerts
} from "@/lib/api";
import {
  sanitizeOperationalAlertsPayload,
  type OperationalAlertEventType,
  type OperationalAlertHistoryItem,
  type OperationalAlertReadiness,
  type OperationalAlertRecipient,
  type OperationalAlertRule,
  type OperationalAlertSettings,
  type OperationalAlertsInitialData
} from "@/lib/operational-alerts";
import { canManageUsers } from "@/lib/app-permissions";
import { requireAppModulePage } from "@/lib/saas/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BackendEnvelope<T> = { success: boolean; data: T };

export default async function OperationalAlertsPage() {
  const ctx = await requireAppModulePage("settings", { permission: "manage_workspace" });
  const tenantId = String(ctx.tenantId || "").trim();
  const actorUserId = String(ctx.portalActorId || ctx.userId || "").trim();
  const initialData: OperationalAlertsInitialData = {
    settings: null,
    eventTypes: [],
    recipients: [],
    rules: [],
    readinessByRule: {},
    history: [],
    historyPagination: { page: 1, pageSize: 25, total: 0 },
    tenantTimezone: null,
    channels: [],
    staffUsers: [],
    loadError: null
  };

  if (!tenantId || !actorUserId || !isBackendConfigured()) {
    initialData.loadError = "No pudimos resolver el contexto productivo de esta cuenta.";
    return <OperationalAlertsWorkspace initialData={initialData} />;
  }

  async function getOperationalAlerts<T>(path: string) {
    const result = await requestPortalOperationalAlerts<BackendEnvelope<T>>(tenantId, path, {
      method: "GET",
      actorUserId
    });
    return sanitizeOperationalAlertsPayload(result.data) as T;
  }

  const [settingsResult, eventTypesResult, recipientsResult, rulesResult, historyResult, tenantResult, whatsappResult, usersResult] = await Promise.all([
    getOperationalAlerts<OperationalAlertSettings>("/settings").catch(() => null),
    getOperationalAlerts<{ items: OperationalAlertEventType[] }>("/event-types").catch(() => null),
    getOperationalAlerts<{ items: OperationalAlertRecipient[] }>("/recipients?limit=200").catch(() => null),
    getOperationalAlerts<{ items: OperationalAlertRule[] }>("/rules?limit=100&includeArchived=false").catch(() => null),
    getOperationalAlerts<{
      items: OperationalAlertHistoryItem[];
      pagination: { page: number; pageSize: number; total: number };
    }>("/history?page=1&pageSize=25").catch(() => null),
    getPortalTenantContext(tenantId).catch(() => null),
    getPortalWhatsAppStatus(tenantId).catch(() => null),
    canManageUsers(ctx) ? getPortalUsers(tenantId).catch(() => null) : Promise.resolve(null)
  ]);

  initialData.settings = settingsResult;
  initialData.eventTypes = eventTypesResult?.items || [];
  initialData.recipients = recipientsResult?.items || [];
  initialData.history = historyResult?.items || [];
  initialData.historyPagination = historyResult?.pagination || initialData.historyPagination;
  initialData.tenantTimezone = tenantResult?.data?.clinic?.timezone || null;

  const channel = whatsappResult?.data?.channel;
  if (channel?.channelId) {
    initialData.channels = [{
      id: channel.channelId,
      label: channel.verifiedName || channel.displayPhoneNumber || "Canal principal de WhatsApp",
      status: channel.status,
      active: channel.connected === true && String(channel.status || "").toLowerCase() === "active"
    }];
  }
  initialData.staffUsers = (usersResult?.data?.users || [])
    .filter((user) => user.active !== false)
    .map((user) => ({ id: user.id, name: user.name, role: user.role, active: user.active }));

  const rules = rulesResult?.items || [];
  const ruleDetails = await Promise.all(rules.map(async (rule) => {
    const [detail, readiness] = await Promise.all([
      getOperationalAlerts<OperationalAlertRule>(`/rules/${rule.id}`).catch(() => rule),
      getOperationalAlerts<OperationalAlertReadiness>(`/rules/${rule.id}/readiness`).catch(() => null)
    ]);
    return { detail, readiness };
  }));
  initialData.rules = ruleDetails.map((item) => item.detail);
  initialData.readinessByRule = Object.fromEntries(
    ruleDetails.flatMap((item) => item.readiness ? [[item.detail.id, item.readiness]] : [])
  );

  if (!settingsResult || !eventTypesResult || !recipientsResult || !rulesResult || !historyResult) {
    initialData.loadError = "Parte de la configuración no pudo cargarse. Podés reintentar sin perder cambios.";
  }

  return <OperationalAlertsWorkspace initialData={initialData} />;
}
