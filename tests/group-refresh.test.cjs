const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('actualizar conserva el calendario montado y revocar membresía retira datos privados', async () => {
  let index = 0, deferred, nextGroups = [{ id: 'friends', name: 'Amigas' }];
  const slots = [], focused = [];
  const components = new Proxy({}, { get: (_, name) => name });
  const repository = { accountId: 'ana', listGroups: () => deferred || Promise.resolve(nextGroups), listMembers: async () => [], listAvailability: async () => [] };
  const react = {
    useState(initial) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = index++; return slots[i] ||= { current: initial }; }, useCallback: fn => fn,
  };
  const mocks = { react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { View: 'View', ActivityIndicator: 'ActivityIndicator', useWindowDimensions: () => ({ width: 1440, fontScale: 1 }) },
    'expo-router': { useFocusEffect: fn => focused.push(fn) }, '@/features/hub/provider': { useHub: () => ({ repository, media: {} }), usePalette: () => ({}) },
    '@/features/hub/model': require('../src/features/hub/model.ts'), '@/hooks/use-group-auto-refresh': { useGroupAutoRefresh() {} },
  };
  const exports = {};
  const source = fs.readFileSync('src/app/group-space.tsx', 'utf8').replace('function GroupSpace(', 'export function GroupSpace(');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: name => mocks[name] || components });
  const all = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(all)];
  const render = () => { index = 0; return all(exports.GroupSpace({ id: 'friends', initialTab: 'availability' })); };
  render(); focused.splice(0).forEach(fn => fn()); await new Promise(setImmediate);
  let nodes = render(); assert.ok(nodes.some(n => n.type === 'GroupAvailability'));
  let resolve;
  deferred = new Promise(done => { resolve = done; });
  nodes.find(n => n.type === 'Screen').props.onRefresh();
  nodes = render();
  assert.equal(nodes.find(n => n.type === 'Screen').props.refreshing, true);
  assert.ok(nodes.some(n => n.type === 'GroupAvailability'));
  resolve([]); await new Promise(setImmediate);
  nodes = render();
  assert.equal(nodes.some(n => n.type === 'GroupAvailability'), false);
  assert.ok(nodes.some(n => n.props.accessibilityRole === 'alert'));
});
