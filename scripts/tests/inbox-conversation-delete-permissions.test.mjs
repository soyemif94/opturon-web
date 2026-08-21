import assert from "node:assert/strict";
import { canDeleteInboxConversation } from "../../lib/app-permissions.ts";

const cases = [
  [{ tenantRole: "owner", accountScope: "client" }, true, "tenant owner"],
  [{ tenantRole: "manager", accountScope: "client" }, true, "tenant manager"],
  [{ tenantRole: "seller", accountScope: "client" }, false, "tenant seller"],
  [{ tenantRole: "viewer", accountScope: "client" }, false, "tenant viewer/read-only"],
  [{ globalRole: "superadmin", accountScope: "opturon_admin", portalActorId: "actor-1" }, true, "Opturon superadmin"],
  [{ globalRole: "ops_admin", accountScope: "opturon_admin", portalActorId: "actor-1" }, true, "Opturon ops admin"],
  [{ globalRole: "sales_rep", accountScope: "opturon_admin", portalActorId: "actor-1" }, false, "Opturon sales rep"],
  [{ globalRole: "support_agent", accountScope: "opturon_admin", portalActorId: "actor-1" }, false, "Opturon support agent"],
  [{ globalRole: "superadmin", accountScope: "opturon_admin" }, false, "admin without canonical portal actor"],
  [{ globalRole: "superadmin", accountScope: "client", portalActorId: "actor-1" }, false, "staff outside admin scope"]
];

for (const [context, expected, label] of cases) {
  assert.equal(canDeleteInboxConversation(context), expected, label);
}

console.log("inbox-conversation-delete-permissions.test.mjs passed");
