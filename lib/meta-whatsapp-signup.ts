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
  missingConfig?: string[];
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

export type MetaEmbeddedSignupErrorKind = "meta_blocked" | "cancelled" | "config" | "timeout" | "unknown";

export type MetaEmbeddedSignupErrorDetails = {
  kind: MetaEmbeddedSignupErrorKind;
  code: string;
  message: string;
  fallbackToManual: boolean;
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

function debugLog(stage: string, payload?: Record<string, unknown>) {
  console.info("[meta-embedded-signup]", stage, payload || {});
}

function debugError(stage: string, error: unknown, payload?: Record<string, unknown>) {
  console.error("[meta-embedded-signup]", stage, {
    ...(payload || {}),
    error: error instanceof Error ? error.message : String(error || "unknown_error")
  });
}

class MetaEmbeddedSignupError extends Error {
  readonly code: string;
  readonly kind: MetaEmbeddedSignupErrorKind;
  readonly fallbackToManual: boolean;

  constructor(details: MetaEmbeddedSignupErrorDetails) {
    super(details.message);
    this.name = "MetaEmbeddedSignupError";
    this.code = details.code;
    this.kind = details.kind;
    this.fallbackToManual = details.fallbackToManual;
  }
}

function sanitizeMessage(message: string | null | undefined) {
  return String(message || "").trim();
}

function isMetaBlockedMessage(message: string) {
  const normalized = sanitizeMessage(message).toLowerCase();
  if (!normalized) return false;

  return [
    "embedded signup is only available for bsps or tps",
    "only available for bsps or tps",
    "only available for bsps",
    "only available for tech providers",
    "app is not available",
    "this app is not available",
    "app not available",
    "embedded signup unavailable",
    "unsupported app",
    "not available for this app",
    "business solution provider",
    "tech provider"
  ].some((pattern) => normalized.includes(pattern));
}

function isCancellationMessage(message: string, code?: string | null) {
  const normalized = sanitizeMessage(message).toLowerCase();
  const normalizedCode = sanitizeMessage(code).toLowerCase();

  return (
    normalizedCode === "access_denied" ||
    normalizedCode === "user_denied" ||
    normalizedCode === "cancelled" ||
    normalizedCode === "canceled" ||
    normalizedCode === "not_authorized" ||
    normalized.includes("access_denied") ||
    normalized.includes("user_denied") ||
    normalized.includes("cancelled") ||
    normalized.includes("canceled") ||
    normalized.includes("cancelaste") ||
    normalized.includes("cerraste la ventana") ||
    normalized.includes("not_authorized")
  );
}

function buildMetaEmbeddedSignupError(params: {
  message?: string | null;
  code?: string | null;
  fallbackMessage?: string;
}): MetaEmbeddedSignupError {
  const rawMessage = sanitizeMessage(params.message);
  const rawCode = sanitizeMessage(params.code);
  const message = rawMessage || params.fallbackMessage || "No pudimos completar la conexion con Meta.";

  if (isMetaBlockedMessage(`${rawCode} ${rawMessage}`)) {
    return new MetaEmbeddedSignupError({
      kind: "meta_blocked",
      code: rawCode || "meta_embedded_signup_unavailable",
      message:
        "Meta no habilitó Embedded Signup para esta app. Puedes continuar con la conexión manual asistida sin perder el progreso.",
      fallbackToManual: true
    });
  }

  if (isCancellationMessage(rawMessage, rawCode)) {
    return new MetaEmbeddedSignupError({
      kind: "cancelled",
      code: rawCode || "meta_embedded_signup_cancelled",
      message: "Cancelaste la conexión con Meta. Puedes reintentarlo o seguir por la conexión manual asistida.",
      fallbackToManual: false
    });
  }

  if (rawCode === "meta_embedded_signup_timeout") {
    return new MetaEmbeddedSignupError({
      kind: "timeout",
      code: rawCode,
      message:
        "No recibimos una confirmación válida desde Meta. Si Embedded Signup sigue bloqueado, puedes continuar con la conexión manual asistida.",
      fallbackToManual: true
    });
  }

  if (rawCode.includes("config") || rawCode.includes("state_token") || rawMessage.toLowerCase().includes("falta configurar")) {
    return new MetaEmbeddedSignupError({
      kind: "config",
      code: rawCode || "embedded_signup_not_ready",
      message,
      fallbackToManual: true
    });
  }

  return new MetaEmbeddedSignupError({
    kind: "unknown",
    code: rawCode || "meta_embedded_signup_failed",
    message,
    fallbackToManual: false
  });
}

export function getMetaEmbeddedSignupErrorDetails(error: unknown): MetaEmbeddedSignupErrorDetails {
  if (error instanceof MetaEmbeddedSignupError) {
    return {
      kind: error.kind,
      code: error.code,
      message: error.message,
      fallbackToManual: error.fallbackToManual
    };
  }

  const message = error instanceof Error ? error.message : String(error || "meta_embedded_signup_failed");
  const classified = buildMetaEmbeddedSignupError({
    message,
    code: error instanceof Error ? error.name : null
  });

  return {
    kind: classified.kind,
    code: classified.code,
    message: classified.message,
    fallbackToManual: classified.fallbackToManual
  };
}

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
  debugLog("bootstrap_start");
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
    debugError("bootstrap_fail", message, { status: response.status, body: json || null });
    throw buildMetaEmbeddedSignupError({ message, code: "embedded_signup_bootstrap_failed" });
  }

  debugLog("bootstrap_success", {
    ready: json.data.ready,
    tenantId: json.data.tenantId,
    clinicId: json.data.clinicId,
    appIdPresent: Boolean(json.data.appId),
    configIdPresent: Boolean(json.data.configId),
    redirectUri: json.data.redirectUri,
    stateTokenPresent: Boolean(json.data.stateToken),
    missingConfig: json.data.missingConfig || []
  });
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
          debugLog("callback_message_received", {
            stateTokenPresent: Boolean(payload.stateToken),
            codePresent: Boolean(payload.code),
            error: payload.error || null
          });
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
      debugLog("meta_postmessage_received", {
        eventName: normalized.eventName,
        businessId: normalized.businessId,
        wabaId: normalized.wabaId,
        phoneNumberId: normalized.phoneNumberId,
        errorCode: normalized.errorCode
      });
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
  debugLog("finalize_start", {
    requestId,
    stateTokenPresent: Boolean(input.stateToken),
    codePresent: Boolean(input.code),
    redirectUri: input.redirectUri,
    hasMetaPayload: Boolean(input.metaPayload),
    error: input.error || null
  });
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
    debugError("finalize_fail", detail, { status: response.status, body: json || null, requestId });
    throw new Error(detail);
  }

  debugLog("finalize_success", {
    requestId,
    status: json.data.status,
    channelId: json.data.channel?.id || null,
    phoneNumberId: json.data.channel?.phoneNumberId || null
  });
  return json.data;
}

export async function beginMetaWhatsAppConnection(): Promise<MetaEmbeddedSignupLaunchResult> {
  debugLog("click_received");
  const bootstrap = await bootstrapEmbeddedSignup();

  if (!bootstrap.ready || !bootstrap.appId || !bootstrap.configId || !bootstrap.stateToken) {
    const missingConfig = Array.isArray(bootstrap.missingConfig) ? bootstrap.missingConfig.join(", ") : "";
    const message =
      missingConfig || !bootstrap.stateToken
        ? `Embedded Signup no listo. Falta configurar: ${[
            ...(missingConfig ? [missingConfig] : []),
            ...(!bootstrap.stateToken ? ["STATE_TOKEN"] : [])
          ].join(", ")}.`
        : bootstrap.message;
    debugError("launch_blocked_before_sdk", message, {
      ready: bootstrap.ready,
      appIdPresent: Boolean(bootstrap.appId),
      configIdPresent: Boolean(bootstrap.configId),
      stateTokenPresent: Boolean(bootstrap.stateToken),
      missingConfig: bootstrap.missingConfig || []
    });
    throw buildMetaEmbeddedSignupError({
      message,
      code: !bootstrap.ready ? "embedded_signup_not_ready" : "embedded_signup_state_token_missing"
    });
  }

  debugLog("sdk_load_start", {
    appIdPresent: Boolean(bootstrap.appId),
    configIdPresent: Boolean(bootstrap.configId),
    graphVersion: bootstrap.graphVersion
  });
  await loadFacebookSdk(bootstrap.appId, bootstrap.graphVersion);
  debugLog("sdk_loaded", { fbAvailable: Boolean(window.FB) });

  if (!window.FB) {
    debugError("sdk_missing_fb", "meta_sdk_unavailable");
    throw buildMetaEmbeddedSignupError({
      message: "No pudimos cargar el SDK de Meta para abrir la conexión guiada.",
      code: "meta_sdk_unavailable"
    });
  }

  const completionPromise = waitForMetaCompletion(bootstrap.stateToken);
  let immediateCode: string | null = null;

  try {
    debugLog("launch_start", {
      redirectUri: bootstrap.redirectUri,
      stateTokenPresent: Boolean(bootstrap.stateToken),
      configIdPresent: Boolean(bootstrap.configId)
    });
    window.FB.login(
      (response) => {
        immediateCode = response?.authResponse?.code || null;
        debugLog("fb_login_callback", {
          status: response?.status || null,
          codePresent: Boolean(immediateCode)
        });
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
  } catch (error) {
    debugError("launch_fail", error, {
      redirectUri: bootstrap.redirectUri,
      configIdPresent: Boolean(bootstrap.configId)
    });
    throw buildMetaEmbeddedSignupError({
      message: error instanceof Error ? error.message : "meta_embedded_signup_launch_failed",
      code: "meta_embedded_signup_launch_failed"
    });
  }

  let callback: MetaCallbackPayload;
  let metaEvent: MetaEmbeddedEvent | null;
  try {
    ({ callback, metaEvent } = await completionPromise);
  } catch (error) {
    throw buildMetaEmbeddedSignupError({
      message: error instanceof Error ? error.message : "meta_embedded_signup_timeout",
      code: error instanceof Error ? error.message : "meta_embedded_signup_timeout"
    });
  }
  const callbackCode = callback.code || immediateCode || null;

  if (callback.error) {
    throw buildMetaEmbeddedSignupError({
      message: callback.errorDescription || metaEvent?.errorMessage || callback.error,
      code: callback.error || metaEvent?.errorCode || null
    });
  }

  let finalized;
  try {
    finalized = await finalizeEmbeddedSignup({
      stateToken: bootstrap.stateToken,
      code: callbackCode,
      redirectUri: bootstrap.redirectUri,
      metaPayload: metaEvent?.raw || null,
      error: metaEvent?.errorCode || null,
      errorDescription: metaEvent?.errorMessage || null
    });
  } catch (error) {
    throw buildMetaEmbeddedSignupError({
      message: error instanceof Error ? error.message : "embedded_signup_finalize_failed",
      code: "embedded_signup_finalize_failed"
    });
  }

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
