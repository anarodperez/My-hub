const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function render(members) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/member-stack.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, require: name => ({
      'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
      'react-native': { View: 'View' }, './hub-ui': { Copy: 'Copy' }, '@/features/hub/provider': { usePalette: () => ({}) },
    })[name],
  });
  const tree = exports.MemberStack({ members });
  const all = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(all)];
  return { tree, text: all(tree).filter(node => node.type === 'Copy').map(node => node.props.children) };
}

test('member stack only displays real members and handles empty names', () => {
  assert.equal(render([]).tree, null);
  const { text, tree } = render([{ id: 'a', name: ' Ana Mar\u00eda ' }, { id: 'b', name: '' }]);
  assert.deepEqual(text, ['AM', '?']);
  assert.match(tree.props.accessibilityLabel, /Ana Mar/);
});

test('four initials and an accurate overflow counter keep large groups compact', () => {
  const members = Array.from({ length: 7 }, (_, i) => ({ id: String(i), name: `Amiga ${i}` }));
  const { text, tree } = render(members);
  assert.equal(text.length, 5);
  assert.equal(text.at(-1), '+3');
  assert.match(tree.props.accessibilityLabel, /7/);
});
