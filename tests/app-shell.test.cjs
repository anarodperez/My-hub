const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function shell(pathname, width = 1440, authenticated = true, fontScale = 1) {
  const exports = {}, calls = [];
  const components = new Proxy({}, { get: (_, name) => name });
  const mocks = {
    react: { useState: initial => [initial, () => {}] },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'expo-router': { usePathname: () => pathname, router: { navigate: route => calls.push(route) } },
    'react-native': { Platform: { OS: 'web' }, View: 'View', ScrollView: 'ScrollView', Pressable: 'Pressable', useWindowDimensions: () => ({ width, fontScale }) },
    './web-motion': { webMotion: () => ({}) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }) },
    '@/features/hub/provider': { usePalette: () => ({}), useHub: () => ({ state: { preferences: { name: 'Ana' } } }) },
    '@/features/hub/layout': require('../src/features/hub/layout.ts'),
    '@/constants/hub-design': { hubWidths: { sidebar: 224 } },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/app-shell.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: name => mocks[name] || components });
  const all = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(all)];
  return { nodes: all(exports.AppShell({ authenticated, children: { type: 'Stack' } })), calls };
}

test('primary navigation remains available and selects Amigas throughout group routes', () => {
  for (const route of ['/friends', '/groups', '/group-space', '/group/123']) {
    const { nodes, calls } = shell(route);
    const selected = nodes.filter(node => node.props?.accessibilityState?.selected);
    assert.equal(selected.length, 1);
    assert.equal(selected[0].props.accessibilityLabel, 'Amigas');
    nodes.find(node => node.props?.accessibilityLabel === 'Calendario').props.onPress();
    assert.deepEqual(calls, ['/calendar']);
    assert.equal(nodes.filter(node => node.type === 'Stack').length, 1);
  }
});

test('mobile has four labelled destinations, desktop also exposes profile', () => {
  for (const [width, fontScale] of [[390, 1], [320, 1.6], [900, 1], [1440, 1.6]]) {
    const { nodes } = shell('/', width, true, fontScale);
    const tabs = nodes.filter(node => node.props?.accessibilityRole === 'tab');
    assert.equal(tabs.length, 4);
    if (width < 900) {
      tabs.forEach(node => {
        const style = node.props.style({ pressed: false });
        assert.equal(style.flex, 1);
        assert.equal(style.minWidth, 0);
        assert.ok(style.minHeight >= 48);
      });
      assert.equal(nodes.some(node => node.type === 'ScrollView'), false);
    }
    assert.equal(nodes.some(node => node.props?.accessibilityLabel === 'Mi perfil'), width >= 900);
  }
});

test('auth and mobile editors keep their focused layout', () => {
  for (const [route, authenticated] of [['/account', true], ['/friends', false], ...['/compose', '/group-post', '/wish', '/review', '/song'].map(route => [route, true])]) {
    const { nodes } = shell(route, 390, authenticated);
    assert.equal(nodes.some(node => node.props?.accessibilityRole === 'tab'), false);
    assert.ok(nodes.some(node => node.type === 'Stack'));
  }
});

test('Wishlist opens its explicit view and remains selected on library detail routes', () => {
  for (const route of ['/library', '/wish', '/review']) {
    const { nodes, calls } = shell(route);
    const wishlist = nodes.find(node => node.props?.accessibilityLabel === 'Wishlist');
    assert.equal(wishlist.props.accessibilityState.selected, true);
    wishlist.props.onPress();
    assert.equal(JSON.stringify(calls), JSON.stringify([{ pathname: '/library', params: { view: 'wishlist' } }]));
  }
});

test('desktop menu scrolls independently and profile remains accessible', () => {
  const { nodes, calls } = shell('/settings');
  const region = nodes.find(node => node.type === 'ScrollView');
  assert.equal(region.props.style.minHeight, 0);
  const profile = nodes.find(node => node.props?.accessibilityLabel === 'Mi perfil');
  assert.equal(profile.props.accessibilityState.selected, true);
  assert.equal(typeof profile.props.onFocus, 'function');
  profile.props.onPress();
  assert.deepEqual(calls, ['/settings']);
});
