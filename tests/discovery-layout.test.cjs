const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

async function discovery(width, fontScale = 1, coverUrl = '') {
  let index = 0;
  const slots = [], effects = [], exports = {};
  const components = new Proxy({}, { get: (_, key) => key });
  const post = { id: 'p', title: 'Nuestra lectura', opinion: 'Una recomendaci\u00f3n real', category: 'book', rating: 5, ownerId: 'me', createdAt: '2026-11-11', coverUrl };
  const repository = { accountId: 'me', getDiscovery: async () => ({ owner_id: 'me' }), listComments: async () => [], author: async () => ({ id: 'me', name: 'Ana' }) };
  const mocks = {
    react: {
      useState(initial) { const i = index++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
      useRef(initial) { const i = index++; return slots[i] ||= { current: initial }; }, useEffect: effect => effects.push(effect),
    },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { View: 'View', StyleSheet: { create: value => value }, useWindowDimensions: () => ({ width, fontScale }) },
    'expo-router': { useLocalSearchParams: () => ({ id: 'p' }) },
    '@/features/hub/provider': { useHub: () => ({ repository, media: {} }), usePalette: () => ({}) },
    '@/features/hub/cloud-state': { mapRecommendation: async () => post },
    '@/features/hub/model': { recommendationCategories: [{ value: 'book', singular: 'Libro' }] },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/discovery/[id].tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: name => mocks[name] || components });
  const all = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(all)];
  const render = () => { index = 0; const tree = exports.default(); return { tree, nodes: all(tree) }; };
  render(); effects.splice(0).forEach(effect => effect()); await new Promise(setImmediate);
  return { render };
}

test('discovery uses available desktop width and stacks on mobile or enlarged text', async () => {
  for (const [width, fontScale, direction] of [[1440, 1, 'row'], [390, 1, 'column'], [1440, 1.6, 'column']]) {
    const screen = await discovery(width, fontScale);
    const { tree, nodes } = screen.render();
    assert.equal(tree.props.wide, true);
    assert.equal(tree.props.contentStyle.maxWidth, undefined, 'wide detail must not reintroduce centered side gutters');
    const layout = tree.props.children[0];
    assert.equal(layout.props.style.flexDirection, direction);
    assert.equal(layout.props.children[1].props.style[1].width, direction === 'row' ? 360 : '100%');
    assert.equal(nodes.some(node => node.type === 'LoadingImage'), false);
    assert.ok(nodes.some(node => node.type === 'Copy' && node.props.children === 'Nuestra lectura'));
    assert.equal(nodes.find(node => node.type === 'RecommendationPlanAction').props.showLabel, true);
    assert.equal(nodes.find(node => node.type === 'ShareDiscovery').props.showLabel, true);
  }
});

test('a failed cover disappears without losing the discovery or conversation', async () => {
  const screen = await discovery(1440, 1, 'https://example.com/cover.jpg');
  const cover = screen.render().nodes.find(node => node.type === 'LoadingImage');
  assert.equal(cover.props.contentFit, 'contain');
  cover.props.onError();
  const { nodes } = screen.render();
  assert.equal(nodes.some(node => node.type === 'LoadingImage'), false);
  assert.ok(nodes.some(node => node.type === 'Field'));
  assert.ok(nodes.some(node => node.type === 'Copy' && node.props.children === 'Nuestra lectura'));
});
