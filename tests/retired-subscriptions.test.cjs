const { test } = require('node:test');
const assert = require('node:assert/strict');
const { decodeState, emptyState } = require('../src/features/hub/model.ts');
const { buildImportEntries } = require('../src/features/hub/import-local.ts');
const { purgeRetiredSubscriptions } = require('../src/features/hub/storage.ts');

test('leer datos antiguos descarta suscripciones sin perder calendario ni preferencias', () => {
  const events = [{ id: 'event', title: 'Cine', category: 'movie', date: '2026-10-25' }];
  const state = decodeState(JSON.stringify({ ...emptyState, events, subscriptions: [{ old: 'obsolete' }] }));
  assert.equal('subscriptions' in state, false);
  assert.deepEqual(state.events, events);
  assert.deepEqual(state.preferences, emptyState.preferences);
  assert.ok(!buildImportEntries(state).some(entry => entry.kind === 'subscription'));
});

test('limpieza elimina solo suscripciones de los respaldos y caches de la app', async () => {
  const data = new Map([
    ['my-hub:v1', JSON.stringify({ ...emptyState, subscriptions: [{ name: 'Old' }] })],
    ['my-hub:account:user', JSON.stringify({ ...emptyState, subscriptions: [] })],
    ['my-hub:account:damaged', '{invalid'],
    ['another-app', JSON.stringify({ subscriptions: ['keep'] })],
  ]);
  const storage = { getAllKeys: async () => [...data.keys()], getItem: async key => data.get(key), setItem: async (key, value) => data.set(key, value) };
  await purgeRetiredSubscriptions(storage);
  await purgeRetiredSubscriptions(storage);
  assert.deepEqual(JSON.parse(data.get('my-hub:v1')), emptyState);
  assert.deepEqual(JSON.parse(data.get('my-hub:account:user')), emptyState);
  assert.equal(data.get('my-hub:account:damaged'), '{invalid');
  assert.deepEqual(JSON.parse(data.get('another-app')), { subscriptions: ['keep'] });
  await assert.rejects(purgeRetiredSubscriptions({ ...storage, getItem: async () => '{"subscriptions":[]}', setItem: async () => { throw new Error('disk'); } }), /disk/);
});
