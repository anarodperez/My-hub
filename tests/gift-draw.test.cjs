const { test } = require('node:test');
const assert = require('node:assert/strict');
const { giftCountdown } = require('../src/features/hub/gift-draw.ts');
const { createHubRepository } = require('../src/features/hub/repository.ts');
const id = '10000000-0000-4000-8000-000000000001';
const now = Date.parse('2026-11-06T12:00:00Z');
test('cuenta atrás distingue días, minutos y cierre sin números negativos', () => {
  assert.equal(giftCountdown(new Date(now + 86400000).toISOString(), now), 'Queda 1 día');
  assert.equal(giftCountdown(new Date(now + 7200000).toISOString(), now), 'Quedan 2 h');
  assert.equal(giftCountdown(new Date(now + 60000).toISOString(), now), 'Queda 1 min');
  assert.equal(giftCountdown(new Date(now + 1).toISOString(), now), 'Menos de 1 min');
  assert.equal(giftCountdown(new Date(now - 1).toISOString(), now), 'Inscripciones cerradas');
});
function client() {
  const calls = [];
  const query = new Proxy({}, { get: (_, key) => key === 'then' ? resolve => resolve({ data: [], error: null }) : (...args) => { calls.push([key, ...args]); return query; } });
  return { calls, from: () => query, rpc: (name, args) => { calls.push(['rpc', name, args]); return query; } };
}
test('regalos validan plazo y planes rechazan un sorteo antes de escribir', async () => {
  const db = client(); const repo = createHubRepository(db, id);
  const gift = { newId: id, group_id: id, kind: 'gift', title: 'Libro', description: '' };
  await assert.rejects(repo.createGroupPost({ ...gift, gift_draw_at: 'bad' }), /plazo/i);
  await assert.rejects(repo.createGroupPost({ ...gift, gift_draw_at: new Date(0).toISOString() }), /plazo/i);
  await assert.rejects(repo.createGroupPost({ ...gift, kind: 'plan', gift_draw_at: new Date(Date.now() + 86400000).toISOString() }), /plazo/i);
  assert.equal(db.calls.length, 0);
  const deadline = new Date(Date.now() + 86400000).toISOString();
  await repo.createGroupPost({ ...gift, gift_draw_at: deadline });
  assert.equal(db.calls.find(c => c[0] === 'insert')[1].gift_draw_at, deadline);
});
test('resolver vencidos restringe la operación al grupo solicitado y propaga errores', async () => {
  const db = client(); const repo = createHubRepository(db, id);
  await repo.resolveGroupGiftDraws(id);
  assert.deepEqual(db.calls, [['rpc', 'resolve_group_gift_draws', { target_group: id }]]);
  await assert.rejects(repo.resolveGroupGiftDraws('bad'), /identificador/i);
  const failed = createHubRepository({ rpc: () => Promise.resolve({ error: { message: 'offline' } }) }, id);
  await assert.rejects(failed.resolveGroupGiftDraws(id), /offline/);
});
test('un reintento compara el instante del plazo aunque Postgres cambie su formato', async () => {
  const deadline = new Date(Date.now() + 86400000).toISOString();
  const input = { newId:id, group_id:id, kind:'gift', title:'Libro', description:'', gift_draw_at:deadline };
  const row = { id, owner_id:id, group_id:id, kind:'gift', title:'Libro', description:'', event_date:null, cover_path:'', gift_draw_at:deadline.replace('Z','+00:00') };
  let request = 0;
  const query = new Proxy({}, { get: (_, key) => key === 'then' ? resolve => resolve(++request === 1 ? { error:{code:'23505'} } : {data:row}) : () => query });
  const repo = createHubRepository({from:() => query}, id);
  assert.equal((await repo.createGroupPost(input)).id, id);
});
