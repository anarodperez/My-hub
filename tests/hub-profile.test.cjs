const { test } = require('node:test');
const assert = require('node:assert/strict');
const { decodeState, emptyState } = require('../src/features/hub/model.ts');
test('foto de perfil opcional se conserva sin alterar datos anteriores', () => {
  assert.deepEqual(decodeState(JSON.stringify(emptyState)), emptyState);
  const state = { ...emptyState, preferences: { name: 'Ana', theme: 'light', avatarUri: 'file:///documents/profile.jpg' } };
  assert.deepEqual(decodeState(JSON.stringify(state)), state);
  assert.throws(() => decodeState(JSON.stringify({ ...state, preferences: { ...state.preferences, avatarUri: 3 } })));
});
