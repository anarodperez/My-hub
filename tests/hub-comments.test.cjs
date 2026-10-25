const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHubRepository } = require('../src/features/hub/repository.ts');
const owner = '10000000-0000-4000-8000-000000000001';
const post = '20000000-0000-4000-8000-000000000001';
const id = '30000000-0000-4000-8000-000000000001';
function client(responses) {
  const calls = [];
  const query = new Proxy({}, { get(_, key) {
    if (key === 'then') return (resolve, reject) => Promise.resolve(responses.shift()).then(resolve, reject);
    return (...args) => { calls.push([key, ...args]); return query; };
  } });
  return { calls, from: (table) => { calls.push(['from', table]); return query; } };
}
test('comentarios conservan emoticonos del teclado sin adjuntos', async () => {
  const body = 'Me encanta 🥰 📚 👩🏽‍💻';
  const row = { id, post_id: post, author_id: owner, body };
  const db = client([{ data: row, error: null }]);
  assert.deepEqual(await createHubRepository(db, owner).addComment(post, id, body), row);
  const payload = db.calls.find(call => call[0] === 'insert')[1];
  assert.equal(payload.body, body);
  assert.equal('gif_path' in payload, false);
});
test('rechaza comentarios vacios o largos antes de contactar el servidor', async () => {
  const db = client([]);
  const repo = createHubRepository(db, owner);
  for (const body of ['', '   ', 'a'.repeat(2001)]) await assert.rejects(repo.addComment(post, id, body), /Texto/);
  assert.equal(db.calls.length, 0);
});
test('reintento del mismo UUID recupera el comentario sin duplicarlo ni cambiar texto', async () => {
  const row = { id, post_id: post, author_id: owner, body: 'Hola' };
  const db = client([{ error: { code: '23505' } }, { data: row, error: null }]);
  assert.deepEqual(await createHubRepository(db, owner).addComment(post, id, ' Hola '), row);
  assert.ok(db.calls.some(call => call[0] === 'eq' && call[1] === 'author_id' && call[2] === owner));
  const conflict = client([{ error: { code: '23505' } }, { data: row, error: null }]);
  await assert.rejects(createHubRepository(conflict, owner).addComment(post, id, 'Otro'), /otro texto/);
});
test('borrar un comentario ajeno o inaccesible no anuncia exito', async () => {
  const db = client([{ data: [], error: null }]);
  await assert.rejects(createHubRepository(db, owner).deleteComment(id), /disponible/);
  assert.ok(db.calls.some(call => call[0] === 'eq' && call[1] === 'author_id' && call[2] === owner));
});
test('paginacion de comentarios rechaza una fecha imposible', async () => {
  const db = client([{ data: [], error: null }]);
  await assert.rejects(createHubRepository(db, owner).listComments(post, { id, created_at: '2026-99-99T00:00:00Z' }), /Cursor/);
});
test('comentario con GIF admite texto vacio y conserva ruta en reintentos', async () => {
  const gif = `${owner}/${id}/image.gif`;
  const row = { id, post_id: post, author_id: owner, body: '', gif_path: gif };
  const db = client([{ data: row, error: null }]);
  assert.deepEqual(await createHubRepository(db, owner).addComment(post, id, '', gif), row);
  assert.equal(db.calls.find(call => call[0] === 'insert')[1].gif_path, gif);
  const conflict = client([{ error: { code: '23505' } }, { data: row, error: null }]);
  await assert.rejects(createHubRepository(conflict, owner).addComment(post, id, '', `${owner}/${id}/other.gif`), /otro/);
  await assert.rejects(createHubRepository(client([]), owner).addComment(post, id, '', 'https://foreign.example/a.gif'), /GIF/);
});
