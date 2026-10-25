const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applyCloudChange, loadCloudState } = require('../src/features/hub/cloud-state.ts');
const { emptyState } = require('../src/features/hub/model.ts');
const owner = '10000000-0000-4000-8000-000000000001';
const post = { id: '20000000-0000-4000-8000-000000000001', ownerId: owner, revision: 2, title: 'Libro', category: 'book', opinion: 'Me gusta', rating: 5, coverUrl: 'https://signed.example/cover', coverPath: owner + '/post/cover.jpg', createdAt: '2026-10-14T12:00:00Z', visibility: 'group', groupId: '30000000-0000-4000-8000-000000000001' };
const media = { upload: async () => { throw new Error('Unexpected upload'); } };
test('inicio conserva previews y recuento de publicaciones propias, resuelve autores una vez', async () => {
  const row = { id: post.id, owner_id: owner, revision: 2, title: 'Libro', category: 'book', opinion: 'Me gusta', rating: 5, created_at: post.createdAt };
  const authors = [], batches = [];
  const result = await loadCloudState({
    loadPrivate: async () => ({ recommendations: [row], wishlist: [], events: [] }),
    listDiscoveries: async () => [row], getSavedRecommendations: async () => [],
    listCommentPreviews: async ids => { batches.push(ids); return [{ id: post.id, comments: [{ count: 7 }], comment_preview: [{ id: 'new', author_id: owner, body: 'Último 🥰' }, { id: 'old', author_id: owner, body: 'Anterior' }] }]; },
    author: async id => { authors.push(id); return { name: 'Anarp' }; },
  }, { resolve: async () => '' });
  assert.deepEqual(batches, [[post.id]]);
  assert.deepEqual(authors, [owner]);
  assert.equal(result.state.recommendations[0].commentCount, 7);
  assert.deepEqual(result.state.recommendations[0].commentPreview.map(comment => [comment.body, comment.authorName]), [['Último 🥰', 'Anarp'], ['Anterior', 'Anarp']]);
});
test('editar titulo conserva audiencia y ruta estable de portada, escribe solo la entidad', async () => {
  const before = { ...emptyState, recommendations: [post] };
  const calls = [];
  const repo = { accountId: owner, saveRecommendation: async input => { calls.push(input); return { ...input, owner_id: owner, revision: 3 }; } };
  const result = await applyCloudChange(before, { ...before, recommendations: [{ ...post, title: 'Editado' }] }, repo, media);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cover_path, post.coverPath);
  assert.equal(calls[0].visibility, 'group');
  assert.equal(calls[0].group_id, post.groupId);
  assert.equal(calls[0].revision, 2);
  assert.equal(result.state.recommendations[0].revision, 3);
  assert.equal(before.recommendations[0].title, 'Libro');
});
test('fallo al subir mantiene foto local y no escribe la recomendacion', async () => {
  const before = { ...emptyState, recommendations: [post] };
  const after = { ...before, recommendations: [{ ...post, coverUrl: 'file:///new.jpg' }] };
  let writes = 0;
  await assert.rejects(applyCloudChange(before, after, { accountId: owner, saveRecommendation: async () => { writes++; } }, { upload: async () => { throw new Error('offline'); } }), /offline/);
  assert.equal(writes, 0);
  assert.equal(after.recommendations[0].coverUrl, 'file:///new.jpg');
  assert.equal(before.recommendations[0].coverPath, post.coverPath);
});
test('rechaza editar descubrimiento ajeno antes de subir o escribir', async () => {
  const before = { ...emptyState, recommendations: [{ ...post, ownerId: 'other' }] };
  await assert.rejects(applyCloudChange(before, { ...before, recommendations: [{ ...before.recommendations[0], title: 'Hack' }] }, { accountId: owner }, media), /Solo puedes/);
});
test('quitar guardado no borra la publicacion ni modifica otros datos', async () => {
  const before = { ...emptyState, recommendations: [post], saved: [{ recommendationId: post.id, status: 'pending' }] };
  const removed = [];
  const result = await applyCloudChange(before, { ...before, saved: [] }, { accountId: owner, removeSaved: async id => removed.push(id) }, media);
  assert.deepEqual(removed, [post.id]);
  assert.deepEqual(result.state.recommendations, before.recommendations);
});
