type EnvSource = Record<string, string | undefined>;

export type PasswordResetDeliveryFailureLog = {
  event: "portal_password_reset_delivery_failed";
  stage: string;
  errorType: string;
  status: number | null;
  providerCode: string | null;
  providerRequestId: string | null;
  hostname: string | null;
  config: {
    hasPasswordResetBaseUrl: boolean;
    hasResendApiKey: boolean;
    hasResetEmailFrom: boolean;
    hasPortalInvitationEmailFrom: boolean;
  };
};

export class PasswordResetDeliveryError extends Error {
  details: Omit<PasswordResetDeliveryFailureLog, "event">;

  constructor(message: string, details: Omit<PasswordResetDeliveryFailureLog, "event">) {
    super(message);
    this.name = "PasswordResetDeliveryError";
    this.details = details;
  }
}

function normalizeEnvValue(value: string | undefined) {
  return String(value || "").trim();
}

function hasWhitespaceEdge(value: string | undefined) {
  const raw = String(value || "");
  return raw.length > 0 && raw !== raw.trim();
}

function resolveHostname(input: string) {
  try {
    return new URL(input).hostname || null;
  } catch {
    return null;
  }
}

function buildConfigPresence(env: EnvSource) {
  return {
    hasPasswordResetBaseUrl: Boolean(resolvePasswordResetBaseUrl(env)),
    hasResendApiKey: Boolean(normalizeEnvValue(env.RESEND_API_KEY)),
    hasResetEmailFrom: Boolean(normalizeEnvValue(env.RESET_EMAIL_FROM)),
    hasPortalInvitationEmailFrom: Boolean(normalizeEnvValue(env.PORTAL_INVITATION_EMAIL_FROM))
  };
}

export function resolvePasswordResetBaseUrl(env: EnvSource = process.env) {
  return String(
    env.PASSWORD_RESET_BASE_URL ||
      env.NEXTAUTH_URL ||
      env.NEXT_PUBLIC_SITE_URL ||
      ""
  )
    .trim()
    .replace(/\/$/, "");
}

export function buildPasswordResetLink(baseUrl: string, token: string) {
  const safeBaseUrl = normalizeEnvValue(baseUrl);
  if (!safeBaseUrl) {
    throw new PasswordResetDeliveryError("password_reset_base_url_not_configured", {
      stage: "build_reset_link",
      errorType: "missing_config",
      status: null,
      providerCode: null,
      providerRequestId: null,
      hostname: null,
      config: buildConfigPresence(process.env)
    });
  }

  const url = new URL("/reset-password", safeBaseUrl);
  url.searchParams.set("token", String(token || ""));
  return url.toString();
}

function resolvePasswordResetEmailFrom(env: EnvSource = process.env) {
  return String(env.PORTAL_INVITATION_EMAIL_FROM || env.RESET_EMAIL_FROM || "").trim();
}

function parseResendResponse(bodyText: string) {
  if (!bodyText) return { providerCode: null, providerRequestId: null };
  try {
    const parsed = JSON.parse(bodyText) as Record<string, unknown>;
    const providerCode =
      typeof parsed.error === "string"
        ? parsed.error
        : typeof parsed.code === "string"
          ? parsed.code
          : null;
    const providerRequestId =
      typeof parsed.id === "string"
        ? parsed.id
        : typeof parsed.request_id === "string"
          ? parsed.request_id
          : null;
    return { providerCode, providerRequestId };
  } catch {
    return { providerCode: null, providerRequestId: null };
  }
}

export async function sendPasswordResetEmailViaResend(
  input: {
    email: string;
    resetLink: string;
  },
  options: {
    env?: EnvSource;
    fetchImpl?: typeof fetch;
  } = {}
) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || fetch;
  const apiKey = normalizeEnvValue(env.RESEND_API_KEY);
  const from = resolvePasswordResetEmailFrom(env);
  const hostname = resolveHostname(input.resetLink);
  const config = buildConfigPresence(env);

  if (!apiKey || !from) {
    throw new PasswordResetDeliveryError("password_reset_email_not_configured", {
      stage: "resend_config",
      errorType: "missing_config",
      status: null,
      providerCode: null,
      providerRequestId: null,
      hostname,
      config
    });
  }

  try {
    const response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [input.email],
        subject: "Restablece tu contrasena de Opturon",
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
            <h2>Restablece tu contrasena</h2>
            <p>Recibimos una solicitud para cambiar tu contrasena de Opturon.</p>
            <p>
              <a href="${input.resetLink}" style="display:inline-block;padding:12px 18px;background:#c05000;color:#fff;text-decoration:none;border-radius:10px;">
                Crear nueva contrasena
              </a>
            </p>
            <p>Este enlace vence en 30 minutos. Si no solicitaste este cambio, puedes ignorar este correo.</p>
          </div>
        `
      })
    });

    if (!response.ok) {
      const bodyText = await response.text();
      const parsed = parseResendResponse(bodyText);
      throw new PasswordResetDeliveryError(`password_reset_email_failed_${response.status}`, {
        stage: "resend_response",
        errorType:
          response.status === 400
            ? "validation_error"
            : response.status === 401
              ? "unauthorized"
              : response.status === 403
                ? "domain_not_verified"
                : response.status === 429
                  ? "rate_limit"
                  : "provider_error",
        status: response.status,
        providerCode: parsed.providerCode,
        providerRequestId: parsed.providerRequestId,
        hostname,
        config
      });
    }

    const successBody = await response.text();
    const parsed = parseResendResponse(successBody);
    return {
      status: response.status,
      providerRequestId: parsed.providerRequestId
    };
  } catch (error) {
    if (error instanceof PasswordResetDeliveryError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "unknown_error";
    throw new PasswordResetDeliveryError(message, {
      stage: "resend_request",
      errorType: /timeout/i.test(message) ? "timeout" : "network_error",
      status: null,
      providerCode: null,
      providerRequestId: null,
      hostname,
      config
    });
  }
}

export function buildPasswordResetDeliveryFailureLog(error: unknown) {
  if (error instanceof PasswordResetDeliveryError) {
    return {
      event: "portal_password_reset_delivery_failed",
      ...error.details
    } satisfies PasswordResetDeliveryFailureLog;
  }

  return {
    event: "portal_password_reset_delivery_failed",
    stage: "unknown",
    errorType: "unknown_error",
    status: null,
    providerCode: null,
    providerRequestId: null,
    hostname: null,
    config: buildConfigPresence(process.env)
  } satisfies PasswordResetDeliveryFailureLog;
}

export function getPasswordResetConfigShape(env: EnvSource = process.env) {
  const baseUrl = resolvePasswordResetBaseUrl(env);
  const from = normalizeEnvValue(env.RESET_EMAIL_FROM);
  const invitationFrom = normalizeEnvValue(env.PORTAL_INVITATION_EMAIL_FROM);
  return {
    hasPasswordResetBaseUrl: Boolean(baseUrl),
    passwordResetBaseUrlHostname: resolveHostname(baseUrl),
    passwordResetBaseUrlUsesHttps: baseUrl.startsWith("https://"),
    hasResendApiKey: Boolean(normalizeEnvValue(env.RESEND_API_KEY)),
    hasResetEmailFrom: Boolean(from),
    hasPortalInvitationEmailFrom: Boolean(invitationFrom),
    resetEmailFromHasEdgeWhitespace: hasWhitespaceEdge(env.RESET_EMAIL_FROM),
    invitationEmailFromHasEdgeWhitespace: hasWhitespaceEdge(env.PORTAL_INVITATION_EMAIL_FROM)
  };
}
