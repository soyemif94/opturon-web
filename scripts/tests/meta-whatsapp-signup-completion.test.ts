import assert from "node:assert/strict";
import test from "node:test";
import {
  beginMetaWhatsAppConnection,
  getMetaEmbeddedSignupErrorDetails,
  getMetaEmbeddedSignupUserMessage,
  prepareMetaWhatsAppConnection,
  type WhatsAppConnectionMode
} from "../../lib/meta-whatsapp-signup.ts";

type LoginResponse = { status?: string; authResponse?: { code?: string | null } | null };
type LoginOptions = Record<string, unknown> & { extras?: Record<string, unknown> };
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
  const bootstraps: Record<string, unknown>[] = [];
  let loginCallback: ((response: LoginResponse) => void) | undefined;
  let loginOptions: LoginOptions | undefined;
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
      if (init?.method === "GET") {
        return response({ data: { embeddedSignup: {
          ready: true, appId: "app-test", configId: "config-test", missingConfig: [],
          environment: "production", backendReachable: true,
          graphVersion: "v25.0", redirectUri: `${origin}/callback`, callbackPath: "/callback"
        }, coexistencePilotEnabled: true } });
      }
      bootstraps.push(body);
      return response({ data: {
        tenantId: "tenant-test", clinicId: "clinic-test", state: "launching", ready: true,
        provider: "meta_embedded_signup", appId: "app-test", configId: "config-test",
        graphVersion: "v25.0", redirectUri: `${origin}/callback`, callbackPath: "/callback",
        stateToken: body.stateToken, requestedConnectionMode: body.requestedConnectionMode,
        sessionId: "session-test", message: "ready"
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
    crypto: globalThis.crypto,
    FB: {
      init: () => {},
      login: (callback: (response: LoginResponse) => void, options?: LoginOptions) => {
        loginCallback = callback;
        loginOptions = options;
        loginReady();
        if (throwOnLogin) throw new Error("Test SDK launch failure");
      }
    },
    setTimeout: (callback: () => void) => { timers.set(++timerId, callback); return timerId; },
    addEventListener: (_type: string, listener: MessageListener) => { listeners.add(listener); },
    removeEventListener: (_type: string, listener: MessageListener) => { listeners.delete(listener); }
  } as unknown as Window & typeof globalThis;

  await prepareMetaWhatsAppConnection("/bootstrap");

  const launch = (recover = false, requestedConnectionMode: WhatsAppConnectionMode = "API_ONLY") => {
    settled = false;
    return beginMetaWhatsAppConnection({
      bootstrapEndpoint: "/bootstrap", finalizeEndpoint: "/finalize",
      requestedConnectionMode,
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
    finalizations, recoveries, bootstraps, progress, listeners, timers,
    isSettled: () => settled,
    loginOptions: () => loginOptions,
    stateToken: () => String(bootstraps.at(-1)?.stateToken || ""),
    login: (payload: LoginResponse = { authResponse: { code: "oauth-test-code" } }) => loginCallback!(payload),
    message: (data: unknown, source = "https://www.facebook.com") => {
      for (const listener of [...listeners]) listener({ origin: source, data } as MessageEvent);
    },
    flush, expire, outcome: () => outcome,
    pendingBackend: () => { finalizeStatus = "pending_meta"; },
    failNextLogin: () => { throwOnLogin = true; },
    retry: async (recover = false, requestedConnectionMode: WhatsAppConnectionMode = "API_ONLY") => {
      outcome = launch(recover, requestedConnectionMode); await flush();
    },
    restore: async () => {
      expire();
      await outcome;
      globalThis.window = originalWindow;
      globalThis.fetch = originalFetch;
      globalThis.clearTimeout = originalClearTimeout;
    }
  };
}

test("standard launcher selects Embedded Signup v4 without enabling coexistence", async () => {
  await withSignup(async (h) => {
    const options = h.loginOptions();
    const extras = options?.extras;
    assert.equal(options?.config_id, "config-test", "launcher uses the preflight's canonical config ID");
    assert.equal(extras?.version, "v4");
    assert.equal(extras?.featureType, undefined);
    assert.equal(h.bootstraps[0].requestedConnectionMode, "API_ONLY");
    h.login();
    h.message(finishEvent);
    assert.equal((await h.outcome()).value?.state, "connected");
  });
});

test("preflight blocks missing config, callback mismatch, non-production and disabled coexistence before Meta opens", async () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];
  let loginCalls = 0;
  const preflight = (overrides: Record<string, unknown> = {}, status = 200) => new Response(JSON.stringify({
    data: {
      coexistencePilotEnabled: true,
      embeddedSignup: {
        ready: true,
        appId: "app-test",
        configId: "config-test",
        missingConfig: [],
        environment: "production",
        backendReachable: true,
        graphVersion: "v25.0",
        redirectUri: `${origin}/callback`,
        callbackPath: "/callback",
        ...overrides
      }
    }
  }), { status, headers: { "Content-Type": "application/json" } });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    urls.push(`${init?.method || "GET"} ${url}`);
    if (init?.method !== "GET") throw new Error("Preflight must reject before bootstrap POST");
    if (url === "/preflight-missing") {
      return preflight({ ready: false, configId: null, missingConfig: ["META_EMBEDDED_SIGNUP_CONFIG_ID"] });
    }
    if (url === "/preflight-callback") return preflight({ redirectUri: "https://other.example/callback" });
    if (url === "/preflight-environment") return preflight({ environment: "preview" });
    if (url === "/preflight-coexistence") {
      const response = preflight();
      const body = await response.json() as { data: { coexistencePilotEnabled: boolean } };
      body.data.coexistencePilotEnabled = false;
      return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    throw new Error(`Unexpected preflight endpoint: ${url}`);
  }) as typeof fetch;

  globalThis.window = {
    location: { origin },
    crypto: globalThis.crypto,
    FB: {
      init: () => {},
      login: () => { loginCalls += 1; }
    },
    setTimeout: () => 1,
    addEventListener: () => {},
    removeEventListener: () => {}
  } as unknown as Window & typeof globalThis;

  try {
    await assert.rejects(
      () => prepareMetaWhatsAppConnection("/preflight-missing"),
      (error: unknown) => getMetaEmbeddedSignupErrorDetails(error).code === "embedded_signup_not_ready"
    );
    await assert.rejects(
      () => prepareMetaWhatsAppConnection("/preflight-callback"),
      (error: unknown) => getMetaEmbeddedSignupErrorDetails(error).code === "embedded_signup_callback_mismatch"
    );
    await assert.rejects(
      () => prepareMetaWhatsAppConnection("/preflight-environment"),
      (error: unknown) => getMetaEmbeddedSignupErrorDetails(error).code === "embedded_signup_non_production_environment"
    );
    await prepareMetaWhatsAppConnection("/preflight-coexistence");
    await assert.rejects(
      () => beginMetaWhatsAppConnection({ bootstrapEndpoint: "/preflight-coexistence", requestedConnectionMode: "COEXISTENCE" }),
      (error: unknown) => getMetaEmbeddedSignupErrorDetails(error).code === "whatsapp_coexistence_preflight_not_ready"
    );
    assert.deepEqual(urls, [
      "GET /preflight-missing",
      "GET /preflight-callback",
      "GET /preflight-environment",
      "GET /preflight-coexistence"
    ]);
    assert.equal(loginCalls, 0, "a failed preflight never opens the Meta popup");
    assert.equal(
      getMetaEmbeddedSignupUserMessage(new Error("META_EMBEDDED_SIGNUP_CONFIG_ID missing token=secret")),
      "No pudimos iniciar la conexión con WhatsApp. Revisá la configuración de integración."
    );
  } finally {
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  }
});

test("coexistence launcher uses the V4 Business App contract and its completion event", async () => {
  await withSignup(async (h) => {
    h.login();
    h.message(finishEvent);
    await h.outcome();
    await h.retry(false, "COEXISTENCE");
    const extras = h.loginOptions()?.extras;
    assert.equal(extras?.version, "v4");
    assert.equal(extras?.sessionInfoVersion, 3);
    assert.equal(extras?.featureType, "whatsapp_business_app_onboarding");
    assert.equal(h.bootstraps.at(-1)?.requestedConnectionMode, "COEXISTENCE");
    h.login();
    h.message(finishEvent);
    await h.flush();
    assert.equal(h.isSettled(), false, "standard FINISH cannot complete a coexistence session");
    h.message({
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
      data: { waba_id: "waba-test" }
    });
    assert.equal((await h.outcome()).value?.state, "connected");
  });
});

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
      assert.equal(h.finalizations[0].stateToken, h.stateToken());
      assert.deepEqual(h.finalizations[0].metaPayload, finishEvent);
      assert.equal((await h.outcome()).value?.state, "connected");
      assert.equal(h.listeners.size, 0);
      assert.equal(h.timers.size, 0);
      h.message(finishEvent);
      h.login();
      h.message({ type: "OPTURON_META_EMBEDDED_SIGNUP_CALLBACK", stateToken: h.stateToken(), code: "duplicate" }, origin);
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
    h.message({ type: "OPTURON_META_EMBEDDED_SIGNUP_CALLBACK", stateToken: h.stateToken(), code: "redirect-code" }, origin);
    assert.equal((await h.outcome()).value?.state, "connected");
    assert.equal(h.finalizations[0].code, "redirect-code");
  });
});

test("redirect without code retains code already delivered by SDK", async () => {
  await withSignup(async (h) => {
    h.login();
    h.message({ type: "OPTURON_META_EMBEDDED_SIGNUP_CALLBACK", stateToken: h.stateToken() }, origin);
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
    assert.equal(h.finalizations.length, 2);
  });
});
