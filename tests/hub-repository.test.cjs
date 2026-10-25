const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHubRepository } = require('../src/features/hub/repository.ts');
function client(result) {
 const calls=[];
 const query = new Proxy({}, { get(_,key) {
  if(key==='then')return (resolve,reject)=>Promise.resolve(result).then(resolve,reject);
  return (...args)=>{calls.push([key,...args]);return query;};
 }});
 return { calls, from:table=>{calls.push(['from',table]);return query;}, rpc:()=>query };
}
const owner='10000000-0000-4000-8000-000000000001';
const id='20000000-0000-4000-8000-000000000001';
test('grupos incluyen recuento de miembros en la misma consulta',async()=>{
 const db=client({data:[],error:null});await createHubRepository(db,owner).listGroups();
 assert.ok(db.calls.some(c=>c[0]==='select'&&c[1]==='*,group_members(count)'));
});
test('feed pagina por fecha e ID y filtra categoria antes de limitar',async()=>{
 const db=client({data:[],error:null});
 await createHubRepository(db,owner).listDiscoveries({id,created_at:'2026-10-15T12:00:00Z'},20,'book');
 assert.ok(db.calls.some(c=>c[0]==='eq'&&c[1]==='category'&&c[2]==='book'));
 assert.ok(db.calls.some(c=>c[0]==='limit'&&c[1]===20));
 assert.ok(db.calls.some(c=>c[0]==='or'&&c[1].includes('id.lt.'+id)));
});
test('previews usan una consulta con dos comentarios por publicacion y recuento independiente',async()=>{
 const db=client({data:[],error:null});const repo=createHubRepository(db,owner);
 await repo.listCommentPreviews([id]);
 assert.equal(db.calls.filter(c=>c[0]==='from').length,1);
 assert.ok(db.calls.some(c=>c[0]==='select'&&c[1].includes('comments(count)')&&c[1].includes('comment_preview:comments')));
 assert.ok(db.calls.some(c=>c[0]==='limit'&&c[1]===2&&c[2].referencedTable==='comment_preview'));
 assert.ok(db.calls.some(c=>c[0]==='order'&&c[1]==='created_at'&&c[2].ascending===false));
 const empty=client({data:[],error:null});assert.deepEqual(await createHubRepository(empty,owner).listCommentPreviews([]),[]);assert.equal(empty.calls.length,0);
});
test('quitar guardado solo borra wishlist de la cuenta actual', async()=>{
 const db=client({data:null,error:null});await createHubRepository(db,owner).removeSaved(id);
 assert.deepEqual(db.calls,[['from','wishlist_items'],['delete'],['eq','owner_id',owner],['eq','recommendation_id',id]]);
});
test('error remoto se propaga; conflicto de revision no anuncia guardado',async()=>{
 const db=client({data:null,error:{message:'offline'}});
 await assert.rejects(createHubRepository(db,owner).removeSaved(id),/offline/);
 const conflict=client({data:null,error:null});
 await assert.rejects(createHubRepository(conflict,owner).saveEvent({id,revision:4,title:'Plan',category:'book',event_date:'2026-10-20'}),/actualizado/);
 assert.ok(conflict.calls.some(c=>c[0]==='eq'&&c[1]==='revision'&&c[2]===4));
});
test('no enviar campos de propietario ajeno ni una fecha vacia',async()=>{
 const db=client({data:{id},error:null});const repo=createHubRepository(db,owner);
 await repo.saveEvent({title:'Plan',category:'book',event_date:'2026-10-20',owner_id:'attacker'});
 const payload=db.calls.find(c=>c[0]==='insert')[1];assert.equal(payload.owner_id,owner);assert.equal(payload.title,'Plan');
 await assert.rejects(repo.saveEvent({title:'Plan',category:'book',event_date:'bad'}),/fecha/i);
});
