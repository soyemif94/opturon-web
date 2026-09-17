import assert from "node:assert/strict";
import test from "node:test";
import { beginMetaWhatsAppConnection, getMetaEmbeddedSignupErrorDetails } from "../../lib/meta-whatsapp-signup.ts";

type LoginResponse = { status?: string; authResponse?: { code?: string | null } | null };
type MessageListener = (event: MessageEvent) => void;
const origin = "https://opturon.test";
const finishEvent = {
  type: "WA_EMBEDDED_SIGNUP",
  event: "FINISH",
  data: { waba_id: "waba-test", phone_number_id: "phone-test" }
};

async function withSignup(run: (harness: Awaited<ReturnType<typeof createSignup>>) => Promise<void>) {
  const harness = await createSignup();
  try {
    await run(harness);
  } finally {
    await harness.restore();
  }
}

async function createSignup() {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const originalClearTimeout = globalThis.clearTimeout;
  const listeners = new Set<MessageListener>();
  const timers = new Map<number, () => void>();
  const finalizations: Record<string, unknown>[] = [];
  const recoveries: Record<string, unknown>[] = [];
  const progress: string[] = [];
  let loginCallback: ((response: LoginResponse) => void) | undefined;
  let loginReady: () => void = () => {};
  let settled = false;
  let timerId = 0;
  let finalizeStatus = "connected";
  let throwOnLogin = false;
  const ready = new Promise<void>((resolve) => { loginReady = resolve; });
  const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json" }
  });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body || "{}")) as Record<string, unknown>;
    if (url === "/bootstrap") {
      return response({ data: {
        tenantId: "tenant-test", clinicId: "clinic-test", state: "launching", ready: true,
        provider: "meta_embedded_signup", appId: "app-test", configId: "config-test",
        graphVersion: "v25.0", redirectUri: `${origin}/callback`, callbackPath: "/callback",
        stateToken: "state-test", sessionId: "session-test", message: "ready"
      } });
    }
    if (url === "/finalize") {
      finalizations.push(body);
      if (body.error) return response({ error: "meta_flow_failed" }, 400);
      if (!body.code) return response({ error: "missing_meta_code" }, 400);
      return response({ data: { status: finalizeStatus, channel: { id: "channel-test", phoneNumberId: "phone-test" } } });
    }
    if (url === "/recover") {
      recoveries.push(body);
      return response({ data: { session: { status: "cancelled" } } });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;

  globalThis.clearTimeout = ((id: number) => { timers.delete(Number(id)); }) as typeof clearTimeout;
  globalThis.window = {
    location: { origin },
    FB: {
      init: () => {},
      login: (callback: (response: LoginResponse) => void) => {
        loginCallback = callback;
        loginReady();
        if (throwOnLogin) throw new Error("Test SDK launch failure");
      }
    },
    setTimeout: (callback: () => void) => { timers.set(++timerId, callback); return timerId; },
    addEventListener: (_type: string, listener: MessageListener) => { listeners.add(listener); },
    removeEventListener: (_type: string, listener: MessageListener) => { listeners.delete(listener); }
  } as unknown as Window & typeof globalThis;

  const launch = (recover = false) => {
    settled = false;
    return beginMetaWhatsAppConnection({
      bootstrapEndpoint: "/bootstrap", finalizeEndpoint: "/finalize",
      ...(recover ? { recoverEndpoint: "/recover" } : {}),
      onProgress: (stage) => { progress.push(stage); }
    }).then(
      (value) => { settled = true; return { value, error: null }; },
      (error: unknown) => { settled = true; return { value: null, error }; }
    );
  };
  let outcome = launch();
  await ready;
  const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
  const expire = () => {
    for (const [id, callback] of [...timers]) { timers.delete(id); callback(); }
  };
  return {
    finalizations, recoveries, progress, listeners, timers,
    isSettled: () => settled,
    login: (payload: LoginResponse = { authResponse: { code: "oauth-test-code" } }) => loginCallback!(payload),
    message: (data: unknown, source = "https://www.facebook.com") => {
      for (const listener of [...listeners]) listener({ origin: source, data } as MessageEvent);
    },
    flush, expire, outcome: () => outcome,
    pendingBackend: () => { finalizeStatus = "pending_meta"; },
    failNextLogin: () => { throwOnLogin = true; },
    retry: async (recover = false) => { outcome = launch(recover); await flush(); },
    restore: async () => {
      expire();
      await outcome;
      globalThis.window = originalWindow;
      globalThis.fetch = originalFetch;
      globalThis.clearTimeout = originalClearTimeout;
    }
  };
}

for (const order of ["FINISH before CODE", "CODE before FINISH"] as const) {
  test(`${order}: wait for both, finalize exactly once with assets, then report connected`, async () => {
    await withSignup(async (h) => {
      if (order === "FINISH before CODE") h.message(JSON.stringify(finishEvent));
      else h.login();
      await h.flush();
      assert.equal(h.isSettled(), false);
      assert.equal(h.finalizations.length, 0);
      assert.equal(h.listeners.size, 1);
      if (order === "FINISH before CODE") h.login();
      else h.message(finishEvent);
      await h.flush();
      assert.equal(h.finalizations.length, 1, "FINISH + SDK code must reach the backend callback without a redirect message");
      assert.equal(h.finalizations[0].code, "oauth-test-code");
      assert.equal(h.finalizations[0].stateToken, "state-test");
      assert.deepEqual(h.finalizations[0].metaPayload, finishEvent);
      assert.equal((await h.outcome()).value?.state, "connected");
      assert.equal(h.listeners.size, 0);
      assert.equal(h.timers.size, 0);
      h.message(finishEvent);
      h.login();
      h.message({ type: "OPTURON_META_EMBEDDED_SIGNUP_CALLBACK", stateToken: "state-test", code: "duplicate" }, origin);
      h.expire();
      await h.flush();
      assert.equal(h.finalizations.length, 1);
      assert.equal(h.recoveries.length, 0);
    });
  });
}

test("FINISH without CODE: timeout cleans up, never reports connected, late code cannot finalize", async () => {
  await withSignup(async (h) => {
    h.message(finishEvent);
    await h.flush();
    assert.equal(h.finalizations.length, 0);
    h.expire();
    const outcome = await h.outcome();
    assert.equal(outcome.value, null);
    assert.equal(getMetaEmbeddedSignupErrorDetails(outcome.error).kind, "timeout");
    assert.equal(h.finalizations.length, 1);
    assert.equal(h.finalizations[0].code, null);
    assert.ok(!h.progress.includes("completed"));
    assert.equal(h.listeners.size, 0);
    h.login();
    await h.flush();
    assert.equal(h.finalizations.length, 1);
  });
});

test("CODE without FINISH: preserve authorization at timeout for backend asset discovery", async () => {
  await withSignup(async (h) => {
    h.login();
    await h.flush();
    assert.equal(h.finalizations.length, 0);
    h.expire();
    await h.flush();
    assert.equal(h.finalizations.length, 1);
    assert.equal(h.finalizations[0].code, "oauth-test-code");
    assert.equal(h.finalizations[0].metaPayload, null);
    assert.equal((await h.outcome()).value?.state, "connected");
    assert.equal(h.recoveries.length, 0);
  });
});

test("CANCEL cleans up without code and allows a successful retry", async () => {
  await withSignup(async (h) => {
    h.message({ type: "WA_EMBEDDED_SIGNUP", event: "CANCEL", data: { current_step: "PHONE_NUMBER" } });
    assert.equal(getMetaEmbeddedSignupErrorDetails((await h.outcome()).error).kind, "cancelled");
    assert.equal(h.finalizations[0].code, null);
    assert.equal(h.listeners.size, 0);
    await h.retry();
    h.message(finishEvent);
    h.login();
    await h.flush();
    assert.equal(h.finalizations.length, 2);
    assert.equal((await h.outcome()).value?.state, "connected");
  });
});

test("terminal ERROR reaches backend failure handling and permits retry", async () => {
  await withSignup(async (h) => {
    h.message({ type: "WA_EMBEDDED_SIGNUP", event: "ERROR", data: { error_code: "test_meta_error", error_message: "Test error" } });
    assert.equal(getMetaEmbeddedSignupErrorDetails((await h.outcome()).error).code, "test_meta_error");
    assert.equal(h.finalizations[0].error, "test_meta_error");
    assert.ok(!h.progress.includes("completed"));
    assert.equal(h.listeners.size, 0);
    await h.retry();
    h.login();
    h.message(finishEvent);
    await h.flush();
    assert.equal(h.finalizations.length, 2);
    assert.equal((await h.outcome()).value?.state, "connected");
  });
});

test("SDK close without authorization remains cancellation; timeout retry uses recoverEndpoint", async () => {
  await withSignup(async (h) => {
    h.login({ status: "unknown", authResponse: null });
    assert.equal(getMetaEmbeddedSignupErrorDetails((await h.outcome()).error).kind, "cancelled");
    assert.equal(h.finalizations[0].code, null);
    await h.retry(true);
    h.expire();
    assert.equal(getMetaEmbeddedSignupErrorDetails((await h.outcome()).error).kind, "timeout");
    assert.deepEqual(h.recoveries, [{ reason: "popup_closed_without_callback", source: "meta_embedded_signup_frontend" }]);
    assert.equal(h.finalizations.length, 1);
    assert.equal(h.listeners.size, 0);
  });
});

test("existing redirect callback and state correlation still work", async () => {
  await withSignup(async (h) => {
    h.message({ type: "OPTURON_META_EMBEDDED_SIGNUP_CALLBACK", stateToken: "another-state", code: "wrong" }, origin);
    await h.flush();
    assert.equal(h.finalizations.length, 0);
    h.message({ type: "OPTURON_META_EMBEDDED_SIGNUP_CALLBACK", stateToken: "state-test", code: "redirect-code" }, origin);
    assert.equal((await h.outcome()).value?.state, "connected");
    assert.equal(h.finalizations[0].code, "redirect-code");
  });
});

test("redirect without code retains code already delivered by SDK", async () => {
  await withSignup(async (h) => {
    h.login();
    h.message({ type: "OPTURON_META_EMBEDDED_SIGNUP_CALLBACK", stateToken: "state-test" }, origin);
    assert.equal((await h.outcome()).value?.state, "connected");
    assert.equal(h.finalizations[0].code, "oauth-test-code");
  });
});

test("Meta success cannot upgrade a backend pending result to connected", async () => {
  await withSignup(async (h) => {
    h.pendingBackend();
    h.login();
    h.message(finishEvent);
    assert.equal((await h.outcome()).value?.state, "pending_meta");
    assert.equal(h.finalizations.length, 1);
  });
});

test("SDK launch failure removes the listener and timeout from the attempt", async () => {
  await withSignup(async (h) => {
    h.login({ status: "unknown" });
    await h.outcome();
    h.failNextLogin();
    await h.retry();
    assert.equal(getMetaEmbeddedSignupErrorDetails((await h.outcome()).error).code, "meta_embedded_signup_launch_failed");
    assert.equal(h.listeners.size, 0);
    assert.equal(h.timers.size, 0);
    h.expire();
    await h.flush();
    assert.equal(h.finalizations.length, 1);
  });
});
