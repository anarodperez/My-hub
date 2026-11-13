const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { emptyState } = require('../src/features/hub/model.ts');
const wishlist = require('../src/features/hub/wishlist.ts');
function library(width = 360, fontScale = 1, withWishes = false, params = {}) {
  const states = []; const effects = []; let pending = []; let index = 0; const exports = {};
  const state = withWishes ? { ...emptyState, wishes: Array.from({ length: 8 }, (_, i) => ({ id: String(i), title: `Deseo ${i}`, category: 'book', completed: false })) } : emptyState;
  const mocks = {
    'expo-router': { router: { setParams: value => Object.assign(params, value) }, useLocalSearchParams: () => params },
    react: { useState: initial => { const i = index++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; }, useEffect(effect, deps) { const i = index++; if (!effects[i] || deps.some((value, j) => value !== effects[i][j])) { effects[i] = deps; pending.push(effect); } }, useRef: () => ({ current: null }) },
    'react-native': { View: 'View', Pressable: 'Pressable', TextInput: 'TextInput', useWindowDimensions: () => ({ width, fontScale }) },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    '@/features/hub/provider': { useHub: () => ({ state, repository: { accountId: 'me' } }), usePalette: () => ({}) },
    '@/features/hub/layout': require('../src/features/hub/layout.ts'),
    '@/features/hub/wishlist': wishlist,
    '@/features/hub/wishlist-collections': require('../src/features/hub/wishlist-collections.ts'),
  };
  const components = new Proxy({}, { get: (_, key) => key });
  mocks['@/hooks/use-view-state'] = { useViewState: (_, initial) => mocks.react.useState(initial) };
  const setters = new Map();
  mocks['@/hooks/use-view-state'].useViewState = (key, initial) => { const [value, setter] = mocks.react.useState(initial); if (!setters.has(key)) setters.set(key, setter); return [value, setters.get(key)]; };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/(tabs)/library.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, require: name => mocks[name] || components,
  });
  const render = () => { index = 0; const result = exports.default(); const run = pending; pending = []; run.forEach(effect => effect()); return result; };
  const all = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(all)];
  return { render, all };
}

test('wishlist leaves room for titles without restoring wide outer margins', () => {
  const { getHubLayout } = require('../src/features/hub/layout.ts');
  for (const [width, fontScale, columns] of [[2134, 1, 4], [1920, 1, 4], [1440, 1, 3], [1024, 1, 2], [390, 1, 1], [440, 1, 2], [320, 1, 1], [1920, 1.6, 1]]) {
    const view = library(width, fontScale, true);
    const nodes = view.all(view.render());
    const tiles = nodes.filter(node => node.type === 'View' && node.props.children?.type === 'WishlistTile');
    assert.equal(tiles.length, 8);
    if (columns === 1) assert.equal(tiles[0].props.style.width, '100%');
    else {
      const grid = nodes.find(node => Array.isArray(node.props?.children) && node.props.children.some(child => child?.props?.children?.type === 'WishlistTile'));
      const available = getHubLayout(width, fontScale).contentWidth - (width >= 1200 && fontScale <= 1.3 ? 248 : 0);
      assert.ok(Math.abs(tiles[0].props.style.width * columns + grid.props.style.gap * (columns - 1) - available) < 0.01);
      if (width >= 900) assert.ok(tiles[0].props.style.width >= 280);
    }
  }
});
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

test('explicit links update a mounted library and manual switching remains usable', () => {
  const params = { view: 'mine' }; const view = library(390, 1, false, params);
  const selected = () => view.all(view.render()).find(n => n.type === 'ChoiceTabs' && n.props.options.some(o => o.value === 'mine'));
  selected(); assert.equal(selected().props.value, 'mine');
  selected().props.onChange('wishlist'); assert.equal(selected().props.value, 'wishlist');
  params.view = 'mine'; selected(); assert.equal(selected().props.value, 'mine');
  params.view = 'invalid'; selected(); assert.equal(selected().props.value, 'mine');
});
 test('wishlist privacy has no unsupported visibility control', () => {
  const view = library(); const nodes = view.all(view.render());
  assert.ok(nodes.some(n => typeof n.props?.children === 'string' && n.props.children.includes('Tu wishlist es privada')));
  assert.ok(!nodes.some(n => n.props?.accessibilityRole === 'radiogroup'));
});
