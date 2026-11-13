const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function render({ width = 1440, busy = false, plan = true } = {}) {
  const exports = {}; let closed = 0;
  const components = new Proxy({}, { get: (_, key) => key });
  const mocks = {
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { View: 'View', Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: 'web' }, useWindowDimensions: () => ({ width }) },
    '@/features/hub/provider': { usePalette: () => ({}) }, '@/hooks/use-reduced-motion': { useReducedMotion: () => false },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(plan ? 'src/components/form-dialog.tsx' : 'src/components/group-post-frame.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: name => mocks[name] || components });
  const tree = (plan ? exports.FormDialog : exports.GroupPostFrame)({ plan, busy, groupName: 'Amigas', children: 'Formulario', onClose: () => closed++ });
  return { tree, get closed() { return closed; } };
}

test('la propuesta es modal con cierre y animacion segun pantalla', () => {
  for (const width of [390, 1440]) {
    const view = render({ width });
    assert.equal(view.tree.type, 'Modal');
    assert.equal(view.tree.props.transparent, true);
    assert.equal(view.tree.props.animationType, width < 700 ? 'slide' : 'fade');
    view.tree.props.onRequestClose();
    assert.equal(view.closed, 1);
  }
});

test('no cierra durante la publicacion y regalos sigue siendo una pantalla', () => {
  const publishing = render({ busy: true });
  publishing.tree.props.onRequestClose();
  assert.equal(publishing.closed, 0);
  const gift = render({ plan: false });
  assert.equal(gift.tree.type, 'Screen');
  assert.equal(gift.tree.props.title, 'Compartir algo');
  assert.equal(gift.tree.props.children, 'Formulario');
});
