const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function refreshHook(paused = false) {
  let tick, cleaned = false, calls = 0, release;
  const app = { currentState: 'active' }; const exports = {};
  const context = { exports, require: name => ({
    react: { useCallback: fn => fn },
    'expo-router': { useFocusEffect: fn => { context.cleanup = fn(); } },
    'react-native': { AppState: app },
  })[name], setInterval: (fn, delay) => { assert.equal(delay, 20000); tick = fn; return 1; }, clearInterval: () => { cleaned = true; } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/use-group-auto-refresh.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  exports.useGroupAutoRefresh(() => { calls++; return new Promise(resolve => { release = resolve; }); }, paused);
  return { app, tick: () => tick?.(), calls: () => calls, release: () => release(), cleanup: () => context.cleanup?.(), cleaned: () => cleaned };
}
test('solo refresca en primer plano, evita solapamientos y limpia al salir', async () => {
  const hook = refreshHook();
  hook.app.currentState = 'background'; hook.tick(); assert.equal(hook.calls(), 0);
  hook.app.currentState = 'active'; hook.tick(); hook.tick(); assert.equal(hook.calls(), 1);
  hook.release(); await new Promise(resolve => setImmediate(resolve)); hook.tick(); assert.equal(hook.calls(), 2);
  hook.cleanup(); assert.equal(hook.cleaned(), true); hook.release();
});
test('no programa refrescos durante carga o guardado', () => {
  const hook = refreshHook(true); hook.tick(); assert.equal(hook.calls(), 0);
});
