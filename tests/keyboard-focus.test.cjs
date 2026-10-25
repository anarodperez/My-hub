const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function screen({ visible = true, inputBottom = 450, platform = 'android', changedFocus = false, back = false, subtitle, action } = {}) {
  const calls = [], effects = [];
  const scroll = { getNativeScrollRef: () => ({ measureInWindow: fn => fn(0, 100, 300, 300) }), scrollTo: options => calls.push(options) };
  const input = { measureInWindow: fn => fn(0, inputBottom - 56, 300, 56) };
  let reads = 0;
  const source = fs.readFileSync('src/components/hub-ui.tsx', 'utf8');
  const component = source.slice(source.indexOf('export function Screen('), source.indexOf('export function Section('));
  const exports = {};
  const context = {
    exports, require: () => ({ jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }),
    usePalette: () => ({}), useSafeAreaInsets: () => ({ top: 24 }),
    useRef: value => ({ current: value }), useCallback: fn => fn, useEffect: fn => effects.push(fn), useFocusEffect: () => {},
    useHub: () => ({}), useWindowDimensions: () => ({ width: 360 }),
    Platform: { OS: platform }, Keyboard: { isVisible: () => visible, addListener: (_, fn) => { context.keyboardShow = fn; return { remove() {} }; } },
    TextInput: { State: { currentlyFocusedInput: () => changedFocus && reads++ ? null : input } },
    SafeAreaView: 'Safe', View: 'View', ScrollView: 'Scroll', KeyboardAvoidingView: 'Avoid', Copy: 'Copy', IconAction: 'Icon',
    HubMark: 'HubMark', BookOpenIcon: 'Book', UserCircleIcon: 'User', ArrowLeftIcon: 'Back', s: {}, hubWidths: {}, hubSpace: {}, router: {},
  };
  vm.runInNewContext(ts.transpileModule(component, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
  const tree = exports.Screen({ title: 'Form', back, subtitle, action });
  const props = tree.props.children[1].props.children.props;
  props.ref.current = scroll;
  props.onScroll({ nativeEvent: { contentOffset: { y: 80 } } });
  effects[0]();
  return { calls, props, keyboardShow: context.keyboardShow, tree };
}

test('las vistas con Volver muestran el subtitulo y las acciones de cabecera', () => {
  const action = { type: 'Action', props: { children: 'Opciones' } };
  const result = screen({ back: true, subtitle: 'Solo para este grupo', action });
  const all = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(all)];
  const nodes = all(result.tree);
  assert.ok(nodes.includes(action));
  assert.ok(nodes.some(node => node.props?.children === 'Solo para este grupo'));
});

test('revela el campo completo tras reducirse el formulario por el teclado', () => {
  const result = screen();
  result.props.onLayout();
  assert.equal(result.calls[0].y, 146);
  assert.equal(result.calls[0].animated, true);
});
test('tambien revela al abrir teclado o cambiar foco', () => {
  for (const event of ['onFocus', 'keyboardShow']) {
    const result = screen();
    (result.props[event] || result[event])();
    assert.equal(result.calls.length, 1);
  }
});
test('no mueve campos visibles, desenfocados, web ni teclado cerrado', () => {
  for (const options of [{ inputBottom: 350 }, { changedFocus: true }, { visible: false }, { platform: 'web' }]) {
    const result = screen(options);
    result.props.onLayout();
    assert.equal(result.calls.length, 0);
  }
});
