import assert from "node:assert/strict";
import { buildAdminEmbeddedSignupErrorMessage, buildAdminEmbeddedSignupViewModel } from "../../lib/admin-whatsapp-embedded-signup.ts";
import { beginMetaWhatsAppConnection, getMetaEmbeddedSignupErrorDetails } from "../../lib/meta-whatsapp-signup.ts";

async function testPopupClosedWithoutCallbackTriggersRecovery() {
  const originalFetch = global.fetch;
  const originalWindow = (globalThis as typeof globalThis & { window?: typeof window }).window;

  const fetchCalls: string[] = [];
  global.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    fetchCalls.push(url);

    if (url.includes("/bootstrap")) {
      return new Response(
        JSON.stringify({
          data: {
            tenantId: "tenant-a",
            clinicId: "clinic-1",
            state: "launching",
            provider: "meta_embedded_signup",
            ready: true,
            appId: "app-id",
            configId: "config-id",
            graphVersion: "v25.0",
            redirectUri: "https://opturon.test/callback",
            callbackPath: "/callback",
            stateToken: "state-1",
            sessionId: "session-1",
            message: "ok"
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.includes("/refresh")) {
      return new Response(
        JSON.stringify({
          data: {
            session: {
              errorCode: "popup_closed_without_callback",
              errorMessage: "El popup de Meta se cerro antes de completar la conexion."
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unexpected fetch ${url}`);
  }) as typeof fetch;

  const fakeWindow = {
    FB: {
      init: () => {},
      login: () => {}
    },
    location: { origin: "https://opturon.test" },
    setTimeout: (fn: () => void) => {
      fn();
      return 1;
    },
    clearTimeout: () => {},
    addEventListener: () => {},
    removeEventListener: () => {}
  } as unknown as typeof window;

  (globalThis as typeof globalThis & { window?: typeof window }).window = fakeWindow;

  try {
    await beginMetaWhatsAppConnection({
      bootstrapEndpoint: "https://opturon.test/bootstrap",
      recoverEndpoint: "https://opturon.test/refresh"
    });
    assert.fail("Expected beginMetaWhatsAppConnection to throw");
  } catch (error) {
    const details = getMetaEmbeddedSignupErrorDetails(error);
    assert.equal(details.code, "popup_closed_without_callback");
    assert.match(details.message, /popup de Meta/i);
    assert.ok(fetchCalls.some((url) => url.includes("/refresh")));
  } finally {
    global.fetch = originalFetch;
    (globalThis as typeof globalThis & { window?: typeof window }).window = originalWindow;
  }
}

function testAdminViewModelReenablesCtaAfterCancellation() {
  const cancelled = buildAdminEmbeddedSignupViewModel({
    embeddedSignupStatus: {
      tenantId: "tenant-a",
      clinicId: "clinic-1",
      session: { id: "s1", status: "cancelled" } as never,
      onboardingState: "idle",
      activeSession: false,
      canCancel: false,
      canStartNewAttempt: true
    },
    readinessReady: true,
    tenantId: "tenant-a",
    connecting: false,
    onboardingLoading: false
  });

  const processing = buildAdminEmbeddedSignupViewModel({
    embeddedSignupStatus: {
      tenantId: "tenant-a",
      clinicId: "clinic-1",
      session: { id: "s2", status: "discovering_assets" } as never,
      onboardingState: "pending_meta",
      activeSession: true,
      canCancel: false,
      canStartNewAttempt: false
    },
    readinessReady: true,
    tenantId: "tenant-a",
    connecting: false,
    onboardingLoading: false
  });

  assert.equal(cancelled.canConnect, true);
  assert.equal(cancelled.canCancelCurrent, false);
  assert.equal(processing.canConnect, false);
  assert.equal(processing.canCancelCurrent, false);
}

function testBspMessageIsSafeAndClear() {
  const message = buildAdminEmbeddedSignupErrorMessage({
    code: "meta_embedded_signup_not_available_for_bsp_or_tp",
    message: "token=secret-value"
  });

  assert.equal(
    message,
    "Meta rechazo la conexion porque Opturon todavia no esta habilitado como Tech Provider o BSP."
  );
  assert.ok(!message.includes("secret-value"));
}

async function run() {
  await testPopupClosedWithoutCallbackTriggersRecovery();
  testAdminViewModelReenablesCtaAfterCancellation();
  testBspMessageIsSafeAndClear();
  console.log("admin-whatsapp-embedded-signup.test.ts: ok");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
