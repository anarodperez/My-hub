const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function optimizer(width, height, sizes) {
  const exports = {}, resized = [], saved = [], released = [], loading = [];
  let index = 0;
  const image = () => ({ width, height, release() {}, saveAsync: async options => { saved.push(options); return { uri: 'blob:result' }; } });
  const context = { renderAsync: async () => image(), reset() { return this; }, resize(size) { resized.push(size); return this; }, release() { released.push('context'); } };
  const mocks = {
    'expo-image-manipulator': { ImageManipulator: { manipulate: (_, options) => { loading.push(options); return context; } }, SaveFormat: { WEBP: 'webp' } },
    'expo-file-system': {}, 'react-native': { Platform: { OS: 'web' } },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/hub/optimize-photo.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: name => mocks[name], Uint8Array,
    fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(sizes[Math.min(index++, sizes.length - 1)]) }),
    URL: { revokeObjectURL: uri => released.push(uri) },
  });
  return { optimize: exports.optimizePhoto, resized, saved, released, loading };
}

test('large photos preserve proportions, export WebP and stay within the upload budget', async () => {
  const o = optimizer(4000, 3000, [200000]);
  assert.equal((await o.optimize('file://source')).length, 200000);
  assert.equal(o.resized[0].width, 1280);
  assert.equal(o.resized[0].height, 960);
  assert.equal(o.loading[0].maxWidth, 1280);
  assert.equal(o.loading[0].maxHeight, 1280);
  assert.equal(o.saved[0].format, 'webp');
  assert.ok(o.released.includes('blob:result'));
  assert.ok(o.released.includes('context'));
  assert.ok(!o.released.includes('file://source'));
});

test('small portrait photos are never enlarged; heavy photos use bounded retries', async () => {
  const small = optimizer(200, 600, [10000]);
  await small.optimize('photo');
  assert.equal(small.resized[0].width, 200);
  assert.equal(small.resized[0].height, 600);
  const heavy = optimizer(3000, 4000, [900000, 500000, 200000]);
  await heavy.optimize('photo');
  assert.equal(heavy.resized.length, 3);
  assert.equal(heavy.resized[2].height, 720);
  assert.ok(heavy.saved[2].compress < heavy.saved[0].compress);
});

test('oversized outputs fail rather than silently uploading the original', async () => {
  const o = optimizer(3000, 4000, [900000]);
  await assert.rejects(o.optimize('photo'), /256 KB/);
  assert.equal(o.resized.length, 3);
  assert.ok(o.released.includes('context'));
});
