const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTemporaryRecoveryClient } = require('../src/features/account/recovery.ts');
test('verificar recuperación no deja una sesión restaurable en otra instancia', async () => {
  const config = { url: 'https://example.supabase.co', key: 'sb_publishable_test' };
  const jwt = `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
  const client = createTemporaryRecoveryClient(config, async () => new Response(JSON.stringify({
    access_token: jwt, token_type: 'bearer', expires_in: 3600, refresh_token: 'test-refresh',
    user: { id: '11111111-1111-4111-8111-111111111111', email: 'a@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: new Date().toISOString() },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  const verified = await client.auth.verifyOtp({ email: 'a@example.com', token: '12345678', type: 'recovery' });
  assert.equal(verified.error, null);
  assert.ok((await client.auth.getSession()).data.session);
  const restarted = createTemporaryRecoveryClient(config);
  assert.equal((await restarted.auth.getSession()).data.session, null);
  await client.auth.signOut({ scope: 'local' });
});
