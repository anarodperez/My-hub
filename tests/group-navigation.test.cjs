const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const compile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const all = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(all)];
const components = new Proxy({}, { get: (_, key) => key });
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };

test('group landing defaults to plans and preserves explicit availability and gifts links', () => {
  for (const [tab, expected] of [[undefined, 'plan'], ['availability', 'availability'], ['gift', 'gift'], ['plan', 'plan']]) {
    const exports = {};
    vm.runInNewContext(compile('src/app/group-space.tsx'), { exports, require: name => ({
      'react/jsx-runtime': jsx,
      'expo-router': { useLocalSearchParams: () => ({ id: 'g', tab }) },
      '@/features/hub/provider': { useHub: () => ({ repository: { accountId: 'me' } }) },
    })[name] || components });
    assert.equal(exports.default().props.initialTab, expected);
  }
});

test('all group sections are labelled, ordered and disabled during mutations', () => {
  const exports = {}, calls = [];
  vm.runInNewContext(compile('src/components/group-header.tsx'), { exports, require: name => ({
    'react/jsx-runtime': jsx,
    'react-native': { View: 'View', useWindowDimensions: () => ({ width: 390 }) },
    '@/features/hub/group-covers': { getGroupCover: () => 'cover' },
    '@/features/hub/provider': { usePalette: () => ({}) },
  })[name] || components });
  const tabs = all(exports.GroupHeader({ id: 'g', name: 'Friends', count: 5, tab: 'people', busy: true, onTabChange: tab => calls.push(tab) })).find(node => node.type === 'ChoiceTabs');
  assert.equal(tabs.props.disabled, true);
  assert.deepEqual(Array.from(tabs.props.options, option => option.label), ['Planes', 'Disponibilidad', 'Regalos', 'Personas']);
  assert.equal(tabs.props.value, 'people');
  tabs.props.onChange('plan'); assert.deepEqual(calls, ['plan']);
});

test('icon section controls use two columns on mobile and with enlarged text', () => {
  const source = fs.readFileSync('src/components/hub-ui.tsx', 'utf8');
  const component = source.slice(source.indexOf('export function ChoiceTabs'), source.indexOf('export function IconAction'));
  for (const [width, fontScale, basis] of [[320, 1, '40%'], [390, 1, '40%'], [1440, 1, 0], [1440, 1.6, '40%']]) {
    const exports = {}, calls = [];
    vm.runInNewContext(ts.transpileModule(component, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
      exports, require: () => jsx, usePalette: () => ({}), useWindowDimensions: () => ({ width, fontScale }),
      Platform: { OS: 'ios' }, MotionContent: 'MotionContent', Pressable: 'Pressable', Copy: 'Copy',
      webMotion: () => ({}),
    });
    const options = ['plan', 'availability', 'gift', 'people'].map(value => ({ value, label: value, icon: 'icon' }));
    const render = items => all(exports.ChoiceTabs({ options: items, value: 'plan', onChange: value => calls.push(value) }));
    const tabs = render(options).filter(node => node.type === 'Pressable');
    assert.equal(tabs.length, 4);
    tabs.forEach(node => assert.equal(node.props.style({ pressed: false }).flexBasis, basis));
    tabs[3].props.onPress(); assert.deepEqual(calls, ['people']);
    assert.equal(render(options.map(option => ({ ...option, icon: undefined }))).find(node => node.type === 'Pressable').props.style({ pressed: false }).flexBasis, undefined);
  }
});

for (const own of [true, false]) test(`People preserves invitation permissions: owner=${own}`, async () => {
  let index = 0;
  let clipboardFails = false;
  const slots = [], effects = [], routes = [], calls = [], exports = {};
  const repository = {
    accountId: 'me', listGroups: async () => [{ id: 'g', name: 'Friends', owner_id: own ? 'me' : 'other' }],
    listMembers: async () => [{ user_id: 'me' }], author: async () => ({ id: 'me', name: 'Ana' }),
    createInvite: async id => { calls.push(id); return 'invitation-token'; },
  };
  const react = {
    useState(initial) { const i = index++; if (!(i in slots)) slots[i] = initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = index++; return slots[i] ||= { current: initial }; }, useEffect: effect => effects.push(effect),
  };
  const mocks = {
    react, 'react/jsx-runtime': jsx,
    'expo-router': { useLocalSearchParams: () => ({ id: 'g' }), router: { navigate: route => routes.push(route) } },
    'react-native': { View: 'View', Platform: { OS: 'web' }, useWindowDimensions: () => ({ width: 1440, fontScale: 1 }) },
    '@/features/hub/provider': { useHub: () => ({ repository }), usePalette: () => ({}) },
  };
  vm.runInNewContext(compile('src/app/group/[id].tsx'), { exports, require: name => mocks[name] || components, navigator: { clipboard: { writeText: async value => { if (clipboardFails) throw new Error('Denied'); calls.push(['copy', value]); } } } });
  const render = () => { index = 0; return all(exports.default()); };
  render(); effects.splice(0).forEach(effect => effect()); await new Promise(setImmediate);
  let nodes = render();
  const header = nodes.find(node => node.type === 'GroupHeader');
  header.props.onTabChange('availability');
  assert.equal(routes[0].params.id, 'g'); assert.equal(routes[0].params.tab, 'availability');
  const invite = nodes.find(node => node.type === 'Action' && node.props.children === 'Crear c\u00f3digo de invitaci\u00f3n');
  assert.equal(Boolean(invite), own);
  if (own) {
    invite.props.onPress(); await new Promise(setImmediate);
    assert.deepEqual(calls, ['g']);
    nodes = render();
    assert.ok(nodes.some(node => node.type === 'Copy' && node.props.children === 'invitation-token' && node.props.selectable));
    nodes.find(node => node.type === 'Action' && node.props.children === 'Copiar c\u00f3digo').props.onPress();
    await new Promise(setImmediate);
    assert.deepEqual(calls.at(-1), ['copy', 'invitation-token']);
    nodes = render();
    assert.ok(nodes.some(node => node.type === 'Copy' && node.props.accessibilityLiveRegion === 'polite'));
    clipboardFails = true;
    nodes.find(node => node.type === 'Action' && node.props.children === 'Copiado').props.onPress();
    await new Promise(setImmediate);
    nodes = render();
    assert.ok(nodes.some(node => node.props?.accessibilityRole === 'alert' && node.props.children.includes('manualmente')));
    assert.equal(nodes.some(node => node.type === 'Action' && node.props.children === 'Copiado'), false);
  } else {
    assert.equal(nodes.some(node => node.type === 'TextAction' && node.props.children === 'Editar nombre del grupo'), false);
    assert.ok(nodes.some(node => node.type === 'TextAction' && node.props.children === 'Salir del grupo'));
  }
});
