const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { emptyState } = require('../src/features/hub/model.ts');

function harness(path, hub, additional = {}) {
  let index = 0;
  const slots = [], effects = [], navigation = [];
  const react = {
    useState(initial) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = index++; return slots[i] ||= { current: initial }; },
    useEffect(effect, deps) { const i = index++; if (!slots[i] || deps.some((value, j) => !Object.is(value, slots[i][j]))) { slots[i] = deps; effects.push(effect); } },
  };
  const components = new Proxy({}, { get: (_, name) => name });
  const mocks = {
    react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { ...components, View: 'View', Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator', Animated: { View: 'Animated.View', Value: class { stopAnimation() {} setValue() {} } } },
    'expo-router': { router: { push: next => navigation.push(next) } },
    '@/features/hub/provider': { useHub: () => hub, usePalette: () => ({}) },
    '@/hooks/use-reduced-motion': { useReducedMotion: () => true },
    '@/hooks/use-view-state': { useViewState: (_, initial) => react.useState(initial) },
    '@/features/hub/model': require('../src/features/hub/model.ts'),
    '@/features/hub/wishlist-collections': require('../src/features/hub/wishlist-collections.ts'),
    ...additional,
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: name => mocks[name] || components });
  const all = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(all)];
  return { navigation, effects, render(name, props) { index = 0; return all(exports[name](props)); }, flush() { return effects.splice(0).map(effect => effect()); } };
}

test('una recomendación abre un borrador en el grupo elegido sin publicar', async () => {
  let publications = 0;
  const h = harness('src/components/recommendation-plan-action.tsx', { repository: { listGroups: async () => [{ id: 'group-a', name: 'Amigas' }], createGroupPost: () => publications++ } });
  const props = { title: 'Cine', description: 'Una película juntas' };
  let nodes = h.render('RecommendationPlanAction', props);
  nodes.find(n => n.type === 'IconAction').props.onPress();
  nodes = h.render('RecommendationPlanAction', props); h.flush();
  await new Promise(setImmediate);
  nodes = h.render('RecommendationPlanAction', props);
  nodes.find(n => n.type === 'Action').props.onPress();
  assert.equal(h.navigation[0].pathname, '/group-post');
  assert.equal(h.navigation[0].params.groupId, 'group-a');
  assert.equal(h.navigation[0].params.title, props.title);
  assert.equal(h.navigation[0].params.description, props.description);
  assert.equal(publications, 0);
});

test('guardar bloquea dobles clics y confirma solo después de persistir', async () => {
  let resolve, calls = 0;
  const hub = { state: emptyState, update: change => { calls++; return new Promise(done => { resolve = () => { hub.state = change(hub.state); done(); }; }); } };
  const h = harness('src/components/save-recommendation.tsx', hub);
  let nodes = h.render('SaveRecommendation', { id: 'book-a' }); h.flush();
  const save = nodes.find(n => n.type === 'IconAction').props.onPress;
  save(); save();
  nodes = h.render('SaveRecommendation', { id: 'book-a' });
  assert.equal(calls, 1);
  assert.equal(nodes.find(n => n.type === 'IconAction').props.disabled, true);
  assert.equal(nodes.some(n => n.type === 'Pressable'), false);
  resolve(); await new Promise(setImmediate);
  nodes = h.render('SaveRecommendation', { id: 'book-a' });
  assert.equal(nodes.find(n => n.type === 'IconAction').props.disabled, false);
  assert.equal(nodes.find(n => n.type === 'Copy').props.children, 'Guardado');
  nodes.find(n => n.type === 'Pressable').props.onPress();
  nodes = h.render('SaveRecommendation', { id: 'book-a' });
  nodes.find(n => n.type === 'WishCollectionPicker').props.onChange('gifts');
  resolve(); await new Promise(setImmediate);
  assert.equal(hub.state.wishlistOrganization.assignments['saved:book-a'], 'gifts');
});

test('la guía usa progreso real y se oculta cuando se completa', () => {
  const hub = { state: { ...emptyState, saved: [{ recommendationId: 'a', status: 'pending' }] } };
  const h = harness('src/components/getting-started.tsx', hub);
  let nodes = h.render('GettingStarted', { hasGroup: true, hasPlan: false });
  assert.equal(nodes.find(n => n.props.accessibilityRole === 'progressbar').props.accessibilityValue.now, 2);
  assert.equal(nodes.filter(n => n.type === 'TextAction').length, 1);
  nodes.find(n => n.type === 'TextAction').props.onPress();
  assert.equal(h.navigation[0].params.kind, 'event');
  assert.equal(h.render('GettingStarted', { hasGroup: true, hasPlan: true }).length, 0);
});
