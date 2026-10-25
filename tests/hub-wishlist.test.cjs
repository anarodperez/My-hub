const { test } = require('node:test');
const assert = require('node:assert/strict');
const { selectWishlist } = require('../src/features/hub/wishlist.ts');
const { emptyState } = require('../src/features/hub/model.ts');
test('recuenta ambos tipos de deseos sin incluir referencias ausentes', () => {
  const state = { ...emptyState, recommendations: [{ id: 'r', title: 'Libro', category: 'book' }],
    saved: [{ recommendationId: 'r', status: 'pending' }, { recommendationId: 'absent', status: 'pending' }],
    wishes: [{ id: 'w', title: 'Café', category: 'place', completed: true }] };
  const selected = selectWishlist(state, 'pending', 'place');
  assert.deepEqual(selected.counts, { pending: 1, finished: 1 });
  assert.equal(selected.totalForStatus, 1);
  assert.deepEqual(selected.recommendations, []);
  assert.deepEqual(selected.wishes, []);
  assert.equal(selectWishlist(state, 'finished', 'all').wishes[0].id, 'w');
  assert.equal(selectWishlist(state, 'pending', 'all').recommendations[0].id, 'r');
});
test('una wishlist vacía no tiene elementos ni recuentos', () => {
  const selected = selectWishlist(emptyState, 'pending', 'all');
  assert.deepEqual(selected.counts, { pending: 0, finished: 0 });
  assert.equal(selected.totalForStatus, 0);
  assert.deepEqual(selected.wishes, []);
  assert.deepEqual(selected.recommendations, []);
});

const { pickSurprise } = require('../src/features/hub/wishlist.ts');
test('sorteo vacio, unico y sin repeticion consecutiva', () => {
 assert.equal(pickSurprise([], '', () => 0), undefined);
 const options = [{ key: 'wish-a' }, { key: 'saved-a' }, { key: 'wish-b' }];
 assert.equal(pickSurprise(options, '', () => 0).key, 'wish-a');
 assert.equal(pickSurprise(options, 'wish-a', () => 0).key, 'saved-a');
 assert.equal(pickSurprise(options, 'wish-a', () => 0.999).key, 'wish-b');
 assert.equal(pickSurprise([options[0]], 'wish-a', () => 0).key, 'wish-a');
 assert.equal(options.length, 3);
});
