const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function picker(props = {}) {
  let index = 0, value = '2026-11-11';
  const states = [], changes = [], exports = {};
  const components = new Proxy({}, { get: (_, key) => key });
  const mocks = {
    react: { useState: initial => { const slot = index++; if (!(slot in states)) states[slot] = typeof initial === 'function' ? initial() : initial; return [states[slot], next => { states[slot] = typeof next === 'function' ? next(states[slot]) : next; }]; } },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { View: 'View', Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView' },
    '@/features/hub/model': require('../src/features/hub/model.ts'),
    '@/features/hub/provider': { usePalette: () => ({}) },
    '@/hooks/use-reduced-motion': { useReducedMotion: () => true },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/plan-date-field.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: name => mocks[name] || components });
  const all = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(all)];
  return { changes, render: () => { index = 0; return all(exports.PlanDateField({ value, onChange: date => { value = date; changes.push(date); }, ...props })); } };
}

test('la fecha elegida se muestra legible y el selector conserva su mes', () => {
  const view = picker(); let nodes = view.render();
  const trigger = nodes.find(n => n.props?.accessibilityLabel?.startsWith('Fecha del plan:'));
  assert.match(trigger.props.accessibilityLabel, /11 de noviembre/);
  trigger.props.onPress();
  nodes = view.render();
  assert.equal(nodes.find(n => n.type === 'CalendarHeading').props.month.getMonth(), 10);
  nodes.find(n => n.props?.accessibilityLabel?.includes('13 de noviembre de 2026')).props.onPress();
  assert.deepEqual(view.changes, ['2026-11-13']);
  assert.equal(view.render().find(n => n.type === 'Modal').props.visible, false);
});

test('se puede dejar un plan sin fecha', () => {
  const view = picker(); let nodes = view.render();
  nodes.find(n => n.props?.accessibilityLabel?.startsWith('Fecha del plan:')).props.onPress();
  nodes = view.render();
  nodes.find(n => n.type === 'TextAction').props.onPress();
  assert.deepEqual(view.changes, ['']);
  assert.equal(view.render().find(n => n.type === 'Modal').props.visible, false);
});

test('los eventos obligatorios no ofrecen quitar su fecha', () => {
  const view = picker({ required: true, fieldLabel: 'Fecha del evento' });
  const nodes = view.render();
  assert.ok(nodes.some(n => n.props?.accessibilityLabel?.startsWith('Fecha del evento:')));
  assert.ok(!nodes.some(n => n.type === 'TextAction'));
});
