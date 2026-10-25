const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function render(reduced, visible, message) {
  const effects = [], calls = [];
  const Value = class { setValue(value) { calls.push(['value', value]); } interpolate() { return 0; } };
  const exports = {};
  const mocks = {
    react: { useEffect: effect => effects.push(effect), useState: init => [init()] },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { View: 'View', Animated: { Value, View: 'AnimatedView', timing: (_, config) => ({ start: () => calls.push(['start', config]), stop: () => calls.push(['stop']) }) } },
    '@react-navigation/native': { useIsFocused: () => visible },
    '@/hooks/use-reduced-motion': { useReducedMotion: () => reduced },
    '@/features/hub/provider': { usePalette: () => ({ sageText: '#345', accent: '#678' }) },
    './hub-icons': { CheckIcon: 'Check' }, './hub-ui': { Copy: 'Copy' },
    'phosphor-react-native/src/icons/Sparkle': { SparkleIcon: 'Sparkle' },
  };
  const source = fs.readFileSync('src/components/wish-completion-notice.tsx', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, require: name => { assert.ok(mocks[name], name); return mocks[name]; } });
  const tree = exports.WishCompletionNotice({ message });
  const cleanup = effects[0]();
  return { tree, calls, cleanup };
}
test('celebra una vez con driver nativo y cancela al desmontar', () => {
  const result = render(false, true, 'Deseo cumplido');
  assert.equal(result.calls.filter(call => call[0] === 'start').length, 1);
  const config = result.calls.find(call => call[0] === 'start')[1];
  assert.equal(config.useNativeDriver, true);
  assert.ok(config.duration < 1000);
  result.cleanup();
  assert.ok(result.calls.some(call => call[0] === 'stop'));
});
test('sin animacion con movimiento reducido, pantalla oculta o al deshacer', () => {
  for (const args of [[true,true,'Deseo cumplido'], [false,false,'Deseo cumplido'], [false,true,'Movido a por cumplir']]) {
    const result = render(...args);
    assert.equal(result.calls.some(call => call[0] === 'start'), false);
    assert.ok(result.tree);
  }
});
