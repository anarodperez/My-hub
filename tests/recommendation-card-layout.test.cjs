const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function card(category, grid) {
  let failed = null;
  const calls = [], exports = {};
  const components = new Proxy({}, { get: (_, name) => name });
  const mocks = {
    './web-motion': { webMotion: () => ({}) },
    react: { useState: () => [failed, next => { failed = next; }] },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { View: 'View', Pressable: 'Pressable' },
    'expo-router': { router: { push: route => calls.push(route) } },
    '@/features/hub/provider': { usePalette: () => ({}), useHub: () => ({ state: { preferences: { name: 'Ana' } }, repository: { accountId: 'me' } }) },
    '@/features/hub/model': require('../src/features/hub/model.ts'),
    '@/constants/hub-design': { hubType: {} },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/recommendation-card.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: name => mocks[name] || components });
  const all = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(all)];
  return { calls, render: () => all(exports.RecommendationCard({ item: { id: 'r', category, title: 'Title', opinion: 'Opinion', rating: 4, coverUrl: 'https://example.com/cover.jpg' }, feed: true, grid })) };
}

test('desktop feed gives books a full-width cover; mobile retains the compact portrait', () => {
  const desktop = card('book', true);
  let nodes = desktop.render();
  const cover = nodes.find(node => node.type === 'LoadingImage');
  assert.ok(nodes.some(node => node.type === 'RatingSummary'));
  assert.equal(cover.props.style.width, '100%');
  assert.equal(cover.props.contentFit, 'contain');
  nodes.find(node => node.type === 'Pressable').props.onPress();
  assert.equal(desktop.calls[0].params.id, 'r');
  cover.props.onError();
  nodes = desktop.render();
  assert.equal(nodes.some(node => node.type === 'LoadingImage'), false);
  assert.ok(nodes.some(node => node.type === 'CategoryIcon'));
  assert.equal(card('book', false).render().find(node => node.type === 'LoadingImage').props.style.width, 88);
});

test('places crop naturally and products remain fully visible on both feed layouts', () => {
  for (const grid of [false, true]) {
    assert.equal(card('place', grid).render().find(node => node.type === 'LoadingImage').props.contentFit, 'cover');
    assert.equal(card('product', grid).render().find(node => node.type === 'LoadingImage').props.contentFit, 'contain');
  }
});
