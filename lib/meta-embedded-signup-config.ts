const DEFAULT_CALLBACK_PATH = "/api/app/integrations/whatsapp/embedded-signup/callback";

export type MetaEmbeddedSignupRuntimeConfig = {
  ready: boolean;
  appId: string | null;
  configId: string | null;
  missingConfig: string[];
  graphVersion: string;
  callbackPath: string;
  payloadFields: string[];
};

export function resolveMetaEmbeddedSignupConfig(): MetaEmbeddedSignupRuntimeConfig {
  const appId = String(process.env.WHATSAPP_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID || "").trim();
  const configId = String(
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID || process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID || ""
  ).trim();
  const missingConfig = [
    ...(appId ? [] : ["WHATSAPP_APP_ID"]),
    ...(configId ? [] : ["META_EMBEDDED_SIGNUP_CONFIG_ID"])
  ];

  return {
    ready: Boolean(appId && configId),
    appId: appId || null,
    configId: configId || null,
    missingConfig,
    graphVersion: String(process.env.NEXT_PUBLIC_WHATSAPP_GRAPH_VERSION || process.env.WHATSAPP_GRAPH_VERSION || "v25.0").trim(),
    callbackPath: DEFAULT_CALLBACK_PATH,
    payloadFields: ["appId", "configId", "graphVersion", "redirectUri", "state"]
  };
}
