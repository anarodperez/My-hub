const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function motion(platform = 'ios') {
  const states = [], refs = [], animations = [];
  let stateIndex, refIndex, dependencies, cleanup, pending, reduced = false;
  const exports = {};
  const source = fs.readFileSync('src/components/hub-motion.tsx', 'utf8');
  vm.runInNewContext(ts.transpileModule(source.slice(source.indexOf('export function MotionContent')), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require: () => ({ jsx: (type, props) => ({ type, props }) }),
    useReducedMotion: () => reduced,
    useRef: initial => refs[refIndex++] ||= { current: initial },
    useState: initial => {
      const index = stateIndex++;
      if (!(index in states)) states[index] = initial();
      return [states[index]];
    },
    useEffect: (effect, next) => {
      if (!dependencies || next.some((value, index) => value !== dependencies[index])) {
        pending = () => { cleanup?.(); cleanup = effect(); };
        dependencies = next;
      }
    },
    Easing: { out: value => value, cubic: 'cubic' },
    Platform: { OS: platform },
    Animated: {
      View: 'AnimatedView',
      Value: class { constructor(value) { this.value = value; } setValue(value) { this.value = value; } stopAnimation() {} interpolate(config) { return { value: this, config }; } },
      timing: (value, config) => {
        const animation = { value, config, started: false, stopped: false, start() { this.started = true; }, stop() { this.stopped = true; } };
        animations.push(animation);
        return animation;
      },
    },
  });
  return {
    animations,
    render: (changeKey, children, reduce = false, distance = 0) => {
      stateIndex = 0; refIndex = 0; reduced = reduce; pending = undefined;
      const tree = exports.MotionContent({ changeKey, children, distance });
      pending?.();
      return tree;
    },
    unmount: () => cleanup?.(),
  };
}

test('los cambios conservan los hijos y cancelan la transición anterior al repetir o salir', () => {
  const m = motion(), input = { type: 'Input', value: 'Texto sin guardar' };
  m.render('pending', input);
  assert.equal(m.animations.length, 0);
  const tree = m.render('finished', input);
  assert.equal(tree.props.children, input);
  assert.equal(tree.key, undefined);
  assert.equal(m.animations[0].started, true);
  assert.equal(m.animations[0].config.useNativeDriver, true);
  m.render('pending', input);
  assert.equal(m.animations[0].stopped, true);
  m.unmount();
  assert.equal(m.animations[1].stopped, true);
});

test('web route movement uses the web driver and disappears with reduced motion', () => {
  const m = motion('web');
  const input = { type: 'Input', value: 'Draft' };
  m.render('a', input, false, 8);
  let tree = m.render('b', input, false, 8);
  assert.equal(tree.props.children, input);
  assert.equal(m.animations[0].config.useNativeDriver, false);
  assert.deepEqual(Array.from(tree.props.style[2].transform[0].translateY.config.outputRange), [8, 0]);
  tree = m.render('b', input, true, 8);
  assert.equal(tree.props.style[2], false);
  assert.equal(tree.props.style[1].opacity.value, 1);
});

test('reducir movimiento cancela la transición y mantiene el contenido completamente visible', () => {
  const m = motion();
  m.render('a', 'Contenido');
  m.render('b', 'Contenido');
  const tree = m.render('b', 'Contenido', true);
  assert.equal(m.animations[0].stopped, true);
  assert.equal(tree.props.style[1].opacity.value, 1);
  m.render('c', 'Contenido', true);
  m.render('c', 'Contenido', false);
  assert.equal(m.animations.length, 1);
});
