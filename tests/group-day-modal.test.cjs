const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function availability(width = 1440) {
  let index = 0, selected = '2026-11-11';
  const values = [], calls = [], exports = {};
  const components = new Proxy({}, { get: (_, key) => key });
  const mocks = {
    react: { useEffect() {}, useState: initial => { const slot = index++; if (!(slot in values)) values[slot] = typeof initial === 'function' ? initial() : initial; return [values[slot], value => { values[slot] = typeof value === 'function' ? value(values[slot]) : value; }]; } },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { Modal: 'Modal', View: 'View', Pressable: 'Pressable', ScrollView: 'ScrollView', Animated: { View: 'AnimatedView', Value: class { interpolate() { return 1; } } }, useWindowDimensions: () => ({ width, fontScale: 1 }) },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    './model': require('../src/features/hub/model.ts'), './availability-summary': require('../src/features/hub/availability-summary.ts'), './availability-matches': require('../src/features/hub/availability-matches.ts'),
    './provider': { usePalette: () => ({}) }, '@/hooks/use-reduced-motion': { useReducedMotion: () => false },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/hub/group-availability.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: name => mocks[name] || components });
  const all = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(all)];
  const props = { rows: [], members: [{ id: 'me', name: 'Ana' }], accountId: 'me', month: new Date(2026, 10, 1), busy: false, onMonth() {}, onSelect: day => { selected = day; }, onToggle: (...args) => calls.push(args), onDay: value => calls.push(['day', value]), onPlan: day => calls.push(['plan', day]) };
  return { calls, render: () => { index = 0; return all(exports.GroupAvailability({ ...props, selected })); } };
}

test('el detalle se abre al pulsar un dia y cerrar conserva la seleccion', () => {
  const screen = availability(); let nodes = screen.render();
  assert.equal(nodes.find(n => n.type === 'Modal')?.props.visible, false);
  nodes.find(n => n.type === 'Pressable' && n.props.accessibilityLabel?.startsWith('12 nov')).props.onPress();
  nodes = screen.render();
  assert.equal(nodes.find(n => n.type === 'Modal').props.visible, true);
  const answer = nodes.find(n => n.type === 'ChoiceTabs' && n.props.options.some(o => o.value === 'yes'));
  assert.ok(answer, 'La edición está disponible sin otro botón Editar');
  answer.props.onChange('yes');
  assert.deepEqual(screen.calls[0], ['morning', true]);
  nodes.find(n => n.type === 'Modal').props.onRequestClose();
  nodes = screen.render();
  assert.equal(nodes.find(n => n.type === 'Modal').props.visible, false);
  assert.ok(nodes.some(n => n.type === 'Pressable' && n.props.accessibilityLabel?.startsWith('12 nov') && n.props.accessibilityState.selected));
});

test('movil usa panel inferior y proponer cierra el modal con la fecha correcta', () => {
  const screen = availability(390); let nodes = screen.render();
  nodes.find(n => n.type === 'Pressable' && n.props.accessibilityLabel?.startsWith('12 nov')).props.onPress();
  nodes = screen.render();
  assert.equal(nodes.find(n => n.type === 'Modal').props.animationType, 'slide');
  nodes.find(n => n.type === 'Action' && n.props.children === 'Proponer un plan').props.onPress();
  assert.deepEqual(screen.calls.at(-1), ['plan', '2026-11-12']);
  assert.equal(screen.render().find(n => n.type === 'Modal').props.visible, false);
});
