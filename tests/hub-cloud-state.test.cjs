const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applyCloudChange, loadCloudState } = require('../src/features/hub/cloud-state.ts');
const { emptyState } = require('../src/features/hub/model.ts');
const owner = '10000000-0000-4000-8000-000000000001';
const post = { id: '20000000-0000-4000-8000-000000000001', ownerId: owner, revision: 2, title: 'Libro', category: 'book', opinion: 'Me gusta', rating: 5, coverUrl: 'https://signed.example/cover', coverPath: owner + '/post/cover.jpg', createdAt: '2026-10-14T12:00:00Z', visibility: 'group', groupId: '30000000-0000-4000-8000-000000000001' };
const media = { upload: async () => { throw new Error('Unexpected upload'); } };

test('converting a moment reuses its stored cover instead of uploading or saving a signed URL', async () => {
  const moment = { category: 'book', title: 'Libro', status: 'current', coverUrl: 'https://signed.example/new-token', coverPath: post.coverPath };
  const before = { ...emptyState, moments: [moment] };
  const writes = [];
  const result = await applyCloudChange(before, { ...before, moments: [], recommendations: [{ ...post, fromMoment: 'book', visibility: 'private', groupId: undefined }] }, {
    accountId: owner,
    saveRecommendation: async input => { writes.push(input); return { ...input, id: post.id, owner_id: owner, revision: 1 }; },
    savePreferences: async () => ({ id: owner, revision: 2 }),
  }, media, { id: owner, revision: 1 });
  assert.equal(writes[0].cover_path, post.coverPath);
  assert.deepEqual(result.state.moments, []);
  assert.equal(result.state.recommendations[0].coverPath, post.coverPath);
  assert.equal(Object.hasOwn(result.state.recommendations[0], 'fromMoment'), false);
});

test('conversion retry retains an existing cover path after a different moment replaces the source', async () => {
  const before = { ...emptyState, recommendations: [{ ...post, coverUrl: 'https://signed.example/refreshed' }], moments: [{ category: 'book', title: 'Libro nuevo', status: 'current', coverUrl: 'https://signed.example/replacement', coverPath: 'new-path' }] };
  const writes = [];
  await applyCloudChange(before, { ...before, recommendations: [{ ...post, fromMoment: 'book', coverUrl: 'https://signed.example/initial' }] }, {
    accountId: owner, saveRecommendation: async input => { writes.push(input); return { ...input, id: post.id, owner_id: owner, revision: 3 }; },
  }, media);
  assert.equal(writes[0].id, post.id);
  assert.equal(writes[0].cover_path, post.coverPath);
});

test('a stale conversion never saves an unverified old cover as an expiring URL', async () => {
  const before = { ...emptyState, moments: [] };
  await assert.rejects(applyCloudChange(before, { ...before, recommendations: [{ ...post, fromMoment: 'book' }] }, { accountId: owner }, media), /Mi momento ha cambiado/);
});

test('media cleanup considers moments, songs and stable avatar references', () => {
  const { privateMediaPaths } = require('../src/features/hub/cloud-state.ts');
  const state = { ...emptyState, recommendations: [post], moments: [{ category: 'book', title: 'Libro', status: 'current', coverUrl: 'signed', coverPath: 'moment' }], song: { title: 'Song', artist: 'Artist', coverUrl: 'signed', coverPath: 'song' }, preferences: { ...emptyState.preferences, avatarUri: 'signed', avatarPath: 'avatar' } };
  assert.deepEqual(privateMediaPaths(state), [post.coverPath, 'moment', 'song', 'avatar']);
});

test('avatar replacement returns its stable path without replacing the local preview', async () => {
  const before = { ...emptyState, preferences: { ...emptyState.preferences, avatarUri: 'https://old', avatarPath: 'old' } };
  const writes = [];
  const saved = await applyCloudChange(before, { ...before, preferences: { ...before.preferences, avatarUri: 'file://new' } }, { accountId: owner, saveProfile: async input => writes.push(input) }, { upload: async () => 'new-path' });
  assert.equal(writes[0].avatar_path, 'new-path');
  assert.equal(saved.state.preferences.avatarPath, 'new-path');
  assert.equal(saved.state.preferences.avatarUri, 'file://new');
});

test('colecciones se guardan solas con control de revision y sin tocar deseos', async () => {
  const organization = { collections: [{ id: 'personal', name: 'Para mí' }], assignments: { 'wish:wish-1': 'personal' } };
  const before = { ...emptyState, wishes: [{ id: 'wish-1', title: 'Lámpara', category: 'product', coverUrl: '', completed: false }] };
  const writes = [];
  const saved = await applyCloudChange(before, { ...before, wishlistOrganization: organization }, {
    accountId: owner, savePreferences: async input => { writes.push(input); return { id: owner, revision: 8 }; },
  }, media, { id: owner, revision: 7 });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].revision, 7);
  assert.deepEqual(writes[0].wishlist_organization, organization);
  assert.deepEqual(saved.state.wishes, before.wishes);
  assert.equal(saved.preferences.revision, 8);
});

test('cargar colecciones conserva asignaciones y una cuenta antigua sigue cargando', async () => {
  const organization = { collections: [{ id: 'gifts', name: 'Regalos' }], assignments: {} };
  for (const preferences of [{ wishlist_organization: organization }, undefined]) {
    const { state } = await loadCloudState({ loadPrivate: async () => ({ recommendations: [], wishlist: [], events: [], preferences }),
      listDiscoveries: async () => [], getSavedRecommendations: async () => [], listReactionSummaries: async()=>[], listCommentPreviews: async () => [],
    }, { resolve: async () => '' });
    assert.deepEqual(state.wishlistOrganization, preferences ? organization : undefined);
  }
});
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
