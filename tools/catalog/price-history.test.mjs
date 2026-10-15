import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDay, displayedPrices } from './price-history.mjs';

test('prix affichés : carte (7 jours, sinon période suivante) et variantes', () => {
  assert.deepEqual(displayedPrices({ id: 'a', cm: { id: 1, avg30: 2, trend: 3 }, v: [{ k: 'normal', p: 2 }, { k: 'reverse', p: 5, t: 'avg30' }, { k: 'pokeball' }] }), { a: 2, 'a#reverse': 5 });
  assert.deepEqual(displayedPrices({ id: 'b', price: { value: 0.24, currency: 'USD' } }), { b: 0.24 });
  assert.deepEqual(displayedPrices({ id: 'c' }), {});
});

test('un prix par jour, jours manquants à null, jour remplacé', () => {
  let h = addDay(null, '2026-10-14', { a: 1 });
  h = addDay(h, '2026-10-16', { a: 3, b: 2 });
  assert.deepEqual(h, { from: '2026-10-14', p: { a: [1, null, 3], b: [null, null, 2] } });
  h = addDay(h, '2026-10-16', { a: 4, b: 2 });
  assert.deepEqual(h.p.a, [1, null, 4]);
  // Reconstitution d'un jour plus ancien.
  h = addDay(h, '2026-10-13', { a: 0.5 });
  assert.equal(h.from, '2026-10-13');
  assert.deepEqual(h.p.a, [0.5, 1, null, 4]);
  assert.deepEqual(h.p.b, [null, null, null, 2]);
});
