const { test } = require('node:test');
const assert = require('node:assert/strict');
const { availabilityMatches } = require('../src/features/hub/availability-matches.ts');
const rows = [
  { owner_id: 'a', available_date: '2026-10-26', period: 'evening' },
  { owner_id: 'b', available_date: '2026-10-26', period: 'evening' },
  { owner_id: 'a', available_date: '2026-10-26', period: 'evening' },
  { owner_id: 'outsider', available_date: '2026-10-26', period: 'evening' },
  { owner_id: 'a', available_date: '2026-10-24', period: 'morning' },
  { owner_id: 'b', available_date: '2026-10-24', period: 'morning' },
];
test('coincidencias cuentan personas unicas actuales, excluyen pasado y franjas sin coincidencia', () => {
  assert.deepEqual(availabilityMatches(rows, ['a', 'b'], '2026-10-25'), [{ date: '2026-10-26', period: 'evening', people: ['a', 'b'] }]);
  assert.deepEqual(availabilityMatches(rows, ['a'], '2026-10-25'), []);
});
test('prioriza mas personas y desempata por dia y franja', () => {
  const input = ['a', 'b'].flatMap(owner_id => ['morning', 'evening'].map(period => ({ owner_id, available_date: '2026-10-27', period })));
  input.push({ owner_id: 'c', available_date: '2026-10-27', period: 'evening' });
  const matches = availabilityMatches(input, ['a', 'b', 'c'], '2026-10-25');
  assert.equal(matches[0].period, 'evening'); assert.equal(matches[0].people.length, 3);
  assert.equal(matches[1].period, 'morning');
});
