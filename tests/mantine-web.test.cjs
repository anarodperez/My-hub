const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
const components = new Proxy({}, { get: (_, key) => key });
const all = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(all)];
function load(file, mocks) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, require: name => name === 'react/jsx-runtime' ? jsx : mocks[name] || components });
  return exports;
}

test('web navigation preserves group selection, explicit wishlist view and modified anchor clicks', () => {
  const calls = [];
  const Shell = Object.assign('Shell', { Navbar: 'Navbar', Footer: 'Footer', Main: 'Main' });
  const { AppShell } = load('src/components/app-shell.web.tsx', {
    '@mantine/core': { AppShell: Shell, NavLink: 'NavLink', ScrollArea: 'ScrollArea', Avatar: 'Avatar', UnstyledButton: 'Brand' },
    'motion/react': { motion: { span: 'motion.span' } },
    'expo-router': { usePathname: () => '/group/123', router: { navigate: route => calls.push(route) } },
    'react-native': { useWindowDimensions: () => ({ width: 1440, fontScale: 1 }) },
    '@/features/hub/layout': { getHubLayout: () => ({ sidebar: true }) },
    '@/features/hub/provider': { usePalette: () => ({}), useHub: () => ({ state: { preferences: { name: 'Ana' } } }) },
  });
  const nodes = all(AppShell({ authenticated: true, children: 'screen' }));
  const links = nodes.filter(n => n.type === 'NavLink');
  assert.equal(links.find(n => n.props.active).props.label, 'Amigas');
  const wishlist = links.find(n => n.props.label === 'Wishlist');
  let prevented = 0;
  wishlist.props.onClick({ button: 0, preventDefault: () => prevented++ });
  assert.equal(JSON.stringify(calls[0]), JSON.stringify({ pathname: '/library', params: { view: 'wishlist' } }));
  wishlist.props.onClick({ button: 0, ctrlKey: true, preventDefault: () => prevented++ });
  assert.equal(prevented, 1);
  assert.equal(calls.length, 1);
});

test('Mantine controls preserve busy, disabled, accessible labels and valid tab selection', () => {
  const controls = load('src/components/platform-controls.web.tsx', {
    react: { useId: () => 'test' },
    'motion/react': { motion: { span: 'motion.span' } },
    '@mantine/core': { Button: 'Button', ActionIcon: 'ActionIcon', Tooltip: 'Tooltip', Tabs: Object.assign(() => {}, { List: 'List', Tab: 'Tab' }) },
    'react-native': { StyleSheet: { flatten: value => value } },
    '@/features/hub/provider': { usePalette: () => ({ accent: '#705080', onAccent: '#fff' }) },
  });
  const save = controls.WebSaveAction({ busy: true, onPress() {} });
  assert.equal(save.props.loading, true);
  assert.equal(save.props.disabled, true);
  assert.equal(save.props['aria-busy'], true);
  const icon = all(controls.WebIconAction({ label: 'Invitar amigas', disabled: true, onPress() {} })).find(n => n.type === 'ActionIcon');
  assert.equal(icon.props['aria-label'], 'Invitar amigas');
  assert.equal(icon.props.disabled, true);
  const changes = [];
  const props = { options: [{ value: 'plan', label: 'Planes' }], value: 'plan', onChange: value => changes.push(value) };
  controls.WebChoiceTabs(props).props.onChange('plan');
  controls.WebChoiceTabs(props).props.onChange(null);
  controls.WebChoiceTabs({ ...props, disabled: true }).props.onChange('plan');
  assert.deepEqual(changes, ['plan']);
});
