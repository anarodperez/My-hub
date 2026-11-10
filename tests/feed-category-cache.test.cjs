const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('volver a una categoría conserva páginas y revalida permisos sin cruzar cuentas', async () => {
  let index = 0, effects = [], revoked = false;
  const slots = [], calls = [], validations = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    useState(initial) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = index++; return slots[i] ||= { current: initial }; },
    useCallback(callback, deps) { const i = index++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, callback }; return slots[i].callback; },
    useEffect(effect, deps) { const i = index++; if (!same(slots[i]?.deps, deps)) { const previous = slots[i]; slots[i] = { deps }; effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = effect(); }); } },
  };
  const repository = accountId => ({ accountId,
    async listDiscoveries(cursor, limit, category) { calls.push({ accountId, category, cursor }); return Array.from({ length: cursor || category === 'movie' ? 1 : 20 }, (_, i) => ({ id: `${accountId}-${category}-${cursor ? 'next' : i}`, createdAt: '2026-11-10T12:00:00Z' })); },
    async getSavedRecommendations(ids) { validations.push(ids); return ids.filter(id => !revoked || !id.endsWith('-0')).map(id => ({ id, createdAt: '2026-11-10T12:00:00Z' })); },
  });
  const hub = { repository: repository('a'), media: {}, loading: false, error: '', needsImport: false };
  const mocks = { react, 'expo-router': { useFocusEffect: callback => react.useEffect(callback, [callback]) }, '@/features/hub/provider': { useHub: () => hub }, '@/features/hub/feed': require('../src/features/hub/feed.ts'), '@/features/hub/cloud-state': { hydrateRecommendations: async (_, __, rows) => rows } };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/use-discovery-feed.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: name => mocks[name] });
  const render = category => { index = 0; const value = exports.useDiscoveryFeed(category); const pending = effects; effects = []; pending.forEach(effect => effect()); return value; };
  render('book'); await new Promise(setImmediate);
  render('book').loadMore(); await new Promise(setImmediate);
  assert.equal(render('book').items.length, 21);
  render('movie'); await new Promise(setImmediate);
  revoked = true;
  assert.equal(render('book').items.length, 21);
  await new Promise(setImmediate);
  assert.equal(render('book').items.length, 20);
  assert.equal(calls.filter(call => call.category === 'book').length, 2);
  assert.equal(validations.length, 1);
  hub.repository = repository('b');
  assert.equal(render('book').items.length, 0);
  await new Promise(setImmediate);
  assert.ok(render('book').items.every(item => item.id.startsWith('b-')));
});
