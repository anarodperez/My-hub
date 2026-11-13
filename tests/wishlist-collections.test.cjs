const { test } = require('node:test');
const assert = require('node:assert/strict');
const { emptyState, decodeState } = require('../src/features/hub/model.ts');
const { selectWishlist } = require('../src/features/hub/wishlist.ts');
const { wishlistOrganization, assignCollection, removeCollection, validOrganization } = require('../src/features/hub/wishlist-collections.ts');

const wish = { id: 'wish-1', title: 'Una lámpara', category: 'product', coverUrl: '', completed: false };
const post = { id: 'post-1', title: 'Libro', category: 'book' };
const state = { ...emptyState, wishes: [wish], recommendations: [post], saved: [{ recommendationId: post.id, status: 'finished' }] };

test('datos anteriores aparecen sin coleccion y ofrecen las dos iniciales', () => {
  assert.deepEqual(wishlistOrganization(state).collections.map(c => c.name), ['Para mí', 'Ideas para regalos']);
  assert.equal(selectWishlist(state, 'pending', 'all', 'unassigned').wishes.length, 1);
  assert.equal(selectWishlist(state, 'pending', 'all', 'personal').wishes.length, 0);
});

test('asignar y mover deseos y guardados conserva elementos y estados', () => {
  let next = assignCollection(state, 'wish:wish-1', 'personal');
  next = assignCollection(next, 'saved:post-1', 'gifts');
  assert.equal(selectWishlist(next, 'pending', 'all', 'personal').counts.pending, 1);
  assert.equal(selectWishlist(next, 'finished', 'all', 'gifts').recommendations[0].id, 'post-1');
  next = assignCollection(next, 'wish:wish-1', 'gifts');
  assert.equal(selectWishlist(next, 'pending', 'all', 'personal').counts.pending, 0);
  assert.deepEqual(next.wishes, state.wishes);
  assert.deepEqual(next.saved, state.saved);
  assert.equal(state.wishlistOrganization, undefined);
});

test('retirar una coleccion conserva sus deseos en sin coleccion', () => {
  const next = removeCollection(assignCollection(state, 'wish:wish-1', 'personal'), 'personal');
  assert.equal(next.wishes.length, 1);
  assert.equal(selectWishlist(next, 'pending', 'all', 'unassigned').wishes.length, 1);
  assert.equal(wishlistOrganization(next).collections.some(c => c.id === 'personal'), false);
});

test('validacion rechaza nombres vacios, duplicados y asignaciones inexistentes', () => {
  assert.equal(validOrganization({ collections: [{ id: 'x', name: ' ' }], assignments: {} }), false);
  assert.equal(validOrganization({ collections: [{ id: 'x', name: 'Casa' }, { id: 'y', name: 'casa' }], assignments: {} }), false);
  assert.equal(validOrganization({ collections: [], assignments: { 'wish:a': 'missing' } }), false);
  assert.throws(() => decodeState(JSON.stringify({ ...emptyState, wishlistOrganization: { collections: [], assignments: { 'wish:a': 'missing' } } })));
  assert.throws(() => assignCollection(state, 'wish:wish-1', 'missing'));
});
