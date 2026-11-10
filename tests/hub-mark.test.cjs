const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { renderToStaticMarkup } = require('react-dom/server');

function mark(platform) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/hub-mark.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, require: name => name === 'react-native-svg' ? { __esModule: true, default: 'svg', Circle: 'circle' }
      : name === 'react-native' ? { Platform: { OS: platform } }
      : name === '@/features/hub/provider' ? { usePalette: () => ({ soft: '#fff', accent: '#705080' }) }
      : require(name),
  });
  return exports.HubMark({ size: 36 });
}

test('el logo web es decorativo y no genera atributos DOM invalidos', () => {
  const errors = [];
  const original = console.error;
  let html;
  try {
    console.error = (...args) => errors.push(args.join(' '));
    html = renderToStaticMarkup(mark('web'));
  } finally { console.error = original; }
  assert.deepEqual(errors, []);
  assert.match(html, /aria-hidden="true"/);
  assert.doesNotMatch(html, /\saccessible=/);
});

test('el logo movil conserva su accesibilidad nativa', () => {
  for (const platform of ['android', 'ios']) {
    assert.equal(mark(platform).props.accessible, false);
  }
});
