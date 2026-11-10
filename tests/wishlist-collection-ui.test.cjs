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
    react: { useRef: value => ({ current: value }), useState: initial => {
      const slot = index++;
      if (!(slot in values)) values[slot] = typeof initial === 'function' ? initial() : initial;
      return [values[slot], value => { values[slot] = typeof value === 'function' ? value(values[slot]) : value; }];
    } },
    'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': { ...ui, View: 'View', Pressable: 'Pressable', ScrollView: 'ScrollView', Platform: { OS: 'web' } },
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

test('retirar la coleccion editada no retira otra seleccionada despues', async () => {
  const view = harness('src/components/wishlist-collections.tsx', 'WishlistCollections');
  let value = 'personal';
  const render = () => view.render({ value, vertical: true, onChange: id => { value = id; } });
  let nodes = render();
  nodes.find(n => n.type === 'TextAction' && n.props.children === 'Editar colección').props.onPress();
  value = 'gifts';
  nodes = render();
  nodes.find(n => n.type === 'TextAction' && n.props.children === 'Retirar colección').props.onPress();
  await new Promise(setImmediate);
  assert.deepEqual(collections.wishlistOrganization(view.state).collections.map(c => c.id), ['gifts']);
});

test('reintentar tras fallo parcial reutiliza el deseo y no crea duplicados', async () => {
  const view = harness('src/app/wish.tsx', 'WishEditor');
  let failed = false;
  view.update = async change => {
    const next = change(view.state);
    if (!failed) { failed = true; view.state = { ...view.state, wishes: next.wishes }; throw new Error('Preference revision conflict'); }
    view.state = next;
  };
  const render = () => view.render({ initialCollection: 'personal' });
  let nodes = render();
  nodes.find(n => n.type === 'Field' && n.props.label === 'Nombre del producto').props.onChangeText('Una lámpara');
  nodes = render();
  nodes.find(n => n.type === 'SaveAction').props.onPress();
  await new Promise(setImmediate);
  nodes = render();
  nodes.find(n => n.type === 'SaveAction').props.onPress();
  await new Promise(setImmediate);
  assert.equal(view.state.wishes.length, 1);
  assert.equal(view.uuidCalls, 1);
  assert.equal(view.state.wishlistOrganization.assignments['wish:new-id'], 'personal');
});
