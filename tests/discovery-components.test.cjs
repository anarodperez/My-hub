const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function component(file, name, props) {
  const exports = {};
  const components = new Proxy({}, { get: (_, key) => key });
  const mocks = {
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { View: 'View' }, '@/features/hub/provider': { usePalette: () => ({}) },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: name => mocks[name] || components });
  const tree = exports[name](props);
  const all = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(all)];
  return { tree, nodes: all(tree) };
}

test('rating summary preserves half stars and communicates the actual rating', () => {
  for (const [value, full, half] of [[0.5, 0, 1], [3.5, 3, 1], [5, 5, 0]]) {
    const { tree, nodes } = component('src/components/rating-summary.tsx', 'RatingSummary', { value });
    assert.equal(tree.props.accessibilityLabel, `${value.toLocaleString('es-ES')} de 5 estrellas`);
    assert.equal(nodes.filter(node => node.type === 'StarIcon' && node.props.weight === 'fill').length, full);
    assert.equal(nodes.filter(node => node.type === 'StarHalfIcon').length, half);
    assert.equal(nodes.filter(node => node.type === 'StarIcon' || node.type === 'StarHalfIcon').length, 5);
  }
});

test('comment bubbles preserve ownership, disabled deletion and legacy attachment feedback', () => {
  const comment = { id: 'c', body: 'Me encanta', created_at: '2026-11-11T12:00:00Z' };
  let removed = false;
  const props = { comment, authorName: 'Ana', own: true, busy: true, onRemove: () => { removed = true; } };
  let result = component('src/components/discovery-comment.tsx', 'DiscoveryComment', props);
  const remove = result.nodes.find(node => node.type === 'IconAction');
  assert.equal(remove.props.disabled, true);
  assert.equal(remove.props.label, 'Eliminar mi comentario');
  remove.props.onPress(); assert.equal(removed, true);
  result = component('src/components/discovery-comment.tsx', 'DiscoveryComment', { ...props, own: false, comment: { ...comment, body: '', gif_path: 'old.gif' } });
  assert.equal(result.nodes.some(node => node.type === 'IconAction'), false);
  assert.ok(result.nodes.some(node => node.type === 'Copy' && node.props.children === 'Adjunto antiguo no disponible'));
});
