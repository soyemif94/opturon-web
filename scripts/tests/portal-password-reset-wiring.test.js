const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function testPasswordResetUsesBackendWhenConfigured() {
  const source = read('lib/password-reset.ts');
  assert.match(source, /requestPortalPasswordReset as requestBackendPortalPasswordReset/);
  assert.match(source, /invalidatePortalPasswordResetToken as invalidateBackendPortalPasswordResetToken/);
  assert.match(source, /validatePortalPasswordResetToken as validateBackendPortalPasswordResetToken/);
  assert.match(source, /resetPortalPassword as resetBackendPortalPassword/);
  assert.match(source, /if \(isBackendConfigured\(\)\) \{\s*const response = await requestBackendPortalPasswordReset\(normalized\);/s);
  assert.match(source, /if \(delivery\?\.token && delivery\?\.email\)/);
  assert.match(source, /await invalidateBackendResetDeliveryToken\(delivery\.token\)/);
  assert.match(source, /console\.error\("PASSWORD_RESET_EMAIL_DELIVERY_FAILED", \{ message \}\)/);
}

function testResetRouteIsAsyncAndBackendAware() {
  const route = read('app/api/auth/reset-password/route.ts');
  assert.match(route, /isPasswordResetTokenValidAsync/);
  assert.match(route, /valid: await isPasswordResetTokenValidAsync\(token\)/);
  assert.match(route, /await resetPasswordWithToken\(parsed\.data\.token, parsed\.data\.password\)/);
}

testPasswordResetUsesBackendWhenConfigured();
testResetRouteIsAsyncAndBackendAware();
console.log('portal-password-reset-wiring.test.js: ok');
