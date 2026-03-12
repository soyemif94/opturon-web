"use client";

type EmbeddedSignupState =
  | "idle"
  | "launching"
  | "pending_meta"
  | "connected"
  | "error"
  | "ambiguous_configuration";

export type MetaEmbeddedSignupBootstrap = {
  tenantId: string;
  clinicId: string;
  state: EmbeddedSignupState;
  provider: "meta_embedded_signup";
  ready: boolean;
  appId: string | null;
  configId: string | null;
  graphVersion: string;
  redirectUri: string;
  callbackPath: string;
  stateToken: string | null;
  sessionId: string | null;
  message: string;
};

export type MetaEmbeddedSignupLaunchResult = {
  state: EmbeddedSignupState;
  message: string;
  channelId: string | null;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
};

type MetaCallbackPayload = {
  type: "OPTURON_META_EMBEDDED_SIGNUP_CALLBACK";
  code?: string | null;
  stateToken?: string | null;
  error?: string | null;
  errorDescription?: string | null;
};

type MetaEmbeddedEvent = {
  eventName: string | null;
  businessId: string | null;
  wabaId: string | null;
  phoneNumberId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  raw: Record<string, unknown>;
};

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (options: Record<string, unknown>) => void;
      login: (
        callback: (response: { status?: string; authResponse?: { code?: string | null } | null }) => void,
        options?: Record<string, unknown>
      ) => void;
    };
  }
}

const META_SDK_SRC = "https://connect.facebook.net/en_US/sdk.js";
const META_CALLBACK_MESSAGE = "OPTURON_META_EMBEDDED_SIGNUP_CALLBACK";
const CALLBACK_WAIT_MS = 90_000;

let sdkPromise: Promise<void> | null = null;

function normalizeMetaPayload(rawPayload: unknown): MetaEmbeddedEvent | null {
  if (!rawPayload) return null;
  let payload: Record<string, unknown> | null = null;

  if (typeof rawPayload === "string") {
    try {
      payload = JSON.parse(rawPayload) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (typeof rawPayload === "object") {
    payload = rawPayload as Record<string, unknown>;
  }

  if (!payload) return null;

  const data =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : payload;

  const eventName = String(payload.event || data.event || payload.type || "").trim().toUpperCase() || null;
  const businessId = String(
    data.business_id || data.businessId || data.business_account_id || data.businessAccountId || ""
  ).trim() || null;
  const wabaId = String(
    data.waba_id || data.wabaId || data.whatsapp_business_account_id || data.whatsappBusinessAccountId || ""
  ).trim() || null;
  const phoneNumberId = String(
    data.phone_number_id || data.phoneNumberId || data.business_phone_number_id || data.businessPhoneNumberId || ""
  ).trim() || null;
  const errorCode = String(data.error_code || data.errorCode || "").trim() || null;
  const errorMessage = String(data.error_message || data.errorMessage || "").trim() || null;

  if (!eventName && !wabaId && !phoneNumberId && !errorCode) {
    return null;
  }

  return {
    eventName,
    businessId,
    wabaId,
    phoneNumberId,
    errorCode,
    errorMessage,
    raw: payload
  };
}

function loadFacebookSdk(appId: string, graphVersion: string) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("meta_sdk_requires_browser"));
  }

  if (window.FB) {
    window.FB.init({
      appId,
      version: graphVersion.startsWith("v") ? graphVersion : `v${graphVersion}`,
      xfbml: false,
      cookie: false,
      status: false
    });
    return Promise.resolve();
  }

  if (!sdkPromise) {
    sdkPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-meta-sdk="1"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("meta_sdk_load_failed")), { once: true });
        return;
      }

      window.fbAsyncInit = () => {
        if (!window.FB) {
          reject(new Error("meta_sdk_unavailable"));
          return;
        }

        window.FB.init({
          appId,
          version: graphVersion.startsWith("v") ? graphVersion : `v${graphVersion}`,
          xfbml: false,
          cookie: false,
          status: false
        });
        resolve();
      };

      const script = document.createElement("script");
      script.src = META_SDK_SRC;
      script.async = true;
      script.defer = true;
      script.dataset.metaSdk = "1";
      script.onerror = () => reject(new Error("meta_sdk_load_failed"));
      document.body.appendChild(script);
    });
  }

  return sdkPromise;
}

async function bootstrapEmbeddedSignup(): Promise<MetaEmbeddedSignupBootstrap> {
  const response = await fetch("/api/app/integrations/whatsapp/embedded-signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });

  const json = (await response.json().catch(() => null)) as
    | { data?: MetaEmbeddedSignupBootstrap; error?: string; detail?: string }
    | null;

  if (!response.ok || !json?.data) {
    const message = json?.detail || json?.error || `embedded_signup_bootstrap_failed_${response.status}`;
    throw new Error(message);
  }

  return json.data;
}

function waitForMetaCompletion(stateToken: string) {
  return new Promise<{ callback: MetaCallbackPayload; metaEvent: MetaEmbeddedEvent | null }>((resolve, reject) => {
    let callbackPayload: MetaCallbackPayload | null = null;
    let metaEventPayload: MetaEmbeddedEvent | null = null;
    let done = false;

    const cleanup = () => {
      done = true;
      window.removeEventListener("message", onMessage);
      clearTimeout(timeout);
    };

    const finish = () => {
      if (done || !callbackPayload) return;
      cleanup();
      resolve({ callback: callbackPayload, metaEvent: metaEventPayload });
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin && !String(event.origin || "").includes("facebook.com")) {
        return;
      }

      if (event.origin === window.location.origin) {
        const payload = event.data as MetaCallbackPayload | null;
        if (payload && payload.type === META_CALLBACK_MESSAGE) {
          if (payload.stateToken && payload.stateToken !== stateToken) {
            return;
          }
          callbackPayload = payload;
          finish();
        }
        return;
      }

      const normalized = normalizeMetaPayload(event.data);
      if (!normalized) return;
      metaEventPayload = normalized;
    };

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("meta_embedded_signup_timeout"));
    }, CALLBACK_WAIT_MS);

    window.addEventListener("message", onMessage);
  });
}

async function finalizeEmbeddedSignup(input: {
  stateToken: string;
  code?: string | null;
  redirectUri: string;
  metaPayload?: Record<string, unknown> | null;
  error?: string | null;
  errorDescription?: string | null;
}) {
  const requestId = `meta-esu-${Date.now()}`;
  const response = await fetch("/api/app/integrations/whatsapp/embedded-signup/callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      requestId
    })
  });

  const json = (await response.json().catch(() => null)) as
    | {
        success?: boolean;
        data?: {
          status: EmbeddedSignupState;
          channel?: { id?: string | null; phoneNumberId?: string | null; displayPhoneNumber?: string | null } | null;
        };
        error?: string;
        detail?: string;
      }
    | null;

  if (!response.ok || !json?.data) {
    const detail = json?.detail || json?.error || `embedded_signup_finalize_failed_${response.status}`;
    throw new Error(detail);
  }

  return json.data;
}

export async function beginMetaWhatsAppConnection(): Promise<MetaEmbeddedSignupLaunchResult> {
  const bootstrap = await bootstrapEmbeddedSignup();

  if (!bootstrap.ready || !bootstrap.appId || !bootstrap.configId || !bootstrap.stateToken) {
    return {
      state: "pending_meta",
      message: bootstrap.message,
      channelId: null,
      phoneNumberId: null,
      displayPhoneNumber: null
    };
  }

  await loadFacebookSdk(bootstrap.appId, bootstrap.graphVersion);

  if (!window.FB) {
    throw new Error("meta_sdk_unavailable");
  }

  const completionPromise = waitForMetaCompletion(bootstrap.stateToken);
  let immediateCode: string | null = null;

  window.FB.login(
    (response) => {
      immediateCode = response?.authResponse?.code || null;
    },
    {
      config_id: bootstrap.configId,
      response_type: "code",
      override_default_response_type: true,
      extras: {
        feature: "whatsapp_embedded_signup",
        sessionInfoVersion: 3,
        redirect_uri: bootstrap.redirectUri
      },
      state: bootstrap.stateToken
    }
  );

  const { callback, metaEvent } = await completionPromise;
  const callbackCode = callback.code || immediateCode || null;

  if (callback.error) {
    throw new Error(callback.errorDescription || callback.error);
  }

  const finalized = await finalizeEmbeddedSignup({
    stateToken: bootstrap.stateToken,
    code: callbackCode,
    redirectUri: bootstrap.redirectUri,
    metaPayload: metaEvent?.raw || null,
    error: metaEvent?.errorCode || null,
    errorDescription: metaEvent?.errorMessage || null
  });

  return {
    state: finalized.status,
    message:
      finalized.status === "connected"
        ? "Tu canal de WhatsApp Business ya quedo asociado a este workspace."
        : "La conexion quedo pendiente de una validacion final en Meta.",
    channelId: finalized.channel?.id || null,
    phoneNumberId: finalized.channel?.phoneNumberId || null,
    displayPhoneNumber: finalized.channel?.displayPhoneNumber || null
  };
}
