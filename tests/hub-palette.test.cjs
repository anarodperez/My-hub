const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hubPalettes } = require('../src/constants/hub-palettes.ts');
const luminance = hex => {
  const rgb = hex.match(/[a-f\d]{2}/gi).map(channel => parseInt(channel, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
test('textos y estados mantienen contraste AA en claro y oscuro', () => {
  for (const [theme, p] of Object.entries(hubPalettes)) {
    for (const background of ['background', 'surface', 'soft', 'peach']) for (const foreground of ['text', 'muted']) {
      assert.ok(contrast(p[foreground], p[background]) >= 4.5, `${theme}: ${foreground}/${background}`);
    }
    for (const [foreground, background] of [['onAccent', 'accent'], ['accent', 'surface'], ['sageText', 'sage'], ['peachText', 'peach'], ['onAccent', 'sageText'], ['danger', 'surface']]) {
      assert.ok(contrast(p[foreground], p[background]) >= 4.5, `${theme}: ${foreground}/${background}`);
    }
    assert.ok(contrast(p.inputBorder, p.surface) >= 3, `${theme}: borde de campo`);
  }
});
