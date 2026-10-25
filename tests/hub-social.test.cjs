const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHubRepository } = require('../src/features/hub/repository.ts');
const owner = '10000000-0000-4000-8000-000000000001';
const group = '20000000-0000-4000-8000-000000000001';
function db(result = { data: [], error: null }) {
  const calls = [];
  const query = new Proxy({}, { get(_, key) {
    if (key === 'then') return (resolve, reject) => Promise.resolve(result).then(resolve, reject);
    return (...args) => { calls.push([key, ...args]); return query; };
  } });
  return { calls, from: table => { calls.push(['from', table]); return query; }, rpc: (name, args) => { calls.push(['rpc', name, args]); return query; } };
}
test('disponibilidad valida fecha, franja y grupo, y fija autor actual', async () => {
  const client = db(); const repo = createHubRepository(client, owner);
  await assert.rejects(repo.setAvailability(group, '2026-02-30', 'morning', true), /fecha/i);
  await assert.rejects(repo.setAvailability(group, '2026-10-25', 'invalid', true), /franja/i);
  await assert.rejects(repo.setAvailability('invalid', '2026-10-25', 'morning', true), /identificador/i);
  assert.equal(client.calls.length, 0);
  await repo.setAvailability(group, '2026-10-25', 'morning', true);
  assert.equal(client.calls.find(c => c[0] === 'upsert')[1].owner_id, owner);
  await repo.setAvailability(group, '2026-10-25', 'morning', false);
  assert.ok(client.calls.some(c => c[0] === 'eq' && c[1] === 'owner_id' && c[2] === owner));
});
test('publicar valida datos y fotos, no acepta autor ajeno', async () => {
  const client = db({ data: { id: group }, error: null }); const repo = createHubRepository(client, owner);
  const input = { newId: group, group_id: group, kind: 'gift', title: ' Libro ', description: 'Lo regalo', cover_path: `${owner}/${group}/${group}/photo.jpeg`, owner_id: group };
  await repo.createGroupPost(input);
  const payload = client.calls.find(c => c[0] === 'insert')[1];
  assert.equal(payload.owner_id, owner); assert.equal(payload.title, 'Libro');
  await assert.rejects(repo.createGroupPost({ ...input, cover_path: `${group}/${group}/x.jpeg` }), /foto/i);
  await assert.rejects(repo.createGroupPost({ ...input, title: ' ' }), /texto/i);
  await assert.rejects(repo.createGroupPost({ ...input, kind: 'public' }), /tipo/i);
  await assert.rejects(repo.createGroupPost({ ...input, kind: 'plan', event_date: 'bad', cover_path: '' }), /fecha/i);
});
test('responder es idempotente y retirar filtra por persona; errores se propagan', async () => {
  const client = db(); const repo = createHubRepository(client, owner);
  await repo.respondToGroupPost(group, true);
  assert.deepEqual(client.calls.find(c => c[0] === 'upsert')[1], { post_id: group, owner_id: owner });
  await repo.respondToGroupPost(group, false);
  assert.ok(client.calls.some(c => c[0] === 'eq' && c[1] === 'owner_id' && c[2] === owner));
  await assert.rejects(createHubRepository(db({ data: null, error: { message: 'offline' } }), owner).respondToGroupPost(group, true), /offline/);
});
test('lecturas de grupo filtran grupo, mes y tipo; limitan publicaciones por pagina', async () => {
  const client = db(); const repo = createHubRepository(client, owner);
  await repo.listAvailability(group, '2026-10-01', '2026-10-31');
  await repo.listGroupPosts(group, 'gift', 30);
  assert.ok(client.calls.some(c => c[0] === 'eq' && c[1] === 'group_id' && c[2] === group));
  assert.ok(client.calls.some(c => c[0] === 'gte' && c[1] === 'available_date' && c[2] === '2026-10-01'));
  assert.ok(client.calls.some(c => c[0] === 'range' && c[1] === 30 && c[2] === 59));
});
test('entregar y borrar no anuncian exito si la fila ya no es propia o cambio', async () => {
  await assert.rejects(createHubRepository(db({ data: null, error: { message: 'El regalo ha cambiado' } }), owner).setGroupGiftStatus(group, 'delivered', 1), /cambiado/i);
  await assert.rejects(createHubRepository(db(), owner).deleteGroupPost(group, 1), /cambiado|disponible/i);
});
test('reservar usa RPC con revision y destinataria validada', async () => {
  const client = db(); const repo = createHubRepository(client, owner);
  await assert.rejects(repo.setGroupGiftStatus(group, 'reserved', 1), /destinataria/i);
  await assert.rejects(repo.setGroupGiftStatus(group, 'reserved', 1, 'invalid'), /identificador/i);
  await assert.rejects(repo.setGroupGiftStatus(group, 'open', 1, owner), /destinataria/i);
  assert.equal(client.calls.length, 0);
  await repo.setGroupGiftStatus(group, 'reserved', 2, owner);
  assert.deepEqual(client.calls[0], ['rpc', 'set_group_gift_state', { target: group, next_status: 'reserved', expected_revision: 2, recipient: owner }]);
});
test('reintentar una publicacion ya creada recupera la misma fila y rechaza cambios', async () => {
  const input = { newId: group, group_id: group, kind: 'plan', title: 'Cine', description: '', event_date: null, cover_path: '' };
  const row = { ...input, id: group, owner_id: owner, group_post_responses: [] }; delete row.newId;
  let reads = 0;
  const duplicate = db({ data: null, error: { code: '23505', message: 'duplicate' } });
  const originalFrom = duplicate.from;
  duplicate.from = table => ++reads === 1 ? originalFrom(table) : db({ data: row, error: null }).from(table);
  assert.equal((await createHubRepository(duplicate, owner).createGroupPost(input)).id, group);
  reads = 0;
  await assert.rejects(createHubRepository(duplicate, owner).createGroupPost({ ...input, title: 'Otro plan' }), /otros datos/);
});
