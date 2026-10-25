const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fetchProductMetadata, productLink } = require('../src/features/hub/product-metadata.ts');

const reply = data => async () => new Response(JSON.stringify({ status: 'success', data }));

test('lee nombre, imagen y precio EUR de Product JSON-LD sin elegir productos relacionados', async () => {
  let request;
  const data = await fetchProductMetadata('https://shop.example/item', undefined, async url => {
    request = new URL(url);
    return reply({ title: 'Página', image: { url: 'https://cdn.example/photo.jpg' }, structured: [JSON.stringify({ '@graph': [
      { '@type': 'Organization', name: 'Tienda' },
      { '@type': 'Product', name: 'Vela', offers: { price: '19.99', priceCurrency: 'EUR' } },
    ] })] })();
  });
  assert.equal(request.origin, 'https://api.microlink.io');
  assert.equal(request.searchParams.get('url'), 'https://shop.example/item');
  assert.deepEqual(data, { title: 'Vela', coverUrl: 'https://cdn.example/photo.jpg', amount: '19,99' });
});

test('no convierte dólares ni importes ambiguos a euros', async () => {
  for (const [price, currency] of [['12.99', 'USD'], ['12.99', undefined], ['1,299.00', 'EUR'], ['-1', 'EUR']]) {
    const data = await fetchProductMetadata('https://shop.example/item', undefined, reply({ title: 'Producto', price, currency }));
    assert.equal(data.amount, '');
  }
});

test('acepta precio cero, limita título y descarta imágenes inseguras', async () => {
  const data = await fetchProductMetadata('https://shop.example/item', undefined, reply({ title: 'a'.repeat(200), image: { url: 'javascript:alert(1)' }, price: '0', currency: 'EUR' }));
  assert.equal(data.title.length, 150);
  assert.equal(data.coverUrl, '');
  assert.equal(data.amount, '0,00');
});

test('JSON-LD roto no impide recuperar metadatos básicos', async () => {
  const data = await fetchProductMetadata('https://shop.example/item', undefined, reply({ title: 'Vela', structured: ['{roto'], image: null }));
  assert.equal(data.title, 'Vela');
});

test('lee JSON-LD que el proveedor ya ha convertido en objetos e ImageObject.contentUrl', async () => {
  const data = await fetchProductMetadata('https://shop.example/item', undefined, reply({ structured: [
    { '@type': 'BreadcrumbList' },
    { '@type': 'Product', name: 'Mesa', image: [{ '@type': 'ImageObject', contentUrl: 'https://cdn.example/mesa.jpg' }], offers: { price: 9.99, priceCurrency: 'EUR' } },
  ] }));
  assert.deepEqual(data, { title: 'Mesa', coverUrl: 'https://cdn.example/mesa.jpg', amount: '9,99' });
});

test('rechaza enlaces privados, credenciales y esquemas inseguros antes de consultar', async () => {
  for (const link of ['file:///secret', 'http://localhost/x', 'http://127.0.0.1', 'https://[::1]', 'https://user:pass@shop.example', 'http://192.168.1.1', 'https://host.local', 'no es una URL']) {
    assert.equal(productLink(link), '');
    await assert.rejects(fetchProductMetadata(link, undefined, () => { throw new Error('No debe consultar'); }), /enlace público/);
  }
});

test('explica cuotas, bloqueos y respuestas vacías sin impedir edición manual', async () => {
  await assert.rejects(fetchProductMetadata('https://shop.example', undefined, async () => new Response('', { status: 429 })), /límite/);
  await assert.rejects(fetchProductMetadata('https://shop.example', undefined, async () => new Response('', { status: 403 })), /manualmente/);
  await assert.rejects(fetchProductMetadata('https://shop.example', undefined, reply({})), /manualmente/);
});
