const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const component = fs.readFileSync(
  path.join(__dirname, '../../components/app/AdminClientConfiguration.tsx'),
  'utf8'
);
const policy = fs.readFileSync(path.join(__dirname, '../../lib/admin-client-policy.ts'), 'utf8');

test('billing subscription contract exposes reconciled action capabilities', () => {
  assert.match(policy, /availableActions\?: Array<"cancel" \| "pause" \| "reactivate">/);
  assert.match(policy, /statusMessage\?: string \| null/);
});

test('pause is disabled unless the backend action matrix allows it', () => {
  assert.match(component, /disabled=\{!billingActions\.has\("pause"\)/);
});

test('reactivate is disabled unless the backend action matrix allows it', () => {
  assert.match(component, /disabled=\{!billingActions\.has\("reactivate"\)/);
});

test('cancel is disabled for terminal and unavailable states', () => {
  assert.match(component, /disabled=\{!billingActions\.has\("cancel"\)/);
});

test('authorization link controls are unavailable after pending is closed', () => {
  assert.match(component, /billingLinkAvailable = currentSubscription\?\.localStatus === "pending"/);
  assert.match(component, /disabled=\{!billingLinkAvailable\}/);
});

test('customer-facing reconciliation message is rendered', () => {
  assert.match(component, /currentSubscription\.statusMessage/);
  assert.match(component, /\{currentSubscription\.statusMessage\}/);
});

test('technical Mercado Pago errors are not selected for the toast', () => {
  const actionBody = component.slice(
    component.indexOf('async function runSubscriptionAction'),
    component.indexOf('async function copyAuthorizationLink')
  );
  assert.match(actionBody, /json\?\.message/);
  assert.doesNotMatch(actionBody, /json\?\.detail/);
});

test('the UI performs no destructive delete for reconciliation', () => {
  const actionBody = component.slice(
    component.indexOf('async function runSubscriptionAction'),
    component.indexOf('async function copyAuthorizationLink')
  );
  assert.doesNotMatch(actionBody, /method:\s*"DELETE"/);
});
