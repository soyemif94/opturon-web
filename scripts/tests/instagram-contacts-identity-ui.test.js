const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const workspace = fs.readFileSync(path.join(root, 'components/app/ContactsWorkspace.tsx'), 'utf8');
const api = fs.readFileSync(path.join(root, 'lib/api.ts'), 'utf8');

assert.match(api, /instagramIdentity\?: \{/);
assert.match(workspace, /if \(isInstagramOnlyContact\(contact\)\) return "Instagram"/);
assert.match(workspace, /if \(identity\?\.username\) return `@\$\{identity\.username/);
assert.match(workspace, /label="Instagram" value=\{getInstagramIdentityLabel\(selected\)\}/);
assert.match(workspace, /src=\{getContactAvatar\(contact\)\}/);
assert.match(workspace, /src=\{getContactAvatar\(selected\)\}/);
assert.match(workspace, /if \(contact\.whatsappPhone \|\| contact\.waId\) return "WhatsApp"/);

console.log('instagram-contacts-identity-ui.test.js: ok');
