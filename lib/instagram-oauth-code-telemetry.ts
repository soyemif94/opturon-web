import { createHash } from "node:crypto";

export function fingerprintInstagramOAuthCode(value: unknown) {
  const safeValue = String(value || "");
  return {
    length: Buffer.byteLength(safeValue, "utf8"),
    sha256: createHash("sha256").update(safeValue, "utf8").digest("hex")
  };
}

export function extractRawInstagramOAuthCode(search: string) {
  const pair = String(search || "")
    .replace(/^\?/, "")
    .split("&")
    .find((entry) => entry === "code" || entry.startsWith("code="));
  return pair ? pair.slice("code".length).replace(/^=/, "") : "";
}
