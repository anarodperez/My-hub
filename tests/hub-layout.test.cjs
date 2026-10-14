const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getHubLayout } = require('../src/features/hub/layout.ts');
test('navegación y columnas respetan el espacio útil y el texto ampliado', () => {
  assert.equal(getHubLayout(359, 1).wishColumns, 1);
  assert.equal(getHubLayout(390, 1).wishColumns, 2);
  assert.equal(getHubLayout(360, 1).wishColumns, 2);
  assert.equal(getHubLayout(359.9999, 1).wishColumns, 2);
  assert.equal(getHubLayout(899, 1).sidebar, false);
  assert.equal(getHubLayout(900, 1).sidebar, true);
  assert.equal(getHubLayout(1440, 1).feedColumns, 3);
  assert.equal(getHubLayout(1440, 1).wishColumns, 4);
  assert.equal(getHubLayout(1440, 1.4).wishColumns, 1);
  for (const width of [320, 359, 390, 899, 900, 1024, 1199, 1200, 1440, 2000]) {
    const layout = getHubLayout(width, 1);
    for (const count of [layout.feedColumns, layout.wishColumns]) {
      assert.ok(count >= 1);
      assert.ok((layout.contentWidth - (count - 1) * 16) / count >= (layout.sidebar ? 160 : 144));
    }
  }
});
