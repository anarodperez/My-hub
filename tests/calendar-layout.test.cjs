const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function calendar(width = 1440) {
  let index = 0;
  const states = [], calls = [], exports = {};
  const components = new Proxy({}, { get: (_, key) => key });
  const gesture = new Proxy({}, { get: () => () => gesture });
  const mocks = {
    react: { useState: initial => { const slot = index++; if (!(slot in states)) states[slot] = typeof initial === 'function' ? initial() : initial; return [states[slot], value => { states[slot] = typeof value === 'function' ? value(states[slot]) : value; }]; }, useEffect() {}, useCallback: fn => fn, useMemo: fn => fn() },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { View: 'View', Pressable: 'Pressable', Animated: { Value: class {}, View: 'AnimatedView' }, useWindowDimensions: () => ({ width, fontScale: 1 }) },
    'react-native-gesture-handler': { Gesture: { Pan: () => gesture }, GestureDetector: 'GestureDetector', GestureHandlerRootView: 'Root' },
    'expo-router': { router: { push: target => calls.push(target) } },
    '@/features/hub/provider': { usePalette: () => ({}), useHub: () => ({ state: { events: [{ id: 'plan', title: 'Noche de cine', category: 'movie', date: '2026-11-12' }] } }) },
    '@/features/hub/model': require('../src/features/hub/model.ts'),
    '@/features/hub/calendar-agenda': require('../src/features/hub/calendar-agenda.ts'),
    '@/features/hub/layout': require('../src/features/hub/layout.ts'),
    '@/hooks/use-reduced-motion': { useReducedMotion: () => true },
    '@/constants/hub-design': { hubType: { metadata: {} } },
  };
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : ['2026-11-10T12:00:00Z'])); } }
  mocks['@/hooks/use-view-state'] = { useViewState: (_, initial) => mocks.react.useState(initial) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/(tabs)/calendar.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, Date: FixedDate, require: name => mocks[name] || components });
  const all = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(all)];
  return { calls, all, render: () => { index = 0; return all(exports.default()); } };
}

test('elegir un dia mantiene el detalle y la fecha de crear un plan', () => {
  const screen = calendar(); let nodes = screen.render();
  nodes.find(n => n.type === 'Pressable' && n.props.accessibilityLabel?.includes('12 de noviembre de 2026')).props.onPress();
  nodes = screen.render();
  assert.ok(nodes.some(n => n.props?.accessibilityLabel === 'Editar Noche de cine'));
  const page = nodes.find(n => n.type === 'Screen');
  page.props.action.props.onPress();
  assert.equal(screen.calls[0].params.date, '2026-11-12');
  assert.equal(screen.calls[0].params.kind, 'event');
});

test('navegacion de mes y filtros siguen funcionando en movil y escritorio', () => {
  for (const width of [390, 1100, 1440]) {
    const screen = calendar(width); let nodes = screen.render();
    const heading = nodes.find(n => n.type === 'CalendarHeading');
    assert.equal(heading.props.large, width >= 1200);
    heading.props.onChange(new Date(2026, 11, 1));
    nodes = screen.render();
    assert.equal(nodes.find(n => n.type === 'CalendarHeading').props.month.getMonth(), 11);
    nodes.find(n => n.type === 'IconAction' && n.props.expanded === false).props.onPress();
    nodes = screen.render();
    assert.ok(nodes.some(n => n.type === 'Chips'));
    nodes.find(n => n.type === 'Chips').props.onChange('movie');
    nodes = screen.render();
    assert.equal(nodes.find(n => n.type === 'Chips').props.value, 'movie');
  }
});
