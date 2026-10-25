const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function actions(status = 'open', own = true) {
  const calls = [];
  const source = fs.readFileSync('src/app/group-space.tsx', 'utf8');
  const start = source.indexOf('        const management =');
  const code = source.slice(start, source.indexOf('        return <Surface', start));
  const context = { post: { id: 'gift', kind: 'gift', revision: 3, status }, own, busy: false,
    responses: [{ owner_id: 'friend' }, { owner_id: 'owner' }],
    repository: { accountId: 'owner', setGroupGiftStatus: (...args) => calls.push(args) },
    author: id => id, run: fn => fn(), remove: post => calls.push(['confirm-remove', post.id]),
  };
  vm.runInNewContext(ts.transpileModule(code + '\nglobalThis.actions = management;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return { items: context.actions, calls };
}
test('la gestion conserva reservas, entrega y retirada confirmada sin mezclarlas con asistencia', () => {
  const open = actions();
  assert.equal(open.items.length, 3);
  open.items[0].onPress(); assert.deepEqual(open.calls[0], ['gift', 'reserved', 3, 'friend']);
  open.items[1].onPress(); assert.deepEqual(open.calls[1], ['gift', 'delivered', 3]);
  assert.equal(open.items[2].destructive, true); open.items[2].onPress(); assert.deepEqual(open.calls[2], ['confirm-remove', 'gift']);
  const reserved = actions('reserved'); reserved.items[1].onPress(); assert.deepEqual(reserved.calls[0], ['gift', 'open', 3]);
  assert.equal(actions('delivered').items.length, 2);
  assert.equal(actions('open', false).items.length, 0);
});
