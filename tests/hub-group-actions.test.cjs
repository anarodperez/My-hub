const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createHubRepository}=require('../src/features/hub/repository.ts');
const id='10000000-0000-4000-8000-000000000001';
test('renombrar valida ID y nombre antes de llamar al servidor',async()=>{
 const calls=[];
 const repo=createHubRepository({rpc:async(name,args)=>{calls.push({name,args});return {data:null,error:null};}},id);
 assert.throws(()=>repo.renameGroup(id,' '));
 assert.throws(()=>repo.renameGroup('invalid','Name'));
 assert.throws(()=>repo.renameGroup(id,'a'.repeat(81)));
 assert.equal(calls.length,0);
 await repo.renameGroup(id,' Club ');
 assert.deepEqual(calls[0],{name:'rename_group',args:{target:id,group_name:'Club'}});
});
test('valorar valida nota y opinion; conserva errores del servidor',async()=>{
 const calls=[];
 const repo=createHubRepository({rpc:async(name,args)=>{calls.push({name,args});return {data:id,error:null};}},id);
 await assert.rejects(repo.reviewWish(id,false,'Opinion',4.2));
 assert.throws(()=>repo.reviewWish(id,false,' ',5));
 assert.equal(calls.length,0);
 assert.equal(await repo.reviewWish(id,true,' Opinion ',4.5),id);
 assert.deepEqual(calls[0],{name:'review_wishlist',args:{target:id,saved_post:true,review:'Opinion',score:4.5}});
 const denied=createHubRepository({rpc:async()=>({data:null,error:{message:'Permission denied'}})},id);
 await assert.rejects(denied.renameGroup(id,'Name'),/Permission denied/);
});
