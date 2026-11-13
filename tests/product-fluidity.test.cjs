const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { emptyState } = require('../src/features/hub/model.ts');

function harness(path, hub, additional = {}) {
  let index = 0;
  const slots = [], effects = [], navigation = [], announcements = [];
  const react = {
    useState(initial) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = index++; return slots[i] ||= { current: initial }; },
    useCallback: fn => fn,
    useEffect(effect, deps) { const i = index++; if (!slots[i] || deps.some((value, j) => !Object.is(value, slots[i][j]))) { slots[i] = deps; effects.push(effect); } },
  };
  const components = new Proxy({}, { get: (_, name) => name });
  const mocks = {
    react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { ...components, AccessibilityInfo: { announceForAccessibility: message => announcements.push(message) }, Platform: { OS: 'web' }, StyleSheet: { create: value => value }, useWindowDimensions: () => ({ width: 390, fontScale: 1 }), View: 'View', Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator', Animated: { View: 'Animated.View', Value: class { stopAnimation() {} setValue() {} } } },
    'expo-router': { router: { push: next => navigation.push(next), navigate: next => navigation.push(next) }, useFocusEffect: effect => effects.push(effect) },
    '@/features/hub/provider': { useHub: () => hub, usePalette: () => ({}) },
    '@/hooks/use-reduced-motion': { useReducedMotion: () => true },
    '@/hooks/use-view-state': { useViewState: (_, initial) => react.useState(initial) },
    '@/features/hub/model': require('../src/features/hub/model.ts'),
    '@/features/hub/wishlist-collections': require('../src/features/hub/wishlist-collections.ts'),
    '@/features/hub/moments': require('../src/features/hub/moments.ts'),
    ...additional,
  };
  const exports = {};
  const source = fs.readFileSync(path, 'utf8').replace('function Plans(', 'export function Plans(').replace('function ProfileEditor(', 'export function ProfileEditor(').replace('function MomentEditor(', 'export function MomentEditor(').replace('function Editor(', 'export function Editor(');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: name => mocks[name] || components });
  const all = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(all)];
  return { navigation, effects, announcements, render(name, props) { index = 0; return all(exports[name](props)); }, flush() { return effects.splice(0).map(effect => effect()); } };
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

test('Inicio previews one plan and provides access to the remaining group plans', async () => {
  const plans = [1, 2, 3].map(i => ({ id: String(i), group_id: 'g', title: `Plan ${i}`, owner_id: 'friend', event_date: '2026-11-13', group_post_responses: [] }));
  const h = harness('src/components/home-plans.tsx', { repository: { accountId: 'me', listGroups: async () => [{ id: 'g', name: 'Amigas' }], listUpcomingGroupPlans: async () => plans } });
  h.render('Plans', { refreshKey: 0 }); h.flush(); await new Promise(setImmediate);
  const nodes = h.render('Plans', { refreshKey: 0 });
  assert.equal(nodes.filter(node => node.type === 'Copy' && /^Plan \d$/.test(node.props.children)).length, 1);
  assert.ok(nodes.some(node => node.type === 'Copy' && node.props.children === 'Plan 1'));
  nodes.find(node => node.type === 'TextAction' && node.props.children === 'M\u00e1s planes en mis grupos').props.onPress();
  assert.equal(h.navigation[0], '/friends');
});

test('profile publication and wish counters open their corresponding Library view', () => {
  const hub = { state: { ...emptyState, recommendations: [{ id: 'mine', ownerId: 'me' }, { id: 'other', ownerId: 'friend' }] } };
  const h = harness('src/app/settings.tsx', hub, {
    '@/features/account/provider': { useAccount: () => ({ session: { user: { id: 'me', email: 'ana@example.invalid' } } }) },
    '@/features/account/client': { supabase: null },
  });
  const nodes = h.render('ProfileEditor');
  nodes.find(node => node.props?.accessibilityLabel === '1 publicaciones. Ver lista').props.onPress();
  nodes.find(node => node.props?.accessibilityLabel === '0 deseos. Ver lista').props.onPress();
  assert.equal(h.navigation[0].pathname, '/library'); assert.equal(h.navigation[0].params.view, 'mine');
  assert.equal(h.navigation[1].pathname, '/library'); assert.equal(h.navigation[1].params.view, 'wishlist');
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
  assert.deepEqual(h.announcements, []);
  resolve(); await new Promise(setImmediate);
  nodes = h.render('SaveRecommendation', { id: 'book-a' });
  assert.equal(nodes.find(n => n.type === 'IconAction').props.disabled, false);
  assert.equal(nodes.find(n => n.type === 'Copy').props.children, 'Guardado');
  assert.deepEqual(h.announcements, ['Guardado en tu wishlist']);
  nodes.find(n => n.type === 'Pressable').props.onPress();
  nodes = h.render('SaveRecommendation', { id: 'book-a' });
  nodes.find(n => n.type === 'WishCollectionPicker').props.onChange('gifts');
  resolve(); await new Promise(setImmediate);
  assert.equal(hub.state.wishlistOrganization.assignments['saved:book-a'], 'gifts');
});

test('failed saves never show success or announce a saved wish', async () => {
  let errors = 0;
  const hub = { state: emptyState, update: async () => { throw new Error('Offline'); } };
  const h = harness('src/components/save-recommendation.tsx', hub, { './hub-ui': { Copy: 'Copy', IconAction: 'IconAction', showError: () => errors++ } });
  let nodes = h.render('SaveRecommendation', { id: 'book-a' }); h.flush();
  nodes.find(n => n.type === 'IconAction').props.onPress();
  await new Promise(setImmediate);
  nodes = h.render('SaveRecommendation', { id: 'book-a' });
  assert.equal(errors, 1);
  assert.deepEqual(h.announcements, []);
  assert.equal(nodes.some(n => n.type === 'Pressable'), false);
  assert.equal(nodes.find(n => n.type === 'IconAction').props.disabled, false);
});

test('Mi momento renders only filled slots and offers all four categories', () => {
  const hub = { state: { ...emptyState, moments: [{ category: 'series', title: 'Mi serie', status: 'current', coverUrl: '' }], song: { title: 'Canción', artist: 'Artista', coverUrl: '' } } };
  const h = harness('src/components/moment-media.tsx', hub);
  const nodes = h.render('MomentMedia', {});
  assert.equal(nodes.filter(n => n.type === 'Pressable').length, 1);
  assert.ok(nodes.some(n => n.type === 'MomentSong'));
  assert.ok(nodes.some(n => n.type === 'Copy' && n.props.children === 'Estoy viendo'));
  assert.equal(nodes.find(n => n.type === 'MomentSong').props.compact, true);
  const menu = nodes.find(n => n.type === 'ItemActions');
  assert.equal(menu.props.actions.length, 5);
  menu.props.actions.find(action => action.label === 'Añadir película').onPress();
  assert.equal(h.navigation[0].params.category, 'movie');
});

test('editing and removing a moment preserves the other slots and song', async () => {
  const book = { category: 'book', title: 'Mi libro', status: 'current', coverUrl: '' };
  const hub = { state: { ...emptyState, moments: [book], song: { title: 'Canción', artist: 'Artista', coverUrl: '' } }, update: async change => { hub.state = change(hub.state); } };
  const h = harness('src/app/moment.tsx', hub, { '@/features/hub/navigation': { goBackOr() {} } });
  let nodes = h.render('MomentEditor', { category: 'series' });
  nodes.find(n => n.type === 'Field').props.onChangeText('Mi serie');
  assert.equal(nodes.some(n => n.type === 'ChoiceTabs'), false);
  nodes = h.render('MomentEditor', { category: 'series' });
  nodes.find(n => n.type === 'SaveAction').props.onPress();
  await new Promise(setImmediate);
  assert.equal(hub.state.moments.length, 2);
  assert.equal(hub.state.moments[0].status, 'current');
  assert.equal(hub.state.song.title, 'Canción');
  nodes = h.render('MomentEditor', { category: 'series', existing: hub.state.moments[0] });
  nodes.find(n => n.type === 'TextAction' && n.props.children === 'Quitar de Inicio').props.onPress();
  await new Promise(setImmediate);
  assert.deepEqual(Array.from(hub.state.moments), [book]);
});

test('Mi momento shows one protagonist and switching preserves all saved content', async () => {
  const series = { category: 'series', title: 'Mi serie', status: 'current', coverUrl: '' };
  const book = { category: 'book', title: 'Mi libro', status: 'current', coverUrl: '' };
  const hub = { state: { ...emptyState, moments: [series, book] }, update: async change => { hub.state = change(hub.state); } };
  const h = harness('src/components/moment-media.tsx', hub);
  let nodes = h.render('MomentMedia', {});
  assert.equal(nodes.filter(n => n.type === 'Pressable').length, 1);
  assert.ok(nodes.some(n => n.type === 'Copy' && n.props.children === 'Mi serie'));
  assert.ok(!nodes.some(n => n.type === 'Copy' && n.props.children === 'Mi libro'));
  nodes.find(n => n.type === 'ItemActions').props.actions.find(action => action.label === 'Destacar libro').onPress();
  await new Promise(setImmediate);
  nodes = h.render('MomentMedia', {});
  assert.equal(nodes.filter(n => n.type === 'Pressable').length, 1);
  assert.ok(nodes.some(n => n.type === 'Copy' && n.props.children === 'Mi libro'));
  assert.ok(nodes.some(n => n.type === 'Copy' && n.props.children === 'Estoy leyendo'));
  assert.equal(hub.state.moments.length, 2);
  assert.equal(hub.state.moments[1], series);
});

test('legacy finished content stays recoverable in the menu without appearing as current', () => {
  const hub = { state: { ...emptyState, moments: [{ category: 'book', title: 'Libro terminado', status: 'finished', coverUrl: '' }] } };
  const h = harness('src/components/moment-media.tsx', hub);
  const nodes = h.render('MomentMedia', {});
  assert.equal(nodes.filter(n => n.type === 'Pressable').length, 0);
  assert.ok(nodes.find(n => n.type === 'ItemActions').props.actions.some(action => action.label === 'Revisar libro guardado'));
  assert.equal(hub.state.moments.length, 1);
});

test('conversion drafts reuse title and cover and remove the moment only on save', async () => {
  const moment = { category: 'series', title: 'Mi serie', status: 'current', coverUrl: 'file://saved-local-cover', coverPath: 'owner/profile/cover.webp' };
  const hub = { state: { ...emptyState, moments: [moment] }, update: async change => { hub.state = change(hub.state); } };
  const h = harness('src/app/compose.tsx', hub, { 'expo-crypto': { randomUUID: () => 'converted-id' }, '@/features/hub/navigation': { goBackOr() {} } });
  let nodes = h.render('Editor', { kind: 'recommendation', moment: 'series' });
  assert.equal(nodes.find(n => n.type === 'Field' && n.props.label === 'Título').props.value, moment.title);
  assert.equal(hub.state.moments.length, 1);
  nodes.find(n => n.type === 'Field' && n.props.label === '¿Por qué lo recomiendas?').props.onChangeText('Me ha encantado');
  nodes = h.render('Editor', { kind: 'recommendation', moment: 'series' });
  nodes.find(n => n.type === 'SaveAction').props.onPress();
  await new Promise(setImmediate);
  assert.equal(hub.state.moments.length, 0);
  assert.equal(hub.state.recommendations[0].coverPath, moment.coverPath);
  assert.equal(hub.state.recommendations[0].coverUrl, moment.coverUrl);
  assert.equal(hub.state.recommendations[0].visibility, 'private');
});

test('a failed conversion keeps its draft ID on retry and does not remove a replacement moment', async () => {
  const source = { category: 'book', title: 'Libro anterior', status: 'current', coverUrl: '' };
  const replacement = { ...source, title: 'Libro nuevo' };
  let fail = true, ids = 0;
  const attempted = [];
  const hub = { state: { ...emptyState, moments: [source] }, update: async change => {
    const next = change(hub.state); attempted.push(next.recommendations[0].id);
    if (fail) throw new Error('Offline');
    hub.state = next;
  } };
  const ui = new Proxy({ s: {}, showError() {} }, { get: (target, key) => target[key] || key });
  const h = harness('src/app/compose.tsx', hub, { 'expo-crypto': { randomUUID: () => `draft-${++ids}` }, '@/components/hub-ui': ui, '@/features/hub/navigation': { goBackOr() {} } });
  let nodes = h.render('Editor', { kind: 'recommendation', moment: 'book' });
  nodes.find(n => n.type === 'Field' && n.props.label === '¿Por qué lo recomiendas?').props.onChangeText('Me ha encantado');
  nodes = h.render('Editor', { kind: 'recommendation', moment: 'book' });
  nodes.find(n => n.type === 'SaveAction').props.onPress();
  await new Promise(setImmediate);
  assert.equal(hub.state.moments[0], source);
  fail = false; hub.state = { ...hub.state, moments: [replacement] };
  nodes = h.render('Editor', { kind: 'recommendation', moment: 'book' });
  nodes.find(n => n.type === 'SaveAction').props.onPress();
  await new Promise(setImmediate);
  assert.deepEqual(attempted, ['draft-1', 'draft-1']);
  assert.equal(hub.state.moments[0], replacement);
  assert.equal(hub.state.recommendations[0].title, source.title);
});

test('recommendation form keeps one integrated photo picker and a live preview for every category', () => {
  for (const category of ['book', 'movie', 'series', 'product', 'place']) {
    const h = harness('src/app/compose.tsx', { state: emptyState });
    let nodes = h.render('Editor', { kind: 'recommendation' });
    nodes.find(n => n.type === 'Chips').props.onChange(category);
    nodes = h.render('Editor', { kind: 'recommendation' });
    assert.equal(nodes.filter(n => n.type === 'CoverPicker').length, 1);
    assert.equal(nodes.filter(n => n.type === 'Surface').length, 1);
    assert.equal(nodes.find(n => n.type === 'CoverPicker').props.variant, 'poster');
    nodes.find(n => n.type === 'Field' && n.props.maxLength === 150).props.onChangeText('Un descubrimiento');
    nodes = h.render('Editor', { kind: 'recommendation' });
    assert.equal(nodes.filter(n => n.type === 'Surface').length, 1);
    assert.ok(nodes.some(n => n.type === 'Copy' && n.props.children === 'Un descubrimiento'));
    assert.equal(nodes.find(n => n.type === 'ChoiceTabs').props.value, 'private');
  }
});

test('poster photo picker preserves MIME, replacement, failure feedback and removal', async () => {
  const changes = [], busy = [];
  const h = harness('src/components/cover-picker.tsx', {}, { 'expo-image-picker': { launchImageLibraryAsync: async () => ({ canceled: false, assets: [{ uri: 'blob:chosen', base64: 'PNGDATA', mimeType: 'image/png' }] }) } });
  const props = { uri: '', variant: 'poster', busy: false, onChange: value => changes.push(value), onBusyChange: value => busy.push(value) };
  let nodes = h.render('CoverPicker', props);
  nodes.find(n => n.props?.accessibilityLabel === 'Elegir foto de la galería').props.onPress();
  await new Promise(setImmediate);
  assert.deepEqual(changes, ['data:image/png;base64,PNGDATA']);
  assert.deepEqual(busy, [true, false]);
  const withPhoto = { ...props, uri: changes[0] };
  nodes = h.render('CoverPicker', withPhoto);
  const image = nodes.find(n => n.type === 'LoadingImage');
  assert.equal(image.props.contentFit, 'contain');
  image.props.onError();
  nodes = h.render('CoverPicker', withPhoto);
  assert.ok(nodes.some(n => n.props?.accessibilityRole === 'alert'));
  nodes.find(n => n.props?.accessibilityLabel === 'Quitar foto adjunta').props.onPress();
  assert.equal(changes.at(-1), '');
});

test('compact rating always displays its value and keeps half-star accessible adjustments', () => {
  const changes = [];
  const h = harness('src/components/rating-input.tsx', {});
  const nodes = h.render('RatingInput', { value: 3.5, onChange: value => changes.push(value), onInteractionChange() {} });
  assert.ok(nodes.some(n => n.type === 'Copy' && Array.isArray(n.props.children) && n.props.children[0] === '3,5'));
  const slider = nodes.find(n => n.props?.accessibilityRole === 'adjustable');
  assert.equal(slider.props.accessibilityValue.now, 3.5);
  slider.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
  slider.props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } });
  assert.deepEqual(changes, [4, 3]);
});

test('rating impressions track the selected score and dragging retains half-star precision', () => {
  for (const [value, impression] of [[0.5, 'Mejor pasamos página'], [2.5, 'Teníamos expectativas'], [3, 'Bien, sin hacerle un altar'], [4.5, 'Ya lo estoy recomendando'], [5, 'Mi nueva personalidad']]) {
    const h = harness('src/components/rating-input.tsx', {});
    const nodes = h.render('RatingInput', { value, onChange() {}, onInteractionChange() {} });
    assert.ok(nodes.some(n => n.type === 'Copy' && n.props.children === impression));
  }
  const changes = [], interactions = [];
  const h = harness('src/components/rating-input.tsx', {});
  const nodes = h.render('RatingInput', { value: 3, onChange: value => changes.push(value), onInteractionChange: active => interactions.push(active) });
  const slider = nodes.find(n => n.props?.accessibilityRole === 'adjustable');
  slider.props.onLayout({ nativeEvent: { layout: { width: 300 } } });
  slider.props.onResponderGrant({ nativeEvent: { locationX: 150 } });
  slider.props.onResponderRelease({ nativeEvent: { locationX: 180 } });
  assert.deepEqual(changes, [2.5, 3]);
  assert.deepEqual(interactions, [true, false]);
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


test('reactions persist once, switch and remove without optimistic counts', async () => {
 const calls=[]; let done;
 const repository={setReaction:(id,kind)=>{calls.push(kind);return new Promise(resolve=>{done=()=>resolve({post_id:id,need_count:kind==='need'?1:0,convinced_count:kind==='convinced'?1:0,you_count:0,mine:kind});});}};
 const h=harness('src/components/recommendation-reactions.tsx',{repository},{'@/features/hub/reactions':require('../src/features/hub/reactions.ts')});
 const props={id:'post'};let nodes=h.render('RecommendationReactions',props);h.flush();
 const first=nodes.find(n=>n.type==='Pressable').props.onPress;first();first();assert.equal(calls.length,1);
 nodes=h.render('RecommendationReactions',props);assert.equal(nodes.filter(n=>n.props?.accessibilityState?.selected).length,0);
 done();await new Promise(setImmediate);nodes=h.render('RecommendationReactions',props);
 assert.equal(nodes.find(n=>n.props?.accessibilityState?.selected).props.accessibilityLabel,'Lo necesito, 1');
 nodes.filter(n=>n.type==='Pressable')[1].props.onPress();done();await new Promise(setImmediate);
 nodes=h.render('RecommendationReactions',props);nodes.filter(n=>n.type==='Pressable')[1].props.onPress();done();await new Promise(setImmediate);
 assert.deepEqual(calls,['need','convinced',null]);assert.equal(h.render('RecommendationReactions',props).filter(n=>n.props?.accessibilityState?.selected).length,0);
});
