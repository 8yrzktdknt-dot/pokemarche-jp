import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DAILY_DAYS, MAX_DAYS, addDay, displayedPrices } from './price-history.mjs';

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

test('90 derniers jours jour par jour, puis une semaine sur sept jusqu’à 3 ans', () => {
  const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
  let h = null;
  // 4 ans de relevés : le prix du jour n est n (la carte b n'a de prix que les 10 premiers jours).
  for (let n = 0; n < 4 * 365; n++) h = addDay(h, addDays('2026-01-01', n), n < 10 ? { a: n, b: n } : { a: n });
  assert.equal(h.p.a.length, DAILY_DAYS);
  assert.equal(h.p.a[DAILY_DAYS - 1], 4 * 365 - 1);
  assert.equal(h.from, addDays('2026-01-01', 4 * 365 - DAILY_DAYS));
  // Semaines : dernier prix de chaque semaine, 3 ans au plus en tout, sans trou avant les jours récents.
  const weeks = h.w.p.a;
  assert.ok(weeks.length * 7 + DAILY_DAYS <= MAX_DAYS + 7);
  assert.ok(weeks.every((v) => typeof v === 'number'));
  const lastWeekStart = addDays(h.w.from, (weeks.length - 1) * 7);
  assert.ok(lastWeekStart < h.from && addDays(lastWeekStart, 7) >= h.from);
  // La semaine n contient les jours w.from + 7n … + 6 : sa valeur est le dernier de ces jours.
  const firstDay = (Date.parse(`${h.w.from}T00:00:00Z`) - Date.parse('2026-01-01T00:00:00Z')) / 86400000;
  assert.equal(weeks[0], firstDay + 6);
  // b n'a plus de prix depuis plus de 3 ans : effacée.
  assert.equal(h.p.b, undefined);
  assert.equal(h.w.p.b, undefined);
});
