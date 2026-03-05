#!/usr/bin/env node

const BASE_URL = String(process.env.VERIFY_BASE_URL || "https://www.opturon.com").replace(/\/+$/, "");
const DEBUG_KEY = String(process.env.VERIFY_DEBUG_KEY || "").trim();
const TIMEOUT_MS = Number(process.env.VERIFY_TIMEOUT_MS || 10000);
const RETRIES = Number(process.env.VERIFY_RETRIES || 2);
const EXPECTED_SHA = String(process.env.VERIFY_EXPECTED_SHA || process.env.GITHUB_SHA || "").trim();

const endpoints = [
  { path: "/api/__build", validateBuild: true },
  { path: "/api/app/health" },
  { path: "/api/bot/health" },
  { path: "/api/bot/inbox" }
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function check(path, validateBuild = false) {
  const url = `${BASE_URL}${path}`;
  const headers = new Headers({ Accept: "application/json" });
  if (DEBUG_KEY) headers.set("x-debug-key", DEBUG_KEY);

  let lastError = null;
  const maxAttempts = Math.max(1, RETRIES + 1);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, {
        method: "GET",
        headers,
        redirect: "follow",
        cache: "no-store"
      });

      const text = await response.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (response.status !== 200) {
        lastError = `HTTP ${response.status} body: ${text.slice(0, 400)}`;
      } else if (validateBuild) {
        if (!json || json.ok !== true) {
          lastError = `invalid __build payload: ${text.slice(0, 400)}`;
        } else if (EXPECTED_SHA && json.sha && String(json.sha).trim() !== EXPECTED_SHA) {
          lastError = `sha mismatch expected=${EXPECTED_SHA} got=${json.sha}`;
        } else {
          return { ok: true, status: response.status, path };
        }
      } else {
        return { ok: true, status: response.status, path };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    if (attempt < maxAttempts) {
      await sleep(300);
    }
  }

  return { ok: false, path, error: lastError || "unknown_error" };
}

async function main() {
  console.log(`verify:prod base=${BASE_URL}`);
  const results = [];
  for (const endpoint of endpoints) {
    // Keep it sequential for clearer logs and less burst traffic in prod.
    // eslint-disable-next-line no-await-in-loop
    const result = await check(endpoint.path, Boolean(endpoint.validateBuild));
    results.push(result);
  }

  let failed = false;
  for (const result of results) {
    if (result.ok) {
      console.log(`✅ ${result.path} ${result.status}`);
    } else {
      failed = true;
      console.error(`❌ ${result.path} ${result.error}`);
    }
  }

  if (failed) process.exit(1);
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ verify:prod fatal", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
