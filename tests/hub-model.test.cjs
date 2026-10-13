const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseAmountCents, isLocalDate, calendarDays, resolveTheme, decodeState, emptyState, toggleSaved, recommendationCategories, isWebLink, ratingFromPosition } = require('../src/features/hub/model.ts');

test('importes exactos en céntimos', () => {
  assert.equal(parseAmountCents('12,50'), 1250);
  assert.equal(parseAmountCents('12.50'), 1250);
  assert.equal(parseAmountCents('0'), 0);
  for (const value of ['', '-2', '1.234', 'Infinity', '2e3']) assert.equal(parseAmountCents(value), null);
});
test('fechas locales y cuadrícula de lunes a domingo', () => {
  assert.equal(isLocalDate('2028-02-29'), true);
  assert.equal(isLocalDate('2026-02-29'), false);
  assert.equal(isLocalDate('2026-13-01'), false);
  assert.equal(calendarDays(2026, 9).filter(Boolean).length, 31);
  assert.deepEqual(calendarDays(2026, 9).slice(0, 4), [null, null, null, '2026-10-01']);
});
test('tema y lectura segura', () => {
  assert.equal(resolveTheme('system', null), 'light');
  assert.equal(resolveTheme('system', 'dark'), 'dark');
  assert.equal(resolveTheme('light', 'dark'), 'light');
  assert.deepEqual(decodeState(null), emptyState);
  assert.throws(() => decodeState('{}'));
  assert.throws(() => decodeState(JSON.stringify({ ...emptyState, recommendations: [{}] })));
});
test('dos pulsaciones de guardado nunca duplican una recomendación', () => {
  const first = toggleSaved(emptyState, 'book-1');
  assert.equal(first.saved.length, 1);
  const second = toggleSaved(first, 'book-1');
  assert.equal(second.saved.length, 0);
  assert.equal(emptyState.saved.length, 0);
});
test('las portadas adjuntas y las antiguas se conservan al reabrir', () => {
  for (const coverUrl of ['file:///documents/my-hub-covers/book.jpg', 'data:image/jpeg;base64,dGVzdA==', 'https://example.com/cover.jpg', '']) {
    const state = { ...emptyState, recommendations: [{ id: 'book-1', title: 'Un libro', category: 'book', opinion: 'Mi opinión', rating: 5, coverUrl, createdAt: '2026-10-13T12:00:00Z' }] };
    assert.equal(decodeState(JSON.stringify(state)).recommendations[0].coverUrl, coverUrl);
  }
});
test('compras y sitios se guardan sin alterar recomendaciones anteriores', () => {
  assert.ok(recommendationCategories.some((category) => category.value === 'product'));
  assert.ok(recommendationCategories.some((category) => category.value === 'place'));
  const base = { id: '1', title: 'Un descubrimiento', opinion: 'Me encanta', rating: 5, coverUrl: '', createdAt: '2026-10-13T12:00:00Z' };
  const recommendations = [{ ...base, category: 'book' }, { ...base, id: '2', category: 'product', priceCents: 1299, link: 'https://example.com/product' }, { ...base, id: '3', category: 'place', location: 'Madrid', link: 'https://example.com/restaurant' }];
  assert.deepEqual(decodeState(JSON.stringify({ ...emptyState, recommendations })).recommendations, recommendations);
  assert.throws(() => decodeState(JSON.stringify({ ...emptyState, recommendations: [{ ...base, category: 'product', priceCents: -1 }] })));
  assert.throws(() => decodeState(JSON.stringify({ ...emptyState, recommendations: [{ ...base, category: 'place', link: 'javascript:alert(1)' }] })));
});
test('enlaces externos solo permiten HTTP y HTTPS', () => {
  assert.equal(isWebLink('https://example.com'), true);
  assert.equal(isWebLink('http://example.com/location'), true);
  for (const link of ['javascript:alert(1)', 'file:///private', 'no es un enlace', '']) assert.equal(isWebLink(link), false);
});
test('medias estrellas se seleccionan y conservan al guardar', () => {
  assert.equal(ratingFromPosition(168, 240), 3.5);
  assert.equal(ratingFromPosition(192, 240), 4);
  assert.equal(ratingFromPosition(0, 240), 0.5);
  assert.equal(ratingFromPosition(240, 240), 5);
  assert.equal(ratingFromPosition(-20, 240), 0.5);
  assert.equal(ratingFromPosition(300, 240), 5);
  assert.equal(ratingFromPosition(10, 0), 0.5);
  for (let x = 1; x <= 240; x++) assert.ok(ratingFromPosition(x, 240) >= ratingFromPosition(x - 1, 240));
  assert.equal(ratingFromPosition(120, 240), ratingFromPosition(240, 480));
  const withRating = (rating) => JSON.stringify({ ...emptyState, recommendations: [{ id: 'half', title: 'Libro', category: 'book', opinion: 'Opinión', rating, coverUrl: '', createdAt: '2026-10-13T12:00:00Z' }] });
  for (const rating of [0.5, 1, 1.5, 4.5, 5]) assert.equal(decodeState(withRating(rating)).recommendations[0].rating, rating);
  for (const rating of [0, -0.5, 2.25, 5.5]) assert.throws(() => decodeState(withRating(rating)));
});
test('wishlist conserva deseos y visibilidad sin exigir valoración', () => {
  const wish = { id: 'wish-1', title: 'Una vela', category: 'product', coverUrl: '', link: 'https://example.com/candle', completed: false };
  for (const wishlistVisibility of ['private', 'public']) {
    const state = { ...emptyState, wishes: [wish], wishlistVisibility };
    assert.deepEqual(decodeState(JSON.stringify(state)), state);
  }
  assert.deepEqual(decodeState(JSON.stringify(emptyState)), emptyState);
  assert.throws(() => decodeState(JSON.stringify({ ...emptyState, wishlistVisibility: 'everyone' })));
  assert.throws(() => decodeState(JSON.stringify({ ...emptyState, wishes: [{ ...wish, link: 'javascript:alert(1)' }] })));
});
