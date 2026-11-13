const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { emptyState } = require('../src/features/hub/model.ts');
const collections = require('../src/features/hub/wishlist-collections.ts');
const wishlist = require('../src/features/hub/wishlist.ts');

function harness(file, component) {
  let state = { ...emptyState }, index = 0, uuidCalls = 0;
  const values = [], exports = {};
  const ui = new Proxy({}, { get: (_, key) => key });
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    './web-motion': { webMotion: () => ({}) },
    './hub-ui': { CategoryIcon: 'CategoryIcon', Copy: 'Copy', TextAction: 'TextAction', showError() {} },
    react: { useRef: value => ({ current: value }), useState: initial => {
      const slot = index++;
      if (!(slot in values)) values[slot] = typeof initial === 'function' ? initial() : initial;
      return [values[slot], value => { values[slot] = typeof value === 'function' ? value(values[slot]) : value; }];
    } },
    'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': { ...ui, View: 'View', Pressable: 'Pressable', ScrollView: 'ScrollView', Platform: { OS: 'web' }, useWindowDimensions: () => ({ fontScale: 1 }) },
    'expo-crypto': { randomUUID: () => { uuidCalls++; return 'new-id'; } },
    'expo-router': { router: { back() {} } },
    '@/features/hub/provider': { usePalette: () => ({}), useHub: () => ({ state, update: change => api.update(change) }) },
    '@/features/hub/wishlist-collections': collections, '@/features/hub/wishlist': wishlist,
    '@/features/hub/navigation': { goBackOr() {} },
    '@/features/hub/covers': { persistCover: async value => value, discardCover() {} },
    '@/features/hub/model': require('../src/features/hub/model.ts'),
    '@/components/hub-ui': { ...ui, Chips: 'Chips', Copy: 'Copy', Field: 'Field', Screen: 'Screen', SaveAction: 'SaveAction', TextAction: 'TextAction', showError() {} },
  };
  const source = fs.readFileSync(file, 'utf8').replace(`function ${component}(`, `export function ${component}(`).replace('export export ', 'export ');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, require: name => mocks[name] || ui,
  });
  const all = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(all)];
  const api = {
    update: async change => { state = change(state); },
    render: props => { index = 0; return all(exports[component](props)); },
    get state() { return state; }, set state(value) { state = value; },
    get uuidCalls() { return uuidCalls; },
  };
  return api;
}


const item = { id: 'wish', title: 'A wish', category: 'book', coverUrl: '', link: 'https://example.com' };
test('missing and failed covers preserve the image proportions and equal-height cards', () => {
  const view = harness('src/components/wishlist-tile.tsx', 'WishlistTile');
  const render = data => view.render({ item: data, completed: true, wish: true });
  let nodes = render(item);
  assert.ok(nodes.some(n => n.type === 'View' && n.props.style?.aspectRatio === 1));
  assert.equal(nodes[0].props.style.flex, 1);
  assert.ok(!nodes.some(n => n.props?.pointerEvents === 'none'));
  assert.ok(!nodes.some(n => n.type === 'Copy' && n.props.children === 'Sin colecci\u00f3n'));
  assert.ok(nodes.some(n => n.props?.label === 'Organizar A wish'));
  assert.ok(nodes.some(n => n.props?.accessibilityRole === 'link'));
  assert.ok(nodes.some(n => n.type === 'CheckIcon' && n.props.weight === 'bold'));
  nodes = render({ ...item, coverUrl: 'https://example.com/cover.jpg' });
  const image = nodes.find(n => n.props?.contentFit);
  assert.equal(image.props.contentFit, 'contain');
  assert.ok(nodes.some(n => n.props?.pointerEvents === 'none'));
  image.props.onError();
  nodes = render({ ...item, coverUrl: 'https://example.com/cover.jpg' });
  assert.ok(!nodes.some(n => n.props?.contentFit));
  assert.ok(nodes.some(n => n.type === 'View' && n.props.style?.aspectRatio === 1));
  assert.ok(!nodes.some(n => n.props?.pointerEvents === 'none'));
  view.state = { ...view.state, wishlistOrganization: { collections: [{ id: 'personal', name: 'Summer' }], assignments: { 'wish:wish': 'personal' } } };
  assert.ok(render(item).some(n => n.type === 'Copy' && n.props.children === 'Summer'));
});
