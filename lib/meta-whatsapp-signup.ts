"use client";

export type MetaEmbeddedSignupBootstrap = {
  tenantId: string;
  clinicId: string;
  state: "idle" | "launching" | "pending_meta" | "connected" | "error" | "ambiguous_configuration";
  provider: "meta_embedded_signup";
  ready: boolean;
  appId: string | null;
  configId: string | null;
  callbackPath: string;
  message: string;
};

export async function beginMetaWhatsAppConnection() {
  const response = await fetch("/api/app/integrations/whatsapp/embedded-signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });

  const json = (await response.json().catch(() => null)) as
    | { data?: MetaEmbeddedSignupBootstrap; error?: string; detail?: string }
    | null;

  if (!response.ok || !json?.data) {
    const message = json?.detail || json?.error || `embedded_signup_failed_${response.status}`;
    throw new Error(message);
  }

  return json.data;
}
