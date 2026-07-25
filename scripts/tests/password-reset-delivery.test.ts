import assert from "node:assert/strict";
import {
  PasswordResetDeliveryError,
  buildPasswordResetDeliveryFailureLog,
  buildPasswordResetLink,
  getPasswordResetConfigShape,
  resolvePasswordResetBaseUrl,
  sendPasswordResetEmailViaResend
} from "../../lib/password-reset-delivery.ts";

function makeEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    PASSWORD_RESET_BASE_URL: "",
    NEXTAUTH_URL: "",
    NEXT_PUBLIC_SITE_URL: "",
    RESEND_API_KEY: "",
    RESET_EMAIL_FROM: "",
    PORTAL_INVITATION_EMAIL_FROM: "",
    ...overrides
  };
}

async function testBaseUrlResolutionAndLinkBuilder() {
  const env = makeEnv({
    PASSWORD_RESET_BASE_URL: "https://www.opturon.com"
  });
  assert.equal(resolvePasswordResetBaseUrl(env), "https://www.opturon.com");

  const link = buildPasswordResetLink(resolvePasswordResetBaseUrl(env), "abc+123/==");
  const url = new URL(link);
  assert.equal(url.origin, "https://www.opturon.com");
  assert.equal(url.pathname, "/reset-password");
  assert.equal(url.searchParams.get("token"), "abc+123/==");
}

async function testMissingBaseUrlShape() {
  const shape = getPasswordResetConfigShape(makeEnv());
  assert.equal(shape.hasPasswordResetBaseUrl, false);
  assert.equal(shape.passwordResetBaseUrlHostname, null);
}

async function testFallbackSenderFromInvitationConfig() {
  const calls: any[] = [];
  const env = makeEnv({
    PASSWORD_RESET_BASE_URL: "https://www.opturon.com",
    RESEND_API_KEY: "resend-key",
    PORTAL_INVITATION_EMAIL_FROM: "noreply@opturon.com"
  });

  const result = await sendPasswordResetEmailViaResend(
    {
      email: "control@example.invalid",
      resetLink: buildPasswordResetLink(resolvePasswordResetBaseUrl(env), "token-1")
    },
    {
      env,
      fetchImpl: async (_url, init) => {
        calls.push(init);
        return new Response(JSON.stringify({ id: "email_123" }), { status: 200 });
      }
    }
  );

  assert.equal(result.status, 200);
  const payload = JSON.parse(String(calls[0].body));
  assert.equal(payload.from, "noreply@opturon.com");
}

async function testMissingSenderOrApiKeyFailsBeforeProviderCall() {
  const env = makeEnv({
    PASSWORD_RESET_BASE_URL: "https://www.opturon.com"
  });

  await assert.rejects(
    () =>
      sendPasswordResetEmailViaResend(
        {
          email: "control@example.invalid",
          resetLink: buildPasswordResetLink(resolvePasswordResetBaseUrl(env), "token-2")
        },
        { env }
      ),
    (error: unknown) =>
      error instanceof PasswordResetDeliveryError &&
      error.details.stage === "resend_config" &&
      error.details.errorType === "missing_config"
  );
}

async function testProviderFailuresAreClassified() {
  const env = makeEnv({
    PASSWORD_RESET_BASE_URL: "https://www.opturon.com",
    RESEND_API_KEY: "resend-key",
    PORTAL_INVITATION_EMAIL_FROM: "noreply@opturon.com"
  });

  const statuses = [
    { status: 400, type: "validation_error" },
    { status: 401, type: "unauthorized" },
    { status: 403, type: "domain_not_verified" },
    { status: 429, type: "rate_limit" }
  ];

  for (const item of statuses) {
    await assert.rejects(
      () =>
        sendPasswordResetEmailViaResend(
          {
            email: "control@example.invalid",
            resetLink: buildPasswordResetLink(resolvePasswordResetBaseUrl(env), "token-3")
          },
          {
            env,
            fetchImpl: async () =>
              new Response(JSON.stringify({ error: `provider_${item.status}`, request_id: `req_${item.status}` }), {
                status: item.status
              })
          }
        ),
      (error: unknown) =>
        error instanceof PasswordResetDeliveryError &&
        error.details.stage === "resend_response" &&
        error.details.errorType === item.type &&
        error.details.status === item.status
    );
  }
}

async function testTimeoutAndNetworkAreClassified() {
  const env = makeEnv({
    PASSWORD_RESET_BASE_URL: "https://www.opturon.com",
    RESEND_API_KEY: "resend-key",
    PORTAL_INVITATION_EMAIL_FROM: "noreply@opturon.com"
  });

  await assert.rejects(
    () =>
      sendPasswordResetEmailViaResend(
        {
          email: "control@example.invalid",
          resetLink: buildPasswordResetLink(resolvePasswordResetBaseUrl(env), "token-4")
        },
        {
          env,
          fetchImpl: async () => {
            throw new Error("request timeout");
          }
        }
      ),
    (error: unknown) =>
      error instanceof PasswordResetDeliveryError &&
      error.details.stage === "resend_request" &&
      error.details.errorType === "timeout"
  );
}

async function testSanitizedFailureLogDoesNotLeakSecrets() {
  const log = buildPasswordResetDeliveryFailureLog(
    new PasswordResetDeliveryError("password_reset_email_failed_400", {
      stage: "resend_response",
      errorType: "validation_error",
      status: 400,
      providerCode: "invalid_from",
      providerRequestId: "req_123",
      hostname: "www.opturon.com",
      config: {
        hasPasswordResetBaseUrl: true,
        hasResendApiKey: true,
        hasResetEmailFrom: false,
        hasPortalInvitationEmailFrom: true
      }
    })
  );

  const text = JSON.stringify(log);
  assert.equal(log.event, "portal_password_reset_delivery_failed");
  assert.doesNotMatch(text, /control@example\.invalid/i);
  assert.doesNotMatch(text, /token-/i);
  assert.doesNotMatch(text, /resend-key/i);
  assert.doesNotMatch(text, /noreply@opturon\.com/i);
}

async function run() {
  await testBaseUrlResolutionAndLinkBuilder();
  await testMissingBaseUrlShape();
  await testFallbackSenderFromInvitationConfig();
  await testMissingSenderOrApiKeyFailsBeforeProviderCall();
  await testProviderFailuresAreClassified();
  await testTimeoutAndNetworkAreClassified();
  await testSanitizedFailureLogDoesNotLeakSecrets();
  console.log("password-reset-delivery.test.ts: ok");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
