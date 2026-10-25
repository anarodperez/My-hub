const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { productLink } = require('../src/features/hub/product-metadata.ts');

function render({ initial = '', value = 'https://shop.example/item', disabled = false } = {}) {
  const effects = [], calls = [], timers = new Map();
  let resolve, signal, refCount = 0;
  const pending = new Promise(done => { resolve = done; });
  const mocks = {
    react: {
      useEffect: effect => effects.push(effect),
      useRef: value => ({ current: refCount++ === 0 ? initial : value }),
      useState: value => [value, () => {}],
    },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { View: 'View' },
    '@/components/hub-ui': { Copy: 'Copy', Field: 'Field', TextAction: 'TextAction' },
    '@/features/hub/product-metadata': { productLink, fetchProductMetadata: (url, abortSignal) => {
      calls.push(url); signal = abortSignal; return pending;
    } },
  };
  const exports = {};
  const source = fs.readFileSync('src/components/product-link-field.tsx', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const applied = [];
  vm.runInNewContext(code, { exports, require: name => mocks[name], AbortController,
    setTimeout: fn => { const id = timers.size + 1; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id),
  });
  exports.ProductLinkField({ value, disabled, onChangeText() {}, onMetadata: data => applied.push(data) });
  effects[0]();
  const cleanup = effects[1]();
  return { calls, applied, cleanup, resolve, signal: () => signal,
    runTimers: () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); },
  };
}

test('espera antes de consultar y aplica el resultado vigente', async () => {
  const result = render();
  assert.equal(result.calls.length, 0);
  result.runTimers();
  assert.equal(result.calls.length, 1);
  result.resolve({ title: 'Vela', coverUrl: '', amount: '' });
  await new Promise(setImmediate);
  assert.equal(result.applied[0].title, 'Vela');
  result.cleanup();
});

test('cambiar enlace o salir cancela la consulta e ignora respuestas tardías', async () => {
  const result = render();
  result.runTimers();
  result.cleanup();
  assert.equal(result.signal().aborted, true);
  result.resolve({ title: 'Producto anterior' });
  await new Promise(setImmediate);
  assert.equal(result.applied.length, 0);
});

test('no consulta al editar un enlace existente, guardar, elegir foto o con enlace inválido', () => {
  for (const options of [{ initial: 'https://shop.example/item' }, { disabled: true }, { value: 'enlace incompleto' }]) {
    const result = render(options);
    result.runTimers();
    assert.equal(result.calls.length, 0);
  }
});

test('salir durante la espera evita enviar el enlace', () => {
  const result = render();
  result.cleanup();
  result.runTimers();
  assert.equal(result.calls.length, 0);
});
