#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = join(projectRoot, "generated", "build-meta.json");

function safeGit(args) {
  try {
    return execFileSync("git", args, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

function resolveFallbackBranch(headSha) {
  const remoteMainSha = safeGit(["rev-parse", "origin/main"]);
  if (headSha && remoteMainSha && headSha === remoteMainSha) return "main";
  return safeGit(["rev-parse", "--abbrev-ref", "HEAD"]);
}

function readExistingBuildMeta() {
  try {
    return JSON.parse(readFileSync(outputPath, "utf8"));
  } catch {
    return {};
  }
}

const existing = readExistingBuildMeta();
const sha = String(process.env.VERCEL_GIT_COMMIT_SHA || safeGit(["rev-parse", "HEAD"]) || existing.sha || "").trim() || null;
const branch = String(process.env.VERCEL_GIT_COMMIT_REF || resolveFallbackBranch(sha || "") || existing.branch || "").trim() || null;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      sha,
      branch,
      generatedAt: new Date().toISOString()
    },
    null,
    2
  )}\n`
);

console.log(`[write-build-meta] sha=${sha || "unknown"} branch=${branch || "unknown"}`);
