const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parseOfferPrice}=require('../src/features/hub/offer-pricing.ts');
const {createHubRepository}=require('../src/features/hub/repository.ts');
const id='10000000-0000-4000-8000-000000000001';
test('euros se convierten exactamente a céntimos con coma o punto',()=>{
  assert.equal(parseOfferPrice('12,50'),1250); assert.equal(parseOfferPrice('0.01'),1);
  assert.equal(parseOfferPrice(' 20 '),2000); assert.equal(parseOfferPrice('999999.99'),99999999);
  for(const invalid of ['','0','-1','12.345','1e3','1,000.00','1000000','NaN']) assert.throws(()=>parseOfferPrice(invalid),/importe/i);
});
function db(){const calls=[];return{calls,rpc:(name,args)=>{calls.push([name,args]);return Promise.resolve({data:null,error:null});}};}
test('pujas validan céntimos enteros antes de invocar el RPC',async()=>{
 const client=db(),repo=createHubRepository(client,id);
 for(const amount of [0,-1,1.5,NaN,100000000]) await assert.rejects(repo.placeGroupBid(id,amount),/importe/i);
 assert.equal(client.calls.length,0);await repo.placeGroupBid(id,1250);
 assert.deepEqual(client.calls,[['place_group_bid',{target:id,amount:1250}]]);
 await repo.reservePricedGift(id);assert.deepEqual(client.calls[1],['reserve_priced_gift',{target:id}]);
});
test('publicar rechaza modalidades y precios incoherentes antes de escribir',async()=>{
 const client=db(),repo=createHubRepository(client,id);
 const input={newId:id,group_id:id,kind:'gift',title:'Chaqueta',description:''};
 for(const extra of [{offer_mode:'invalid'},{offer_mode:'fixed'},{offer_mode:'auction',price_cents:1.5},{offer_mode:'gift',price_cents:100},{offer_mode:'fixed',price_cents:100,gift_draw_at:new Date(Date.now()+86400000).toISOString()}]) await assert.rejects(repo.createGroupPost({...input,...extra}));
 assert.equal(client.calls.length,0);
});
