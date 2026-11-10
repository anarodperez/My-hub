const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readViewState, writeViewState, viewStateKey, subscribeViewState } = require('../src/features/hub/view-state.ts');

test('el estado de vistas se conserva por pantalla sin cruzar cuentas', () => {
 const a=viewStateKey('ana','wishlist.category'), b=viewStateKey('bea','wishlist.category');
 writeViewState(a,'book');
 assert.equal(readViewState(a,'all'),'book'); assert.equal(readViewState(b,'all'),'all');
 assert.equal(readViewState(viewStateKey('ana','home.category'),'all'),'all');
});
test('solo notifica cambios reales y permite desmontar la suscripcion', () => {
 const key=viewStateKey('test','calendar.date');let calls=0;
 const unsubscribe=subscribeViewState(key,()=>calls++);
 writeViewState(key,'2026-11-10');writeViewState(key,'2026-11-10');assert.equal(calls,1);
 unsubscribe();writeViewState(key,'2026-11-11');assert.equal(calls,1);
});
