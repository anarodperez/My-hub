const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateCredentials, validateNewPassword } = require('../src/features/account/validation.ts');
test('correo y contraseñas se validan sin transformar la contraseña', () => {
  assert.ok(validateCredentials('', 'password'));
  assert.ok(validateCredentials('no-es-correo', 'password'));
  assert.ok(validateCredentials('a@example.com', ''));
  assert.equal(validateCredentials('a@example.com', ' x '), null);
  assert.ok(validateNewPassword('12345', '12345'));
  assert.ok(validateNewPassword('12345678', '87654321'));
  assert.equal(validateNewPassword('12345678', '12345678'), null);
});
