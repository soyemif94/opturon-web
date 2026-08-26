const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const ui = read('components/app/AdminClientConfiguration.tsx');
const invitationRoute = read('app/api/app/admin/clients/[tenantId]/invitations/[action]/route.ts');
const lifecycleRoute = read('app/api/app/admin/clients/[tenantId]/lifecycle/[action]/route.ts');
const appLayout = read('app/app/layout.tsx');

test('client management renders real lifecycle tabs and counts', () => {
  assert.match(ui, /data-lifecycle-tab=\{status\}/);
  assert.match(ui, /lifecycleCounts\[status\]/);
  assert.match(ui, /"active", "pending", "suspended"/);
});
test('pending surface renders invitation dates and resend count', () => {
  assert.match(ui, /data-pending-invitation-detail/);
  assert.match(ui, /Último envío/);
  assert.match(ui, /expiresAt/);
  assert.match(ui, /resendCount/);
});
test('pending actions include resend copy and cancel with double-click protection', () => {
  assert.match(ui, /runInvitationAction\("resend"\)/);
  assert.match(ui, /runInvitationAction\("copy"\)/);
  assert.match(ui, /runInvitationAction\("cancel"\)/);
  assert.match(ui, /disabled=\{Boolean\(clientActionBusy\)\}/);
});
test('copy link is handled only in authenticated server route and browser clipboard', () => {
  assert.match(invitationRoute, /requireOpturonAdminApi/);
  assert.match(invitationRoute, /buildPortalInvitationAcceptLink/);
  assert.match(ui, /navigator\.clipboard\.writeText\(acceptLink\)/);
  assert.doesNotMatch(ui, /invitation\.token/);
});
test('lifecycle confirmation requires a reason', () => {
  assert.match(ui, /Motivo obligatorio/);
  assert.match(ui, /!lifecycleReason\.trim\(\)/);
  assert.match(lifecycleRoute, /tenant_lifecycle_reason_required/);
});
test('active and suspended actions are explicit and separate from billing', () => {
  assert.match(ui, /Suspender cliente/);
  assert.match(ui, /Reactivar cliente/);
  assert.match(lifecycleRoute, /postAdminClientLifecycleAction/);
  assert.doesNotMatch(lifecycleRoute, /billing|Mercado/);
});
test('admin-only proxy forwards the resolved actor', () => {
  assert.match(invitationRoute, /resolveOpturonAdminActorId/);
  assert.match(invitationRoute, /\{ actorUserId \}/);
  assert.match(lifecycleRoute, /resolveOpturonAdminActorId/);
});
test('responsive contract avoids horizontal overflow and keeps compact grids', () => {
  assert.match(ui, /overflow-x-hidden/);
  assert.match(ui, /grid-cols-3/);
  assert.match(ui, /sm:grid-cols-2 lg:grid-cols-4/);
});
test('technical tenant identifiers are not rendered in client detail', () => {
  assert.doesNotMatch(ui, /Tenant identifier/);
  assert.doesNotMatch(ui, /title=\{selectedTenant\.tenantId\}/);
});
test('existing suspended sessions receive a coherent blocked screen while admin bypass remains server-side', () => {
  assert.match(appLayout, /status === 423/);
  assert.match(appLayout, /data-tenant-suspended-screen/);
  assert.match(appLayout, /Tu cuenta está temporalmente suspendida/);
  assert.match(appLayout, /!isOpturonAdminWorkspaceContext\(ctx\)/);
});
