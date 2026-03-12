import { join } from "node:path";

function normalizePath(value?: string) {
  const normalized = String(value || "").trim();
  return normalized ? normalized : null;
}

export function hasExplicitRuntimeDataDir() {
  return Boolean(normalizePath(process.env.OPTURON_RUNTIME_DATA_DIR) || normalizePath(process.env.OPTURON_DATA_DIR));
}

export function resolveRuntimeDataDir() {
  return (
    normalizePath(process.env.OPTURON_RUNTIME_DATA_DIR) ||
    normalizePath(process.env.OPTURON_DATA_DIR) ||
    join(process.cwd(), "data")
  );
}

export function resolveSaasDataFile() {
  return join(resolveRuntimeDataDir(), "saas.json");
}

export function resolveAuthRuntimeFile() {
  return join(resolveRuntimeDataDir(), "auth-runtime.json");
}
