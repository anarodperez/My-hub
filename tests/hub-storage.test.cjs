const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLocalStore } = require('../src/features/hub/storage.ts');

test('guardados consecutivos conservan todos los cambios', async () => {
  let raw = null;
  const store = createLocalStore({ getItem: async () => raw, setItem: async (_, next) => { raw = next; } });
  await store.load();
  await Promise.all([
    store.update((state) => ({ ...state, preferences: { ...state.preferences, name: 'Ana' } })),
    store.update((state) => ({ ...state, preferences: { ...state.preferences, theme: 'dark' } })),
  ]);
  assert.deepEqual(JSON.parse(raw).preferences, { name: 'Ana', theme: 'dark' });
});
test('carga corrupta impide escrituras', async () => {
  let writes = 0;
  const store = createLocalStore({ getItem: async () => '{}', setItem: async () => { writes++; } });
  await assert.rejects(store.load());
  await assert.rejects(store.update((state) => state));
  assert.equal(writes, 0);
});
test('fallo de escritura conserva estado y permite reintento', async () => {
  let fail = true;
  let raw = null;
  const store = createLocalStore({ getItem: async () => raw, setItem: async (_, next) => { if (fail) throw new Error('full'); raw = next; } });
  await store.load();
  await assert.rejects(store.update((state) => ({ ...state, preferences: { ...state.preferences, name: 'No guardado' } })));
  fail = false;
  const state = await store.update((state) => ({ ...state, preferences: { ...state.preferences, theme: 'dark' } }));
  assert.equal(state.preferences.name, '');
  assert.equal(state.preferences.theme, 'dark');
});
