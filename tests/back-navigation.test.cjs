const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function navigation(hasHistory) {
  const calls = [], exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/hub/navigation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: () => ({ router: { canGoBack: () => hasHistory, back: () => calls.push(['back']), replace: route => calls.push(['replace', route]) } }),
  });
  return { calls, goBackOr: exports.goBackOr };
}

test('sin historial sustituye la ruta en vez de enviar GO_BACK', () => {
  const nav = navigation(false);
  nav.goBackOr('/library');
  assert.deepEqual(nav.calls, [['replace', '/library']]);
});

test('con historial mantiene el comportamiento de volver', () => {
  const nav = navigation(true);
  nav.goBackOr('/library');
  assert.deepEqual(nav.calls, [['back']]);
});

test('un enlace directo puede volver al grupo y sin destino vuelve al inicio', () => {
  const nav = navigation(false);
  const group = { pathname: '/group-space', params: { id: 'group-id' } };
  nav.goBackOr(group); nav.goBackOr();
  assert.deepEqual(nav.calls, [['replace', group], ['replace', '/']]);
});
