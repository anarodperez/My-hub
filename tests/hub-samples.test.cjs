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

const { addPreviewExamples } = require('../src/features/hub/samples.ts');
test('contenido de prueba se agrega una vez, conserva datos y no reaparece al borrarlo', () => {
 const current = { ...emptyState, wishes: [{ id: 'personal', title: 'Mi deseo', category: 'book', coverUrl: '', completed: false }] };
 const seeded = addPreviewExamples(current);
 assert.ok(seeded.wishes.length >= 11);
 assert.equal(seeded.wishes.find(w => w.id === 'personal'), current.wishes[0]);
 assert.equal(new Set(seeded.wishes.map(w => w.category)).size, 5);
 assert.ok(seeded.wishes.some(w => w.completed));
 assert.ok(seeded.saved.some(w => w.status === 'pending'));
 assert.deepEqual(decodeState(JSON.stringify(seeded)), seeded);
 assert.equal(addPreviewExamples(seeded), seeded);
 const removed = { ...seeded, wishes: [] };
 assert.equal(addPreviewExamples(removed), removed);
});

const { improvePreviewPhotos } = require('../src/features/hub/samples.ts');
test('fotos reales completan ejemplos existentes sin tocar fotos personales ni reinsertar borrados', () => {
 const initial = addPreviewExamples(emptyState);
 const custom = { ...initial, wishes: initial.wishes.map(w => w.id === 'preview-wish-0' ? { ...w, coverUrl: 'file:///personal.jpg' } : w).filter(w => w.id !== 'preview-wish-9') };
 const updated = improvePreviewPhotos(custom);
 assert.ok(updated.wishes.every(w => w.coverUrl));
 assert.equal(updated.wishes[0].coverUrl, 'file:///personal.jpg');
 assert.equal(updated.wishes.length, custom.wishes.length);
 assert.equal(improvePreviewPhotos(updated), updated);
 assert.deepEqual(decodeState(JSON.stringify(updated)), updated);
});
