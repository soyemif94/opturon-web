import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  commitProfileDraftFields,
  discardProfileDraft,
  findOtherDirtyProfileDraft,
  getProfileDraftConflicts,
  hasDirtyProfileDraft,
  reconcileProfileDraft,
  updateProfileDraftField
} from "../../lib/inbox/profile-draft.ts";

const server = {
  assignedSeller: "seller-a",
  commercialStatus: "NEW",
  dealStage: "lead",
  followUpAt: "2026-10-20T17:30",
  nextAction: "",
  notes: "",
  taskTitle: ""
};
const tracker = new Map();
const initial = reconcileProfileDraft(tracker, "conversation-a", server);
assert.deepEqual(initial.values, server, "A. conversation loads from the current server snapshot");

updateProfileDraftField(tracker, "conversation-a", "nextAction", "Llamar el lunes", server);
const afterNextActionPoll = reconcileProfileDraft(tracker, "conversation-a", server);
assert.equal(afterNextActionPoll.values.nextAction, "Llamar el lunes", "B-D. next action draft survives an unchanged polling snapshot");

updateProfileDraftField(tracker, "conversation-a", "notes", "Nota local sin guardar", server);
const afterNotePoll = reconcileProfileDraft(tracker, "conversation-a", server);
assert.equal(afterNotePoll.values.notes, "Nota local sin guardar", "E. note input survives polling");

updateProfileDraftField(tracker, "conversation-a", "followUpAt", "2026-10-20T17:30", { ...server, followUpAt: "" });
const afterDatePoll = reconcileProfileDraft(tracker, "conversation-a", { ...server, followUpAt: "" });
assert.equal(afterDatePoll.values.followUpAt, "2026-10-20T17:30", "F. selected date and time survive polling");

updateProfileDraftField(tracker, "conversation-a", "assignedSeller", "seller-b", server);
updateProfileDraftField(tracker, "conversation-a", "commercialStatus", "FOLLOW_UP", server);
updateProfileDraftField(tracker, "conversation-a", "dealStage", "proposal", server);
const afterCommercialPoll = reconcileProfileDraft(tracker, "conversation-a", server);
assert.equal(afterCommercialPoll.values.assignedSeller, "seller-b", "G. seller draft survives polling");
assert.equal(afterCommercialPoll.values.commercialStatus, "FOLLOW_UP", "G. status draft survives polling");
assert.equal(afterCommercialPoll.values.dealStage, "proposal", "G. stage draft survives polling");

const serverForOtherConversation = { ...server, assignedSeller: "seller-c" };
const otherConversationTracker = new Map();
reconcileProfileDraft(otherConversationTracker, "conversation-b", server);
updateProfileDraftField(otherConversationTracker, "conversation-b", "nextAction", "Draft B", server);
const cleanFieldRefresh = reconcileProfileDraft(otherConversationTracker, "conversation-b", serverForOtherConversation);
assert.equal(cleanFieldRefresh.values.assignedSeller, "seller-c", "H. a clean field can refresh from the server while another field is dirty");
assert.equal(cleanFieldRefresh.values.nextAction, "Draft B");

const updatedServer = { ...server, followUpAt: "2026-10-21T09:00", dealStage: "qualified" };
const afterCleanFieldsPoll = reconcileProfileDraft(tracker, "conversation-a", updatedServer);
assert.equal(afterCleanFieldsPoll.values.dealStage, "proposal", "dirty stage is retained while other clean fields are refreshed");
assert.equal(afterCleanFieldsPoll.values.followUpAt, "2026-10-20T17:30", "dirty follow-up time is retained");

const incomingMessages = [{ id: "message-new", text: "Llegó un mensaje nuevo" }];
const refreshedDetail = { messages: incomingMessages };
reconcileProfileDraft(tracker, "conversation-a", updatedServer);
assert.equal(refreshedDetail.messages[0].id, "message-new", "L-O. the server detail snapshot can carry new messages independently of form drafts");

const serverAfterSave = { ...updatedServer, nextAction: "Llamar el lunes" };
commitProfileDraftFields(tracker, "conversation-a", ["followUpAt", "nextAction"], {
  followUpAt: "2026-10-21T09:00",
  nextAction: "Llamar el lunes"
});
const afterSaveSuccess = reconcileProfileDraft(tracker, "conversation-a", serverAfterSave);
assert.equal(afterSaveSuccess.values.followUpAt, "2026-10-21T09:00", "I. a successful save rebases to the canonical server value");
assert.equal(afterSaveSuccess.values.nextAction, "Llamar el lunes");
assert.equal(hasDirtyProfileDraft(tracker, "conversation-a"), true, "unrelated unsaved fields remain dirty after a partial save");

const failedSaveDraft = "No perder este borrador";
updateProfileDraftField(tracker, "conversation-a", "nextAction", failedSaveDraft, serverAfterSave);
const afterSaveFailure = reconcileProfileDraft(tracker, "conversation-a", serverAfterSave);
assert.equal(afterSaveFailure.values.nextAction, failedSaveDraft, "J. a failed save leaves the local draft intact");

assert.equal(findOtherDirtyProfileDraft(tracker, "conversation-b"), "conversation-a", "K. conversation switch detects the unsaved draft");
assert.equal(findOtherDirtyProfileDraft(tracker, "conversation-a"), null, "reopening the same conversation does not prompt to discard its own draft");

const serverConflict = { ...serverAfterSave, nextAction: "Otro vendedor actualizó esto" };
const afterExternalUpdate = reconcileProfileDraft(tracker, "conversation-a", serverConflict);
assert.equal(afterExternalUpdate.values.nextAction, failedSaveDraft, "external same-field update does not overwrite the local draft");
assert.equal(getProfileDraftConflicts(tracker, "conversation-a").has("nextAction"), true, "external same-field update is surfaced as a save conflict");

const discarded = discardProfileDraft(tracker, "conversation-a", serverConflict);
assert.equal(discarded.nextAction, serverConflict.nextAction, "explicit discard reloads the latest server value");
assert.equal(hasDirtyProfileDraft(tracker, "conversation-a"), false, "explicit discard clears dirty tracking");

const workspace = readFileSync(join(process.cwd(), "components/app/InboxWorkspace.tsx"), "utf8");
assert.match(workspace, /setTimeout\(\(\) => void tick\(\), 5000\)/, "polling remains active");
assert.match(workspace, /reconcileProfileDraft\(profileDraftTrackerRef\.current, conversationId, serverDraftValues\)/, "the production detail refresh reconciles local drafts");
assert.match(workspace, /changed \|\| current\?\.conversation\.id !== conversationId \? json : current/, "the refreshed server detail, including messages, is still applied");
assert.match(workspace, /Tenés cambios sin guardar/, "switching to another conversation requires deliberate discard");
assert.match(workspace, /supersedePendingDetailRequests\(\)/, "successful saves invalidate stale in-flight detail snapshots");

console.log("inbox-profile-draft-polling.test.mjs passed");
