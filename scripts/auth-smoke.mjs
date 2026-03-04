#!/usr/bin/env node

if (!process.env.AUTH_EMAIL || !process.env.AUTH_PASSWORD) {
  console.error("AUTH_EMAIL and AUTH_PASSWORD required");
  process.exit(1);
}

const baseUrl = String(process.env.AUTH_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const authEmail = String(process.env.AUTH_EMAIL || "").trim().toLowerCase();
const authPassword = String(process.env.AUTH_PASSWORD || "");

function fail(message, extra) {
  console.error("AUTH SMOKE FAIL", message, extra || "");
  process.exit(1);
}

if (!authEmail || !authPassword) {
  fail("Missing AUTH_EMAIL or AUTH_PASSWORD env.");
}

function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

function splitSetCookieHeader(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value).split(/,(?=\s*[^;,=\s]+=[^;,]+)/g);
}

function getSetCookieValues(headers) {
  if (typeof headers.getSetCookie === "function") {
    const values = headers.getSetCookie();
    if (Array.isArray(values) && values.length > 0) return values;
  }

  if (typeof headers.raw === "function") {
    const raw = headers.raw();
    if (raw && Array.isArray(raw["set-cookie"])) return raw["set-cookie"];
  }

  const single = headers.get("set-cookie");
  if (!single) return [];
  return splitSetCookieHeader(single);
}

function mergeCookies(prevCookieHeader, setCookieHeader) {
  const jar = new Map();

  if (prevCookieHeader) {
    for (const chunk of prevCookieHeader.split(";")) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      jar.set(trimmed.slice(0, idx), trimmed.slice(idx + 1));
    }
  }

  const setCookies = splitSetCookieHeader(setCookieHeader);
  for (const setCookie of setCookies) {
    const firstPart = String(setCookie).split(";")[0]?.trim();
    if (!firstPart) continue;
    const idx = firstPart.indexOf("=");
    if (idx <= 0) continue;
    jar.set(firstPart.slice(0, idx), firstPart.slice(idx + 1));
  }

  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function parseJsonSafe(response) {
  const text = await response.text();
  try {
    return { json: JSON.parse(text), text };
  } catch {
    return { json: null, text };
  }
}

async function run() {
  let cookieHeader = "";

  const csrfRes = await fetchWithTimeout(`${baseUrl}/api/auth/csrf`, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  const csrfPayload = await parseJsonSafe(csrfRes);
  if (!csrfRes.ok || !csrfPayload.json?.csrfToken) {
    console.error("AUTH SMOKE FAIL", { status: csrfRes.status, body: csrfPayload.text });
    process.exit(1);
  }
  cookieHeader = mergeCookies(cookieHeader, getSetCookieValues(csrfRes.headers));
  const csrfToken = csrfPayload.json.csrfToken;

  const body = new URLSearchParams({
    csrfToken,
    email: authEmail,
    password: authPassword,
    callbackUrl: "/bot/inbox",
    json: "true"
  });

  const callbackRes = await fetchWithTimeout(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader
    },
    body: body.toString()
  });

  cookieHeader = mergeCookies(cookieHeader, getSetCookieValues(callbackRes.headers));
  if (callbackRes.status >= 400) {
    const callbackPayload = await parseJsonSafe(callbackRes);
    console.error("AUTH SMOKE FAIL", { status: callbackRes.status, body: callbackPayload.text });
    process.exit(1);
  } else {
    // Consume body when available to avoid undici warnings in some runtimes.
    await callbackRes.text().catch(() => undefined);
  }

  const sessionRes = await fetchWithTimeout(`${baseUrl}/api/auth/session`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Cookie: cookieHeader
    }
  });
  const sessionPayload = await parseJsonSafe(sessionRes);

  const user = sessionPayload.json?.user;
  if (!sessionRes.ok || !user || String(user.email || "").toLowerCase() !== authEmail || !user.id) {
    if (sessionRes.status === 500) {
      console.error("NextAuth is failing on server. Check Vercel logs.");
      console.error("Verify NEXTAUTH_URL and NEXTAUTH_SECRET are correctly configured.");
    }
    console.error("AUTH SMOKE FAIL", { status: sessionRes.status, body: sessionPayload.text });
    process.exit(1);
  }

  console.log("AUTH SMOKE OK", user.email);
}

run().catch((error) => {
  fail("Unexpected error", { message: error?.message || String(error) });
});
