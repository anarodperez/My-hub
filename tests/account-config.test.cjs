const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readAccountConfig } = require('../src/features/account/config.ts');
test('cuentas requieren URL HTTPS y clave pública', () => {
  assert.equal(readAccountConfig(undefined, undefined), null);
  assert.equal(readAccountConfig('https://example.supabase.co', 'sb_secret_test'), null);
  assert.equal(readAccountConfig('http://example.supabase.co', 'sb_publishable_test'), null);
  assert.deepEqual(readAccountConfig('https://example.supabase.co', 'sb_publishable_test'), { url: 'https://example.supabase.co', key: 'sb_publishable_test' });
});
