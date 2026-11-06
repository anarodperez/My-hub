// Run only against the isolated fixture database on localhost:55439 after its migrations.
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const [owner, a, b, group, auction, fixed] = Array.from({ length: 6 }, randomUUID);
function sql(text) {
  return new Promise(resolve => {
    const process = spawn('psql', ['-X', '-w', '-h', '127.0.0.1', '-p', '55439', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1', '-c', text]);
    let out = '', err = '';
    process.stdout.on('data', data => { out += data; });
    process.stderr.on('data', data => { err += data; });
    process.on('error', error => resolve({ code: 1, out, err: error.message }));
    process.on('close', code => resolve({ code, out, err }));
  });
}
(async () => {
  const setup = await sql(`begin;
    insert into auth.users(id) values('${owner}'),('${a}'),('${b}');
    insert into public.groups(id,owner_id,name) values('${group}','${owner}','Concurrent offers');
    insert into public.group_members values('${group}','${owner}',now()),('${group}','${a}',now()),('${group}','${b}',now());
    insert into public.group_posts(id,owner_id,group_id,kind,title,offer_mode,price_cents) values
      ('${auction}','${owner}','${group}','gift','Auction','auction',1000),
      ('${fixed}','${owner}','${group}','gift','Fixed','fixed',1500);commit;`);
  assert.equal(setup.code, 0, setup.err);
  try {
    for (const [kind, id, call] of [['auction', auction, 'place_group_bid'], ['fixed', fixed, 'reserve_priced_gift']]) {
      const results = await Promise.all([a, b].map(user => sql(`begin;set local role authenticated;
        select set_config('request.jwt.claim.sub','${user}',true);
        select public.${call}('${id}'${kind === 'auction' ? ',1000' : ''});
        select pg_sleep(0.15);commit;`)));
      assert.equal(results.filter(result => result.code === 0).length, 1, JSON.stringify(results));
      console.log(`${kind}: two simultaneous requests, exactly one accepted`);
    }
    const state = await sql(`select count(*) from public.group_post_bids where post_id='${auction}';select status from public.group_posts where id='${fixed}';`);
    assert.equal(state.code, 0, state.err);
    assert.deepEqual(state.out.trim().split(/\r?\n/), ['1', 'reserved']);
    console.log('Concurrency state verified');
  } finally {
    const cleanup = await sql(`begin;delete from public.groups where id='${group}';delete from auth.users where id in ('${owner}','${a}','${b}');commit;`);
    assert.equal(cleanup.code, 0, cleanup.err);
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
