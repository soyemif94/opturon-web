const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('the production Admin subscription component separates pending abandonment from cancellation', () => {
  const source = read('components/app/AdminClientConfiguration.tsx');
  assert.match(source, /pendingCheckoutEligible/);
  assert.match(source, /Descartar checkout pendiente/);
  assert.match(source, /runSubscriptionAction\("abandon"\)/);
  assert.match(source, /No se aprobo ningun pago/);
  assert.match(source, /currentSubscription\.metadata\?\.checkoutAbandoned !== true/);
  assert.match(source, /Cancelar suscripcion/);
});

test('the pending Admin action is wired to the local abandonment proxy route', () => {
  const policy = read('lib/admin-client-policy.ts');
  const route = read('app/api/app/admin/billing/subscriptions/[subscriptionId]/abandon/route.ts');
  assert.match(policy, /action: "cancel" \| "pause" \| "reactivate" \| "abandon"/);
  assert.match(route, /postAdminBillingSubscriptionAction\(subscriptionId, "abandon"\)/);
  assert.doesNotMatch(route, /cancel/);
});
