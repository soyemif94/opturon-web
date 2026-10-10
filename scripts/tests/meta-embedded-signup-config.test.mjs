import assert from "node:assert/strict";
import { resolveMetaEmbeddedSignupConfig } from "../../lib/meta-embedded-signup-config.ts";

const previous = {
  appId: process.env.WHATSAPP_APP_ID,
  publicAppId: process.env.NEXT_PUBLIC_META_APP_ID,
  configId: process.env.META_EMBEDDED_SIGNUP_CONFIG_ID,
  publicConfigId: process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID,
  vercelEnv: process.env.VERCEL_ENV,
  nodeEnv: process.env.NODE_ENV
};

try {
  delete process.env.WHATSAPP_APP_ID;
  process.env.NEXT_PUBLIC_META_APP_ID = "3388083341350043";
  process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = "4545570962324592";
  process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID = "815496894916301";
  process.env.VERCEL_ENV = "production";

  const config = resolveMetaEmbeddedSignupConfig();
  assert.equal(config.ready, true);
  assert.equal(config.appId, "3388083341350043");
  assert.equal(config.configId, "4545570962324592", "the server-side canonical config wins over the public fallback");
  assert.equal(config.environment, "production");

  delete process.env.META_EMBEDDED_SIGNUP_CONFIG_ID;
  const fallback = resolveMetaEmbeddedSignupConfig();
  assert.equal(fallback.configId, "815496894916301");

  delete process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID;
  assert.equal(resolveMetaEmbeddedSignupConfig().ready, false);
  console.log("meta-embedded-signup-config.test.ts: ok");
} finally {
  for (const [key, value] of Object.entries({
    WHATSAPP_APP_ID: previous.appId,
    NEXT_PUBLIC_META_APP_ID: previous.publicAppId,
    META_EMBEDDED_SIGNUP_CONFIG_ID: previous.configId,
    NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID: previous.publicConfigId,
    VERCEL_ENV: previous.vercelEnv,
    NODE_ENV: previous.nodeEnv
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
