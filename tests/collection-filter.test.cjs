const {test}=require('node:test');
const assert=require('node:assert/strict');
const {filterCollection}=require('../src/features/hub/wishlist.ts');
test('busca sin acentos y combina categoria y valoracion sin mutar',()=>{
 const rows=[{title:'Caf\u00e9 y libros',category:'book',rating:4.5},{title:'Cafe del barrio',category:'place',rating:3},{title:'Otro libro',category:'book',rating:5}];
 assert.deepEqual(filterCollection(rows,' CAFE ','book',4),[rows[0]]);
 assert.equal(filterCollection(rows,'','all',5).length,1);
 assert.equal(filterCollection([{title:'Deseo',category:'book'}],'','all',4).length,0);
 assert.equal(rows.length,3);
});
