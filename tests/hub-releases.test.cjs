const { test } = require('node:test');
const assert = require('node:assert/strict');
const { addRomantasyReleases, romantasyReleases } = require('../src/features/hub/releases.ts');
const { emptyState, decodeState } = require('../src/features/hub/model.ts');

test('importa publicaciones una vez conservando eventos y preferencias', () => {
  const personal = { id: 'personal', title: 'Mi plan', category: 'book', date: '2026-10-29' };
  const current = { ...emptyState, events: [personal, romantasyReleases[0]] };
  const imported = addRomantasyReleases(current);
  assert.equal(imported.events.length, 5);
  assert.deepEqual(imported.events[0], personal);
  assert.deepEqual(imported.preferences, current.preferences);
  assert.deepEqual(decodeState(JSON.stringify(imported)), imported);
  assert.equal(addRomantasyReleases(imported), imported);
  const removed = { ...imported, events: [personal] };
  assert.equal(addRomantasyReleases(removed), removed);
  assert.ok(romantasyReleases.every((event) => event.date > '2026-10-13'));
});
