const {test}=require('node:test');const assert=require('node:assert/strict');const {imageMime,createCloudCovers}=require('../src/features/hub/cloud-covers.ts');
test('las fotos de regalos usan bucket privado separado y ruta de grupo',async()=>{
 const calls=[];const client={storage:{from:bucket=>({upload:async(path)=>{calls.push({bucket,path});return {error:null};},createSignedUrl:async(path,expires)=>{calls.push({bucket,path,expires});return {data:{signedUrl:'https://example.com/signed'},error:null};}})}};
 const media=createCloudCovers(client,async()=>Uint8Array.from([255,216,255,0]),()=> 'photo');
 const path=await media.upload('owner','post','file:///a.jpg','group-media','group');
 assert.equal(path,'owner/group/post/photo.jpeg');
 await media.resolve(path,'group-media');
 assert.ok(calls.every(call=>call.bucket==='group-media'));assert.equal(calls[1].expires,3600);
});
test('GIF de comentarios verifica firma y limite antes de subir',async()=>{
 const calls=[];const client={storage:{from:bucket=>({upload:async(path,bytes,options)=>{calls.push({bucket,path,options});return {error:null};}})}};
 const bytes=new Uint8Array([71,73,70,56,57,97,1,0,1,0,0,0,0]);
 const media=createCloudCovers(client,async()=>bytes,()=> 'file');
 assert.equal(await media.uploadGif('owner','comment','file:///a.gif'),'owner/comment/file.gif');
 assert.equal(calls[0].bucket,'comment-gifs');assert.equal(calls[0].options.contentType,'image/gif');
 await assert.rejects(createCloudCovers(client,async()=>new Uint8Array(5242881),()=> 'file').uploadGif('owner','comment','file:///a.gif'),/5 MB/);
 await assert.rejects(createCloudCovers(client,async()=>new Uint8Array([255,216,255]),()=> 'file').uploadGif('owner','comment','file:///a.jpg'),/GIF/);
 assert.equal(calls.length,1);
});
test('solo admite archivos de imagen y maximo 10 MB',()=>{assert.equal(imageMime(Uint8Array.from([255,216,255,0])),'image/jpeg');assert.equal(imageMime(Uint8Array.from([137,80,78,71,13,10,26,10])),'image/png');assert.throws(()=>imageMime(new Uint8Array(10485761)),/10 MB/);assert.throws(()=>imageMime(Uint8Array.from([60,115,99,114])),/imagen/);});
test('subida fallida no devuelve una referencia; URL externa no se vuelve a subir',async()=>{let called=false;const client={storage:{from:()=>({upload:async()=>{called=true;return {error:{message:'offline'}};}})}};const media=createCloudCovers(client,async()=>Uint8Array.from([255,216,255,0]),()=> 'photo');await assert.rejects(media.upload('owner','entity','file:///original.jpg'),/offline/);assert.equal(called,true);assert.equal(await media.upload('owner','entity','https://example.com/photo.jpg'),'https://example.com/photo.jpg');});
