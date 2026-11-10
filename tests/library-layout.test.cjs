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
    react: { useState: initial => { const i = index++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; }, useEffect() {}, useRef: () => ({ current: null }) },
    'react-native': { View: 'View', Pressable: 'Pressable', TextInput: 'TextInput', useWindowDimensions: () => ({ width: 360, fontScale: 1 }) },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    '@/features/hub/provider': { useHub: () => ({ state: emptyState, repository: { accountId: 'me' } }), usePalette: () => ({}) },
    '@/features/hub/layout': { getHubLayout: () => ({ wishColumns: 1, feedColumns: 1, contentWidth: 312 }) },
    '@/features/hub/wishlist': wishlist,
    '@/features/hub/wishlist-collections': require('../src/features/hub/wishlist-collections.ts'),
  };
  const components = new Proxy({}, { get: (_, key) => key });
  mocks['@/hooks/use-view-state'] = { useViewState: (_, initial) => mocks.react.useState(initial) };
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
  nodes.find(node => node.props?.accessibilityState?.expanded === false).props.onPress();
  nodes = view.all(view.render());
  nodes.find(node => node.type === 'Chips').props.onChange('book');
  nodes = view.all(view.render());
  const clear = nodes.find(node => node.type === 'IconAction' && node.props.label === 'Limpiar filtros y búsqueda');
  assert.ok(clear); clear.props.onPress();
  nodes = view.all(view.render());
  assert.equal(nodes.find(node => node.type === 'Chips').props.value, 'all');
  nodes.find(node => node.props?.accessibilityState?.expanded === true).props.onPress();
  assert.ok(!view.all(view.render()).some(node => node.type === 'Chips'));
});
test('Por cumplir y Cumplidos solo aparecen en Wishlist', () => {
  const view = library(); let nodes = view.all(view.render());
  assert.ok(nodes.some(node => node.props?.accessibilityRole === 'tablist'));
  nodes.find(node => node.type === 'ChoiceTabs' && node.props.value === 'wishlist').props.onChange('mine');
  nodes = view.all(view.render());
  assert.ok(!nodes.some(node => node.props?.accessibilityRole === 'tablist'));
});

test('navegacion compacta y busqueda sin apariencia de formulario', () => {
  const view = library(); const nodes = view.all(view.render());
  const navigation = nodes.find(node => node.type === 'ChoiceTabs' && node.props.value === 'wishlist');
  assert.equal(navigation.props.variant, 'segmented');
  assert.ok(nodes.some(node => node.type === 'TextInput' && node.props.accessibilityLabel === 'Buscar por título'));
  assert.ok(!nodes.some(node => node.type === 'Field' && node.props.label === 'Buscar por título'));
  const input = nodes.find(node => node.type === 'TextInput');
  assert.equal(input.props.style.outlineWidth, 0);
  input.props.onFocus();
  const focusedInput = view.all(view.render()).find(node => node.type === 'TextInput');
  assert.equal(focusedInput.props.style.outlineWidth, 0);
});

test('Filtros es un solo boton sin otro control ni borde de foco interior', () => {
  const view = library(); let nodes = view.all(view.render());
  let button = nodes.find(node => node.props?.accessibilityState?.expanded === false);
  assert.equal(button.type, 'Pressable');
  assert.equal(view.all(button).filter(node => node.type === 'Pressable' || node.type === 'IconAction').length, 1);
  button.props.onFocus();
  nodes = view.all(view.render());
  button = nodes.find(node => node.props?.accessibilityState?.expanded === false);
  assert.equal(button.props.style({ pressed: false }).outlineWidth, 0);
  button.props.onPress();
  nodes = view.all(view.render());
  assert.ok(nodes.some(node => node.props?.accessibilityState?.expanded === true));
});

test('borrar la busqueda conserva la categoria elegida', () => {
  const view = library(); let nodes = view.all(view.render());
  nodes.find(node => node.props?.accessibilityState?.expanded === false).props.onPress();
  nodes = view.all(view.render());
  nodes.find(node => node.type === 'Chips').props.onChange('book');
  nodes.find(node => node.type === 'TextInput').props.onChangeText('lámpara');
  nodes = view.all(view.render());
  nodes.find(node => node.props?.accessibilityLabel === 'Borrar búsqueda').props.onPress();
  nodes = view.all(view.render());
  assert.equal(nodes.find(node => node.type === 'TextInput').props.value, '');
  assert.equal(nodes.find(node => node.type === 'Chips').props.value, 'book');
});
