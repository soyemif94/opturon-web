import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

async function readBuildMeta() {
  try {
    const file = await readFile(join(process.cwd(), "generated", "build-meta.json"), "utf8");
    const parsed = JSON.parse(file);
    return {
      sha: typeof parsed?.sha === "string" ? parsed.sha : null,
      branch: typeof parsed?.branch === "string" ? parsed.branch : null
    };
  } catch {
    return { sha: null, branch: null };
  }
}

export async function GET(req: Request) {
  const buildMeta = await readBuildMeta();
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? buildMeta.sha ?? null;
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID ?? null;
  const buildMarker = process.env.NEXT_PUBLIC_APP_BUILD_MARKER ?? (sha ? sha.slice(0, 7) : deploymentId || "local-dev");
  const environment =
    process.env.VERCEL_ENV ||
    (process.env.NODE_ENV === "production" ? "production" : process.env.NODE_ENV || "development");
  const projectName = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_PROJECT_ID ?? null;
  const branch = process.env.VERCEL_GIT_COMMIT_REF ?? buildMeta.branch ?? null;
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
