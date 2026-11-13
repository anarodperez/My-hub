const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('src/components/hub-ui.tsx', 'utf8');
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };

test('primary add actions expose their name; compact actions keep the accessible label', () => {
  const exports = {}, calls = [];
  const component = source.slice(source.indexOf('export function AddAction'), source.indexOf('export function showError'));
  vm.runInNewContext(ts.transpileModule(component, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, require: () => jsx, usePalette: () => ({}), Action: 'Action', IconAction: 'IconAction', View: 'View', PlusIcon: 'Plus',
  });
  const normal = exports.AddAction({ label: 'A\u00f1adir deseo', onPress: () => calls.push('add') });
  assert.equal(normal.type, 'Action'); assert.equal(normal.props.children, 'A\u00f1adir deseo');
  normal.props.onPress(); assert.deepEqual(calls, ['add']);
  const compact = exports.AddAction({ label: 'Evento', compact: true, onPress() {} });
  assert.equal(compact.type, 'IconAction'); assert.equal(compact.props.label, 'A\u00f1adir evento');
});

test('category chips retain selected state and filtering with category icons', () => {
  const exports = {}, calls = [];
  const component = source.slice(source.indexOf('export function Chips'), source.indexOf('export function Field'));
  const categories = [{ value: 'book', label: 'Libros' }, { value: 'movie', label: 'Pel\u00edculas' }];
  vm.runInNewContext(ts.transpileModule(component, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, require: () => jsx, usePalette: () => ({}), categories, recommendationCategories: categories,
    ScrollView: 'ScrollView', Pressable: 'Pressable', View: 'View', Copy: 'Copy', CategoryIcon: 'CategoryIcon', s: {},
  });
  const tree = exports.Chips({ value: 'book', onChange: value => calls.push(value), all: true });
  const tabs = tree.props.children;
  assert.equal(tabs.length, 3); assert.equal(tabs[1].props.accessibilityState.selected, true);
  assert.equal(tabs[1].props.accessibilityRole, 'tab');
  tabs[2].props.onPress(); assert.deepEqual(calls, ['movie']);
  assert.equal(tabs[1].props.children.props.children[0].type, 'CategoryIcon');
});
