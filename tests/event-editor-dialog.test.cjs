const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { emptyState } = require('../src/features/hub/model.ts');

test('el evento se edita en modal y guarda la fecha elegida antes de volver al calendario', async () => {
  let index = 0, saved;
  const states = [], navigation = [], exports = {};
  const components = new Proxy({}, { get: (_, key) => key });
  const mocks = {
    react: { useEffect() {}, useRef: initial => ({ current: initial }), useState: initial => { const slot = index++; if (!(slot in states)) states[slot] = typeof initial === 'function' ? initial() : initial; return [states[slot], value => { states[slot] = typeof value === 'function' ? value(states[slot]) : value; }]; } },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { View: 'View', Platform: { OS: 'web' } },
    'expo-crypto': { randomUUID: () => 'new-event' },
    '@/features/hub/provider': { useHub: () => ({ state: emptyState, update: async change => { saved = change(emptyState); } }), usePalette: () => ({}) },
    '@/features/hub/model': require('../src/features/hub/model.ts'),
    '@/features/hub/navigation': { goBackOr: route => navigation.push(route) },
  };
  const source = fs.readFileSync('src/app/compose.tsx', 'utf8').replace('function Editor(', 'export function Editor(');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: name => mocks[name] || components });
  const all = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(all)];
  const render = () => { index = 0; return all(exports.Editor({ kind: 'event', date: '2026-12-01' })); };
  let nodes = render();
  assert.equal(nodes[0].type, 'FormDialog');
  assert.equal(nodes.find(n => n.type === 'PlanDateField').props.required, true);
  nodes.find(n => n.type === 'Field').props.onChangeText('Una tarde de cine');
  nodes.find(n => n.type === 'PlanDateField').props.onChange('2026-12-03');
  nodes = render();
  nodes.find(n => n.type === 'Action').props.onPress();
  await new Promise(setImmediate);
  assert.equal(saved.events[0].title, 'Una tarde de cine');
  assert.equal(saved.events[0].date, '2026-12-03');
  assert.deepEqual(navigation, ['/calendar']);
});
