const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { emptyState } = require('../src/features/hub/model.ts');
const wishlist = require('../src/features/hub/wishlist.ts');
function library() {
  const states = []; let index = 0; const exports = {};
  const mocks = {
    'expo-router': { router: {} },
    react: { useState: initial => { const i = index++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = value; }]; }, useEffect() {} },
    'react-native': { View: 'View', Pressable: 'Pressable', useWindowDimensions: () => ({ width: 360, fontScale: 1 }) },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    '@/features/hub/provider': { useHub: () => ({ state: emptyState, repository: { accountId: 'me' } }), usePalette: () => ({}) },
    '@/features/hub/layout': { getHubLayout: () => ({ wishColumns: 1, contentWidth: 312 }) },
    '@/features/hub/wishlist': wishlist,
  };
  const components = new Proxy({}, { get: (_, key) => key });
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/(tabs)/library.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, require: name => mocks[name] || components,
  });
  const render = () => { index = 0; return exports.default(); };
  const all = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(all)];
  return { render, all };
}
test('los filtros se despliegan sin perder categoria y se pueden limpiar', () => {
  const view = library(); let nodes = view.all(view.render());
  assert.ok(!nodes.some(node => node.type === 'Chips'));
  nodes.find(node => node.type === 'IconAction' && node.props.expanded === false).props.onPress();
  nodes = view.all(view.render());
  nodes.find(node => node.type === 'Chips').props.onChange('book');
  nodes = view.all(view.render());
  const clear = nodes.find(node => node.type === 'IconAction' && node.props.label === 'Limpiar filtros y búsqueda');
  assert.ok(clear); clear.props.onPress();
  nodes = view.all(view.render());
  assert.equal(nodes.find(node => node.type === 'Chips').props.value, 'all');
  nodes.find(node => node.type === 'IconAction' && node.props.expanded === true).props.onPress();
  assert.ok(!view.all(view.render()).some(node => node.type === 'Chips'));
});
test('Por cumplir y Cumplidos solo aparecen en Wishlist', () => {
  const view = library(); let nodes = view.all(view.render());
  assert.ok(nodes.some(node => node.props?.accessibilityRole === 'tablist'));
  nodes.find(node => node.type === 'ChoiceTabs' && node.props.value === 'wishlist').props.onChange('mine');
  nodes = view.all(view.render());
  assert.ok(!nodes.some(node => node.props?.accessibilityRole === 'tablist'));
});
