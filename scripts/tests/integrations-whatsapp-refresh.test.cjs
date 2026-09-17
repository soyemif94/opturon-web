const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const ts = require('typescript');

// Execute the real TSX with an isolated hook fixture: state survives rerenders,
// as it does when Next router.refresh merges new server props into a client tree.
// Network, navigation and presentational dependencies are mocked.
function mountIntegrations() {
  const modules = new Map();
  const hookStates = new Map();
  let hooks;
  let cursor;
  let refreshCount = 0;
  let signupCalls = 0;
  let signupResult = { state: 'connected', channelId: 'channel-a' };
  const react = {
    useState(initial) {
      const state = hooks;
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], (next) => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
    },
    useMemo: (compute) => compute()
  };
  const jsx = (type, props) => ({ type, props });
  const components = new Proxy({}, { get: (_target, name) => String(name) });
  const router = { refresh: () => { refreshCount += 1; }, replace: () => {} };
  function load(relativePath) {
    if (modules.has(relativePath)) return modules.get(relativePath);
    const source = readFileSync(resolve(process.cwd(), relativePath), 'utf8');
    const compiled = ts.transpileModule(source, {
      fileName: relativePath,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
    }).outputText;
    const module = { exports: {} };
    function requireFixture(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
      if (name === 'next/navigation') return { useRouter: () => router, useSearchParams: () => new URLSearchParams() };
      if (name === 'next/link') return { default: 'Link' };
      if (name === 'lucide-react' || name.startsWith('@/components/ui/')) return components;
      if (name === '@/lib/whatsapp') return { getTrackedWhatsAppLink: () => '/test-support' };
      if (name === '@/lib/meta-whatsapp-signup') return {
        beginMetaWhatsAppConnection: async () => {
          signupCalls += 1;
          if (signupResult instanceof Error) throw signupResult;
          return signupResult;
        }
      };
      if (name === '@/components/app/client-integrations-experience') return load('components/app/client-integrations-experience.tsx');
      throw new Error(`Unexpected dependency: ${name}`);
    }
    new Function('require', 'module', 'exports', compiled)(requireFixture, module, module.exports);
    modules.set(relativePath, module.exports);
    return module.exports;
  }
  function renderComponent(component, props) {
    if (!hookStates.has(component)) hookStates.set(component, []);
    hooks = hookStates.get(component);
    cursor = 0;
    return component(props);
  }
  const { IntegrationsHub } = load('components/app/integrations-hub.tsx');
  const { ClientIntegrationsExperience } = load('components/app/client-integrations-experience.tsx');
  const { buildWhatsAppConnectionStatus } = load('lib/whatsapp-channel-state.ts');
  const context = (channel, tenant = 'tenant-a') => ({
    tenantId: tenant, clinic: { id: `clinic-${tenant}` }, channel,
    reason: channel ? 'resolved' : 'mapped_clinic_without_whatsapp_channel'
  });
  return {
    status: (channel = null, sessionStatus = null, tenant = 'tenant-a') => buildWhatsAppConnectionStatus({
      context: context(channel, tenant),
      onboarding: sessionStatus ? {
        session: { status: sessionStatus },
        onboardingState: sessionStatus === 'completed' ? 'connected' : sessionStatus === 'pending_meta' ? 'pending_meta' : 'idle'
      } : null
    }),
    render: (whatsapp) => {
      const child = renderComponent(IntegrationsHub, {
        whatsapp, whatsappStatus: null, instagramStatus: null, isOpturonAdmin: false
      });
      assert.equal(child.type, ClientIntegrationsExperience);
      const tree = renderComponent(child.type, child.props);
      return { whatsapp: child.props.whatsapp, card: tree.props.children[0] };
    },
    refreshes: () => refreshCount,
    calls: () => signupCalls,
    setSignupResult: (value) => { signupResult = value; }
  };
}

// Same non-secret channel fields returned by Embedded Signup's channel upsert.
const activeChannel = {
  id: 'channel-a', clinicId: 'clinic-tenant-a', provider: 'whatsapp_cloud',
  phoneNumberId: 'phone-a', wabaId: 'waba-a', status: 'active',
  displayPhoneNumber: '+15550000001', connectionSource: 'embedded_signup'
};

test('successful signup + router refresh replaces the initial disconnected client status', async () => {
  const app = mountIntegrations();
  const before = app.render(app.status());
  assert.equal(before.card.props.state, 'disconnected');
  const connectButton = before.card.props.actions.props.children[1];
  await connectButton.props.onClick();
  assert.equal(app.calls(), 1);
  assert.equal(app.refreshes(), 1);
  const connected = app.status(activeChannel, 'completed');
  const after = app.render(connected);
  assert.equal(after.whatsapp, connected, 'client must consume the refreshed server status');
  assert.equal(after.card.props.state, 'connected');
  assert.equal(after.card.props.actions.props.children.props.children, 'Gestionar');
  assert.equal(app.render(app.status({ ...activeChannel }, 'completed')).card.props.state, 'connected');
});

test('refreshed pending status remains connecting, never assumes HTTP success means connected', async () => {
  const app = mountIntegrations();
  app.setSignupResult({ state: 'pending_meta', channelId: 'channel-a' });
  const before = app.render(app.status());
  await before.card.props.actions.props.children[1].props.onClick();
  const after = app.render(app.status({ ...activeChannel, status: 'pending' }, 'pending_meta'));
  assert.equal(after.card.props.state, 'connecting');
});

test('refresh into a different tenant cannot retain the previous connected channel', () => {
  const app = mountIntegrations();
  assert.equal(app.render(app.status(activeChannel, 'completed')).card.props.state, 'connected');
  const other = app.render(app.status(null, null, 'tenant-b'));
  assert.equal(other.whatsapp.tenantId, 'tenant-b');
  assert.equal(other.whatsapp.channelId, null);
  assert.equal(other.card.props.state, 'disconnected');
});

test('an inactive channel on requery stops showing connected', () => {
  const app = mountIntegrations();
  app.render(app.status(activeChannel, 'completed'));
  assert.notEqual(app.render(app.status({ ...activeChannel, status: 'inactive' }, 'completed')).card.props.state, 'connected');
});

for (const terminal of ['cancelled', 'failed']) {
  test(`${terminal} signup without active channel leaves the CTA available after refresh`, async () => {
    const app = mountIntegrations();
    app.setSignupResult(new Error(`Test ${terminal}`));
    const before = app.render(app.status());
    await before.card.props.actions.props.children[1].props.onClick();
    assert.equal(app.refreshes(), 1);
    const after = app.render(app.status(null, terminal));
    assert.equal(after.card.props.state, 'disconnected');
    assert.equal(after.card.props.actions.props.children[1].props.disabled, false);
  });
}
