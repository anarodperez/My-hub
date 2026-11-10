const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function renderText(style, platform = 'web', props = {}) {
  const source = fs.readFileSync('src/components/hub-ui.tsx', 'utf8');
  const component = source.slice(source.indexOf('export function Copy('), source.indexOf('const AnimatedPressable'));
  const exports = {};
  const flatten = value => Array.isArray(value) ? Object.assign({}, ...value.filter(Boolean).map(flatten)) : value || {};
  vm.runInNewContext(ts.transpileModule(component, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, require: () => ({ jsx: (type, props) => ({ type, props }) }),
    usePalette: () => ({}), StyleSheet: { flatten }, Platform: { OS: platform },
    hubType: { body: { fontSize: 16, lineHeight: 24 } }, s: { copy: { fontSize: 16, lineHeight: 24 } },
    isLoaded: () => false, Text: 'Text',
  });
  return flatten(exports.Copy({ style, ...props }).props.style);
}

test('la web distingue metadatos, controles, cuerpo y titulos', () => {
  for (const [original, expected] of [[10, 14], [12, 14], [13, 14], [14, 16], [15, 16], [16, 17], [18, 20], [30, 30]]) {
    assert.equal(renderText({ fontSize: original }).fontSize, expected);
  }
});

test('los encabezados conservan su proporcion sin interlineado excesivo', () => {
  assert.equal(renderText({ fontSize: 30, lineHeight: 36 }, 'web', { accessibilityRole: 'header' }).lineHeight, 36);
  assert.equal(renderText({ fontSize: 18, lineHeight: 24, fontWeight: '700' }).lineHeight, 27);
  assert.equal(renderText({ fontSize: 12, lineHeight: 18 }).lineHeight, 21);
});

test('la escala movil conserva sus tamanos originales', () => {
  for (const platform of ['android', 'ios']) {
    const result = renderText({ fontSize: 12, lineHeight: 18 }, platform);
    assert.equal(result.fontSize, 12);
    assert.equal(result.lineHeight, 18);
  }
});
