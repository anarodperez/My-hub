const { test } = require('node:test');
const assert = require('node:assert/strict');
const { decodeState, emptyState } = require('../src/features/hub/model.ts');
test('canción opcional, persistencia y enlaces seguros', () => {
  assert.deepEqual(decodeState(JSON.stringify(emptyState)), emptyState);
  const song = { title: 'Mi canción', artist: 'Mi artista', coverUrl: '', link: 'https://open.spotify.com/track/example' };
  assert.deepEqual(decodeState(JSON.stringify({ ...emptyState, song })).song, song);
  for (const invalid of [{ ...song, title: '' }, { ...song, artist: null }, { ...song, link: 'javascript:alert(1)' }]) {
    assert.throws(() => decodeState(JSON.stringify({ ...emptyState, song: invalid })));
  }
});
