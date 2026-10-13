const { test } = require('node:test');
const assert = require('node:assert/strict');
const { addExamples } = require('../src/features/hub/samples.ts');
const { emptyState, decodeState } = require('../src/features/hub/model.ts');

test('añade cafetería y vela una vez sin tocar los datos existentes', () => {
  const personal = { id: 'mine', title: 'Mi libro', category: 'book', opinion: 'Mi opinión', rating: 5, coverUrl: '', createdAt: '2026-10-13T12:00:00Z' };
  const current = { ...emptyState, recommendations: [personal], preferences: { name: 'Ana', theme: 'dark' } };
  const seeded = addExamples(current);
  assert.equal(seeded.recommendations.length, 3);
  assert.deepEqual(seeded.recommendations.find((item) => item.id === 'mine'), personal);
  assert.deepEqual(seeded.preferences, current.preferences);
  assert.equal(seeded.recommendations.filter((item) => item.sample).length, 2);
  assert.deepEqual(decodeState(JSON.stringify(seeded)), seeded);
  assert.deepEqual(addExamples(seeded), seeded);
  const removed = { ...seeded, recommendations: [personal] };
  assert.deepEqual(addExamples(removed), removed);
});
