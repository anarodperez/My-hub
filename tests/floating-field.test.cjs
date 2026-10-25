const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function field(props = {}, fontScale = 1) {
  const states = []; let index = 0;
  const source = fs.readFileSync('src/components/hub-ui.tsx', 'utf8');
  const component = source.slice(source.indexOf('export function Field('), source.indexOf('export function AddAction('));
  const exports = {};
  const palette = { accent: 'accent', muted: 'muted', danger: 'danger', surface: 'surface', text: 'text', line: 'line' };
  vm.runInNewContext(ts.transpileModule(component, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, require: () => ({ jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }),
    useState: initial => { const i = index++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = value; }]; },
    usePalette: () => palette, useWindowDimensions: () => ({ fontScale }),
    View: 'View', TextInput: 'Input', Copy: 'Copy', isLoaded: () => false, s: { input: {} },
  });
  const render = () => { index = 0; return exports.Field({ label: 'Correo', placeholder: 'tu@correo.com', ...props }); };
  const find = (node, type) => { if (!node || typeof node !== 'object') return; if (node.type === type) return node; for (const child of [node.props?.children].flat(Infinity)) { const found = find(child, type); if (found) return found; } };
  return { render, input: tree => find(tree, 'Input'), label: tree => find(tree, 'Copy') };
}
test('el placeholder aparece al enfocar y se conservan callbacks y accesibilidad', () => {
  let focuses = 0, blurs = 0;
  const form = field({ onFocus: () => focuses++, onBlur: () => blurs++ });
  let tree = form.render();
  assert.equal(form.input(tree).props.placeholder, '');
  assert.equal(form.input(tree).props.accessibilityLabel, 'Correo');
  form.input(tree).props.onFocus({}); tree = form.render();
  assert.equal(form.input(tree).props.placeholder, 'tu@correo.com');
  assert.equal(form.label(tree).props.style.fontSize, 12);
  form.input(tree).props.onBlur({}); tree = form.render();
  assert.equal(form.label(tree).props.style.fontSize, 16);
  assert.equal(focuses, 1); assert.equal(blurs, 1);
});
test('la etiqueta permanece elevada con valor controlado, por defecto o escrito', () => {
  for (const props of [{ value: 'ana' }, { defaultValue: 'ana' }]) { const form = field(props); assert.equal(form.label(form.render()).props.style.fontSize, 12); }
  let changed = '';
  const form = field({ onChangeText: text => { changed = text; } });
  form.input(form.render()).props.onChangeText('Ana');
  assert.equal(form.label(form.render()).props.style.fontSize, 12); assert.equal(changed, 'Ana');
});
test('los campos crecen con texto ampliado y mantienen sitio para contraseñas y errores', () => {
  const form = field({ error: 'Revisa el correo', trailing: 'eye', secureTextEntry: true }, 2);
  const input = form.input(form.render());
  const style = Object.assign({}, ...input.props.style.filter(Boolean));
  assert.ok(style.minHeight >= 100); assert.ok(style.paddingRight >= 64);
  assert.equal(style.borderColor, 'danger'); assert.equal(input.props.secureTextEntry, true);
});
