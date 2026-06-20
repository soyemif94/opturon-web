import { readFileSync } from "node:fs";

function readBuildMeta() {
  try {
    const parsed = JSON.parse(readFileSync(new URL("./generated/build-meta.json", import.meta.url), "utf8"));
    return {
      sha: typeof parsed?.sha === "string" ? parsed.sha : "",
      branch: typeof parsed?.branch === "string" ? parsed.branch : ""
    };
  } catch {
    return { sha: "", branch: "" };
  }
}

const buildMeta = readBuildMeta();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_BUILD_SHA: buildMeta.sha,
    NEXT_PUBLIC_APP_BUILD_BRANCH: buildMeta.branch
  },
  async headers() {
    return [
      {
        source: "/api/auth/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" }
        ]
      }
    ];
  }
};

export default nextConfig;
