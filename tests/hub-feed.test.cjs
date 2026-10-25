const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createDiscoveryFeed}=require('../src/features/hub/feed.ts');
const row=id=>({id,createdAt:'2026-10-15T12:00:00Z'});
test('pagina en bloques de 20 sin duplicar, conserva cursor y termina',async()=>{
 const calls=[]; const pages=[Array.from({length:20},(_,i)=>row(String(i))),[row('19'),row('20')]];
 const feed=createDiscoveryFeed(async cursor=>{calls.push(cursor);return pages.shift();});
 await feed.load(); await feed.load(); await feed.load();
 assert.equal(feed.getState().items.length,21);assert.equal(calls.length,2);
 assert.equal(calls[1].id,'19');assert.equal(feed.getState().hasMore,false);
});
test('carga simultanea no duplica peticiones y refresh descarta respuesta vieja',async()=>{
 let resolve;let calls=0;
 const feed=createDiscoveryFeed(()=>{calls++;return calls===1?new Promise(done=>resolve=done):Promise.resolve([row('new')]);});
 const old=feed.load();await feed.load();assert.equal(calls,1);
 await feed.refresh();resolve([row('old')]);await old;
 assert.deepEqual(feed.getState().items.map(r=>r.id),['new']);
});
test('error mantiene pagina y cursor para reintentar; dispose descarta respuestas',async()=>{
 let calls=0;
 const feed=createDiscoveryFeed(async()=>{if(++calls===1)throw Error('offline');return [row('ok')];});
 await feed.load();assert.match(feed.getState().error,/offline/);await feed.load();assert.equal(feed.getState().items[0].id,'ok');
 let resolve;const pending=createDiscoveryFeed(()=>new Promise(done=>resolve=done));const task=pending.load();pending.dispose();resolve([row('late')]);await task;assert.equal(pending.getState().items.length,0);
});
test('volver del detalle actualiza comentarios sin cambiar orden ni cursor',async()=>{
 const cursors=[];
 const feed=createDiscoveryFeed(async cursor=>{cursors.push(cursor);return cursor?[row('20')]:Array.from({length:20},(_,i)=>row(String(i)));});
 await feed.load();
 await feed.revalidate(async ids=>ids.filter(id=>id!=='3').map(id=>({...row(id),commentCount:2})));
 assert.equal(feed.getState().items[0].id,'0');assert.equal(feed.getState().items[0].commentCount,2);
 assert.equal(feed.getState().items.some(item=>item.id==='3'),false);
 await feed.load();assert.equal(cursors[1].id,'19');
});
test('refresh fallido conserva datos y reintenta la primera pagina',async()=>{
 let calls=0;const cursors=[];
 const feed=createDiscoveryFeed(async cursor=>{cursors.push(cursor);if(++calls===2)throw Error('offline');return [row(calls===1?'old':'new')];});
 await feed.load();await feed.refresh();assert.equal(feed.getState().items[0].id,'old');
 await feed.retry();assert.equal(feed.getState().items[0].id,'new');assert.equal(cursors[2],undefined);
});
