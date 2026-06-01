import { ClientPageShell } from "@/components/app/client-page-shell";
import { SalesHub } from "@/components/app/sales-hub";
import { canEditWorkspace } from "@/lib/app-permissions";
import {
  getPortalSalesMetrics,
  getPortalSalesOpportunities,
  getPortalSalesSummary,
  isBackendConfigured,
  type PortalSalesMetrics,
  type PortalSalesOpportunity,
  type PortalSalesSummary
} from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";

export default async function AppSalesPage() {
  const ctx = await requireAppPage();
  const readOnly = !canEditWorkspace(ctx);
  const backendReady = Boolean(ctx.tenantId) && isBackendConfigured();
  let summary: PortalSalesSummary = {
    salesToday: 0,
    salesMonth: 0,
    activeOpportunities: 0,
    closeRate: 0,
    averageTicket: 0,
    activeSalesConversations: 0
  };
  let metrics: PortalSalesMetrics = {
    closedSalesCount: 0,
    openOpportunitiesCount: 0,
    activeSalesConversations: 0,
    humanResponsesCount: 0,
    automatedResponsesCount: 0,
    totalConversationMessagesCount: 0,
    responsiblePerformance: []
  };
  let opportunities: PortalSalesOpportunity[] = [];

  if (ctx.tenantId && backendReady) {
    try {
      const [summaryResult, metricsResult, opportunitiesResult] = await Promise.all([
        getPortalSalesSummary(ctx.tenantId),
        getPortalSalesMetrics(ctx.tenantId),
        getPortalSalesOpportunities(ctx.tenantId, { visibility: "active" })
      ]);
      summary = summaryResult.data.summary;
      metrics = metricsResult.data.metrics;
      opportunities = opportunitiesResult.data.opportunities || [];
    } catch {
      summary = summary;
      metrics = metrics;
      opportunities = [];
    }
  }

  return (
    <ClientPageShell
      title="Ventas"
      description="Centro comercial premium para seguir pipeline, cierres, responsables y oportunidades activas del espacio."
      badge="Pipeline comercial"
    >
      <SalesHub
        summary={summary}
        metrics={metrics}
        opportunities={opportunities}
        readOnly={!ctx.tenantId || readOnly}
        tenantKey={ctx.tenantId || "workspace-demo"}
      />
    </ClientPageShell>
  );
}
