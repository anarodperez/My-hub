const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('motion annotations stay on web and are omitted on native', () => {
  for (const platform of ['web', 'ios', 'android']) {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/web-motion.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: () => ({ Platform: { OS: platform } }) });
    const props = exports.webMotion('card');
    if (platform === 'web') assert.equal(props.dataSet.motion, 'card');
    else assert.equal(Object.keys(props).length, 0);
  }
});

test('web stylesheet compiles using the installed Expo CSS engine', () => {
  const { transform } = require('lightningcss');
  const result = transform({ filename: 'src/global.css', code: fs.readFileSync('src/global.css') });
  assert.ok(result.code.length > 0);
});
