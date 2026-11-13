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

test('photos pass through optimization; GIFs keep their original bytes', async () => {
 const uploads=[]; let optimized=0;
 const gif=new Uint8Array([71,73,70,56,57,97,1,0,1,0,0,0,0]);
 const photo=Uint8Array.from([255,216,255,0]);
 const client={storage:{from:bucket=>({upload:async(path,bytes,options)=>{uploads.push({bucket,bytes,options});return {error:null};}})}};
 const media=createCloudCovers(client,async()=>gif,()=> 'photo',async()=>{optimized++;return photo;});
 await media.upload('owner','entity','file:///photo');
 await media.uploadGif('owner','comment','file:///gif');
 assert.equal(optimized,1);assert.equal(uploads[0].bytes,photo);assert.equal(uploads[0].options.cacheControl,'3600');assert.equal(uploads[1].bytes,gif);
 await assert.rejects(createCloudCovers(client,async()=>photo,()=> 'id',async()=>new Uint8Array(262145)).upload('owner','entity','photo'),/256 KB/);
});

test('signed URLs coalesce concurrent calls, expire, separate buckets and retry failures', async () => {
 let calls=0, fail=false;const originalNow=Date.now;let now=1000000;Date.now=()=>now;
 try {
  const client={storage:{from:bucket=>({createSignedUrl:async()=>{calls++;return fail?{error:{message:'offline'}}:{data:{signedUrl:`https://example.com/${bucket}/${calls}`},error:null};}})}};
  const media=createCloudCovers(client,async()=>new Uint8Array(),()=> 'id');
  const [a,b]=await Promise.all([media.resolve('path'),media.resolve('path')]);assert.equal(a,b);assert.equal(calls,1);
  await media.resolve('path','group-media');assert.equal(calls,2);
  now+=3540001;await media.resolve('path');assert.equal(calls,3);
  fail=true;await assert.rejects(media.resolve('other'),/offline/);fail=false;await media.resolve('other');assert.equal(calls,5);
  const otherAccount=createCloudCovers(client,async()=>new Uint8Array(),()=> 'id');await otherAccount.resolve('path');assert.equal(calls,6);
 } finally {Date.now=originalNow;}
});

test('cleanup only submits unique owner paths; external and foreign paths are excluded', async () => {
 const removed=[];const client={storage:{from:bucket=>({remove:async paths=>{removed.push({bucket,paths});return {error:null};}})}};
 const media=createCloudCovers(client,async()=>new Uint8Array(),()=> 'id');
 await media.removeUnused('owner',['owner/entity/old.webp','owner/entity/old.webp','other/entity/file','https://example.com/image','owner/group/post/image']);
 assert.deepEqual(removed,[{bucket:'hub-media',paths:['owner/entity/old.webp']}]);
});
