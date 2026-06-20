import { NextResponse } from "next/server";
import buildMeta from "@/generated/build-meta.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function resolveValue(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return null;
}

export async function GET(req: Request) {
  const sha = resolveValue(process.env.APP_GIT_SHA, process.env.VERCEL_GIT_COMMIT_SHA, buildMeta.sha);
  const branch = resolveValue(process.env.APP_GIT_BRANCH, process.env.VERCEL_GIT_COMMIT_REF, buildMeta.branch);
  const deploymentId = resolveValue(process.env.VERCEL_DEPLOYMENT_ID);
  const buildMarker = process.env.NEXT_PUBLIC_APP_BUILD_MARKER ?? (sha ? sha.slice(0, 7) : deploymentId || "local-dev");
  const environment =
    process.env.VERCEL_ENV ||
    (process.env.NODE_ENV === "production" ? "production" : process.env.NODE_ENV || "development");
  const projectName = resolveValue(process.env.APP_VERCEL_PROJECT, process.env.VERCEL_PROJECT_ID, process.env.VERCEL_PROJECT_PRODUCTION_URL);
  const hostname = resolveValue(req.headers.get("host"), process.env.VERCEL_URL);

  return noStore(
    NextResponse.json({
      ok: true,
      sha,
      deploymentId,
      buildMarker,
      environment,
      branch,
      projectName,
      hostname,
      runtime: "nodejs",
      ts: new Date().toISOString()
    })
  );
}
