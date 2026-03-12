import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(req: Request) {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? null;
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID ?? null;
  const buildMarker = process.env.NEXT_PUBLIC_APP_BUILD_MARKER ?? (sha ? sha.slice(0, 7) : deploymentId || "local-dev");
  const environment =
    process.env.VERCEL_ENV ||
    (process.env.NODE_ENV === "production" ? "production" : process.env.NODE_ENV || "development");
  const projectName = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_PROJECT_ID ?? null;
  const branch = process.env.VERCEL_GIT_COMMIT_REF ?? null;
  const hostname = req.headers.get("host") ?? process.env.VERCEL_URL ?? null;

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
