import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "lib/ops/report-download.ts"), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source, { mode: "transform" })).toString("base64")}`;
const {
  OPS_REPORT_TYPES,
  OPS_REPORT_EXPORT_TIMEOUT_MS,
  enqueueOpsReportDownload,
  getOpsReportQueueSnapshot
} = await import(moduleUrl);

const sleep = (ms = 1) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(predicate, description) {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for ${description}`);
    await sleep(2);
  }
}

assert.equal(OPS_REPORT_EXPORT_TIMEOUT_MS, 240_000);
assert.equal(OPS_REPORT_TYPES.length, 6);

const active = { count: 0, max: 0 };
const events = [];
for (const report of OPS_REPORT_TYPES) {
  const accepted = enqueueOpsReportDownload(report, "xlsx", async () => {
    active.count += 1;
    active.max = Math.max(active.max, active.count);
    events.push(`start:${report}`);
    await sleep(3);
    events.push(`end:${report}`);
    active.count -= 1;
  });
  assert.equal(accepted, true);
}
assert.equal(
  enqueueOpsReportDownload("sales", "xlsx", async () => {}),
  false,
  "double-clicks cannot add a duplicate while the same export is queued or active"
);
await waitFor(() => OPS_REPORT_TYPES.every((report) => getOpsReportQueueSnapshot(report, "xlsx").state === "idle"), "six queued exports to finish");
assert.equal(active.max, 1, "the queue runs no more than one export request at a time");
assert.deepEqual(events, OPS_REPORT_TYPES.flatMap((report) => [`start:${report}`, `end:${report}`]));

const recoveryEvents = [];
let failedAttemptCount = 0;
enqueueOpsReportDownload("sales", "csv", async () => {
  recoveryEvents.push("sales:start");
  await sleep();
  recoveryEvents.push("sales:done");
});
enqueueOpsReportDownload("sellers", "csv", async () => {
  failedAttemptCount += 1;
  recoveryEvents.push("sellers:start");
  await sleep();
  if (failedAttemptCount === 1) throw Object.assign(new Error("fixture failure"), { safeErrorCode: "http_error" });
  recoveryEvents.push("sellers:done");
});
enqueueOpsReportDownload("followups", "csv", async () => {
  recoveryEvents.push("followups:start");
  await sleep();
  recoveryEvents.push("followups:done");
});
await waitFor(
  () => ["sales", "sellers", "followups"].every((report) => {
    const state = getOpsReportQueueSnapshot(report, "csv").state;
    return state === "idle" || state === "error";
  }) && getOpsReportQueueSnapshot("followups", "csv").state === "idle",
  "queue to continue after intermediate failure"
);
assert.deepEqual(recoveryEvents, ["sales:start", "sales:done", "sellers:start", "followups:start", "followups:done"]);
assert.equal(getOpsReportQueueSnapshot("sales", "csv").state, "idle");
assert.equal(getOpsReportQueueSnapshot("sellers", "csv").state, "error");
assert.equal(getOpsReportQueueSnapshot("sellers", "csv").safeErrorCode, "http_error");
assert.equal(getOpsReportQueueSnapshot("followups", "csv").state, "idle", "later items continue after one export fails");

enqueueOpsReportDownload("sellers", "csv", async () => {
  failedAttemptCount += 1;
  recoveryEvents.push("sellers:retry-start");
  await sleep();
  recoveryEvents.push("sellers:retry-done");
});
await waitFor(() => getOpsReportQueueSnapshot("sellers", "csv").state === "idle", "a fresh retry request");
assert.equal(failedAttemptCount, 2, "retry invokes a fresh request executor rather than reusing a rejected promise");
assert.equal(recoveryEvents.at(-1), "sellers:retry-done");

console.log("ops-report-queue.test.mjs passed: six ordered exports, max one active, failure continuation, duplicate suppression and fresh retry");
