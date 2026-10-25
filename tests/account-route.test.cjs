const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function screen(initialSession) {
  let session = initialSession;
  const entered = { current: !!session }; const exports = {};
  const source = fs.readFileSync('src/app/account.tsx', 'utf8');
  vm.runInNewContext(ts.transpileModule(source.slice(source.indexOf('export default function AccountScreen('), source.indexOf('function AccountForm(')), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, require: () => ({ jsx: (type, props) => ({ type, props }) }), useAccount: () => ({ session }),
    useRef: () => entered, useEffect: fn => fn(), Redirect: 'Redirect', AccountForm: 'Form',
  });
  return { render: () => exports.default(), signIn: () => { session = { user: { id: 'user' } }; } };
}
test('una sesion existente usa la cuenta unificada; un acceso nuevo conserva el inicio', () => {
  assert.equal(screen({ user: { id: 'user' } }).render().props.href, '/settings');
  const entry = screen(null); assert.equal(entry.render().type, 'Form');
  entry.signIn(); assert.equal(entry.render().props.href, '/');
});
