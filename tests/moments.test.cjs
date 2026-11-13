const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validMoments } = require('../src/features/hub/moments.ts');
const { emptyState, decodeState } = require('../src/features/hub/model.ts');
const { applyCloudChange, loadCloudState } = require('../src/features/hub/cloud-state.ts');
const owner = '10000000-0000-4000-8000-000000000001';
const series = { category: 'series', title: 'Una serie', status: 'current', coverUrl: '' };

test('moments validate categories, unique slots, titles, status and optional cover', () => {
  assert.equal(validMoments([]), true);
  assert.equal(validMoments([series, { ...series, category: 'movie', status: 'finished' }, { ...series, category: 'book' }]), true);
  assert.equal(validMoments([{ ...series, coverUrl: 'data:image/png;base64,' + 'A'.repeat(5000) }]), true);
  for (const value of [null, {}, [series, series], [{ ...series, title: ' ' }], [{ ...series, category: 'product' }], [{ ...series, status: 'bad' }], [{ ...series, coverUrl: 12 }]]) assert.equal(validMoments(value), false);
  assert.throws(() => decodeState(JSON.stringify({ ...emptyState, moments: [series, series] })), /momento/);
});

test('saving uploads a cover and keeps storage paths rather than signed URLs; clearing persists', async () => {
  const writes = [];
  const repo = { accountId: owner, savePreferences: async input => { writes.push(input); return { id: owner, revision: 3 }; } };
  const media = { upload: async () => `${owner}/profile/cover.jpg` };
  const webCover = 'data:image/png;base64,' + 'A'.repeat(5000);
  const next = decodeState(JSON.stringify({ ...emptyState, moments: [{ ...series, coverUrl: webCover }] }));
  const saved = await applyCloudChange(emptyState, next, repo, media, { id: owner, revision: 2 });
  assert.equal(writes[0].current_media[0].coverUrl, `${owner}/profile/cover.jpg`);
  assert.equal(writes[0].revision, 2);
  assert.equal(saved.state.moments[0].coverUrl, webCover);
  await applyCloudChange(saved.state, { ...saved.state, moments: [] }, repo, media, saved.preferences);
  assert.deepEqual(writes[1].current_media, []);
});

test('load resolves covers and preserves legacy accounts and song data', async () => {
  for (const current_media of [undefined, null, [series]]) {
    const { state } = await loadCloudState({ loadPrivate: async () => ({ recommendations: [], wishlist: [], events: [], preferences: { current_media }, song: { title: 'Canción', artist: 'Artista', cover_path: '', revision: 1 } }), listDiscoveries: async () => [], getSavedRecommendations: async () => [], listCommentPreviews: async () => [] }, { resolve: async value => value ? 'https://signed.example/cover' : '' });
    assert.equal(state.song.title, 'Canción');
    assert.deepEqual(state.moments, current_media ? [{ ...series, coverPath: '' }] : undefined);
  }
});
