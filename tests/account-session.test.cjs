const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSessionGuard } = require('../src/features/account/session.ts');
test('descarta respuestas antiguas incluso al volver a la misma cuenta', () => {
  const guard = createSessionGuard();
  const accountA = guard.next();
  assert.equal(guard.isCurrent(accountA), true);
  guard.next(); // cierre
  const accountB = guard.next();
  assert.equal(guard.isCurrent(accountA), false);
  assert.equal(guard.isCurrent(accountB), true);
  guard.next(); // cuenta A de nuevo
  assert.equal(guard.isCurrent(accountA), false);
  assert.equal(guard.isCurrent(accountB), false);
});
