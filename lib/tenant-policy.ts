import type { AppModule } from "@/lib/app-permissions";

export const IMPLEMENTED_APP_MODULES = [
  "inbox",
  "contacts",
  "catalog",
  "orders",
  "invoices",
  "payments",
  "cash",
  "sales",
  "agenda",
  "loyalty",
  "automations",
  "metrics"
] as const;

export const LEGACY_ALWAYS_VISIBLE_MODULES = [
  "home",
  "ops",
  "integrations",
  "settings",
  "users",
  "business",
  "faqs",
  "inventory"
] as const;

export const APP_MODULE_TO_CAPABILITY: Partial<Record<AppModule, string>> = {
  inbox: "inbox",
  contacts: "contacts",
  catalog: "catalog",
  orders: "orders",
  invoices: "receipts",
  payments: "payments",
  cash: "cash_management",
  sales: "sales_pipeline",
  agenda: "appointments",
  loyalty: "loyalty",
  automations: "automations",
  metrics: "metrics"
};

export function getCapabilityForAppModule(moduleName: string) {
  return APP_MODULE_TO_CAPABILITY[moduleName as AppModule] || null;
}

export function buildEnabledModulesFromCapabilities(capabilities: string[]) {
  const granted = new Set(
    (Array.isArray(capabilities) ? capabilities : [])
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean)
  );

  return IMPLEMENTED_APP_MODULES.reduce<Record<string, boolean>>((acc, moduleName) => {
    const capability = getCapabilityForAppModule(moduleName);
    acc[moduleName] = capability ? granted.has(capability) : true;
    return acc;
  }, {});
}

export type TenantOperatingProfile = {
  presetKey?: string;
  industryProfile?: string;
  operatingModel?: string;
  businessSubtype?: string | null;
};

export type TenantPortalPolicy = {
  policyVersion?: number;
  planCode: string;
  limits: {
    maxPortalUsers: number;
    maxAutomations: number;
    maxContacts: number;
  };
  operatingProfile?: TenantOperatingProfile;
  recommendedCapabilities?: string[];
  capabilities: string[];
  enabledModules: Record<string, boolean>;
  implementedModules?: string[];
  source?: string;
};

function hasExplicitTenantPolicy(policy?: TenantPortalPolicy | null) {
  if (!policy) return false;
  if (Number(policy.policyVersion) >= 1) return true;
  if (policy.operatingProfile && typeof policy.operatingProfile === "object") return true;
  if (Array.isArray(policy.capabilities) && policy.capabilities.length > 0) return true;
  return Boolean(policy.enabledModules && Object.keys(policy.enabledModules).length > 0);
}

export function buildTenantAppModules(policy?: TenantPortalPolicy | null) {
  const explicitPolicy = hasExplicitTenantPolicy(policy);
  const modules = policy?.enabledModules && typeof policy.enabledModules === "object" ? policy.enabledModules : {};
  return [...IMPLEMENTED_APP_MODULES, ...LEGACY_ALWAYS_VISIBLE_MODULES].reduce<Record<string, boolean>>((acc, moduleName) => {
    if (IMPLEMENTED_APP_MODULES.includes(moduleName as (typeof IMPLEMENTED_APP_MODULES)[number])) {
      acc[moduleName] = explicitPolicy ? modules[moduleName] !== false : true;
      return acc;
    }
    acc[moduleName] = true;
    return acc;
  }, {});
}
