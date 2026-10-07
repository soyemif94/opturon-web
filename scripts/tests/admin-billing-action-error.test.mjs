import assert from "node:assert/strict";
import test from "node:test";
import { formatAdminBillingActionError } from "../../lib/admin-billing-action-error.ts";

test("surfaces the HTTP status and safe backend error code", () => {
  assert.equal(
    formatAdminBillingActionError(409, { error: "subscription_cancellation_state_unsupported" }),
    "No se pudo completar la acción de suscripción (HTTP 409: subscription_cancellation_state_unsupported)."
  );
});

test("does not expose arbitrary provider or server details", () => {
  assert.equal(
    formatAdminBillingActionError(502, { error: "billing_subscription_action_failed", details: "secret-token-value" }),
    "No se pudo completar la acción de suscripción (HTTP 502: billing_subscription_action_failed)."
  );
  assert.equal(
    formatAdminBillingActionError(503, { error: "provider failed with bearer abc" }),
    "No se pudo completar la acción de suscripción (HTTP 503)."
  );
});
