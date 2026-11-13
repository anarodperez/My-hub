const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHubRepository } = require('../src/features/hub/repository.ts');
function client(result) {
 const calls=[];
 const query = new Proxy({}, { get(_,key) {
  if(key==='then')return (resolve,reject)=>Promise.resolve(result).then(resolve,reject);
  return (...args)=>{calls.push([key,...args]);return query;};
 }});
 return { calls, from:table=>{calls.push(['from',table]);return query;}, rpc:(...args)=>{calls.push(['rpc',...args]);return query;} };
}
const owner='10000000-0000-4000-8000-000000000001';
const id='20000000-0000-4000-8000-000000000001';

test('preferencias validan colecciones y clientes anteriores no sobrescriben su organizacion', async () => {
 const db=client({data:{id:owner,revision:2},error:null});const repo=createHubRepository(db,owner);
 assert.throws(()=>repo.savePreferences({wishlist_organization:{collections:[],assignments:{'wish:x':'missing'}}}),/Colecciones/);
 assert.equal(db.calls.length,0);
 await repo.savePreferences({id:owner,revision:1,theme:'dark'});
 const payload=db.calls.find(c=>c[0]==='update')[1];
 assert.equal(Object.hasOwn(payload,'wishlist_organization'),false);
 assert.equal(Object.hasOwn(payload,'current_media'),false);
});

test('moment preferences reject duplicate slots and unuploaded web images before writing', () => {
 const db=client({data:{id:owner,revision:2},error:null}); const repo=createHubRepository(db,owner);
 const item={category:'book',title:'Libro',status:'current',coverUrl:''};
 assert.throws(()=>repo.savePreferences({current_media:[item,item]}),/momento/);
 assert.throws(()=>repo.savePreferences({current_media:[{...item,coverUrl:'data:image/png;base64,AAAA'}]}),/momento/);
 assert.equal(db.calls.length,0);
});
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


test('reaction reads deduplicate and batch, writes use RPC and reject unknown kinds',async()=>{
 const db=client({data:[],error:null});const repo=createHubRepository(db,owner);
 await repo.listReactionSummaries([]);assert.equal(db.calls.length,0);
 const ids=Array.from({length:101},(_,i)=>'20000000-0000-4000-8000-'+String(i).padStart(12,'0'));
 await repo.listReactionSummaries([...ids,ids[0]]);
 assert.deepEqual(db.calls.filter(c=>c[0]==='rpc').map(c=>c[2].targets.length),[100,1]);
 await assert.rejects(repo.setReaction(id,'unknown'),/reacci/);
 const write=client({data:[{post_id:id,mine:'need',need_count:1}],error:null});
 assert.equal((await createHubRepository(write,owner).setReaction(id,'need')).mine,'need');
 assert.deepEqual(write.calls[0],['rpc','set_recommendation_reaction',{target:id,next_kind:'need'}]);
 assert.throws(()=>repo.setGroupCover(id,'unknown'),/portada/i);
});
