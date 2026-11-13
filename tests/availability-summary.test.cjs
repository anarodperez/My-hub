const { test } = require('node:test');
const assert = require('node:assert/strict');
const { availabilitySummary } = require('../src/features/hub/availability-summary.ts');

test('el resumen separa respuestas por franja y excluye personas ajenas y duplicadas', () => {
  const rows = [
    { owner_id: 'a', available_date: '2026-11-06', period: 'morning' },
    { owner_id: 'b', available_date: '2026-11-06', period: 'morning', available: false },
    { owner_id: 'c', available_date: '2026-11-06', period: 'evening', available: true },
    { owner_id: 'outsider', available_date: '2026-11-06', period: 'morning' },
  ];
  assert.deepEqual(availabilitySummary(rows, ['a', 'b', 'c', 'a'], '2026-11-06', 'morning'), { free: ['a'], busy: ['b'], unknown: ['c'] });
  assert.deepEqual(availabilitySummary(rows, ['a'], '2026-11-07', 'morning'), { free: [], busy: [], unknown: ['a'] });
});
